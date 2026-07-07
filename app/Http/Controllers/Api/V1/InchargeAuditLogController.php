<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Incharge;
use App\Services\AuditLogBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InchargeAuditLogController extends Controller
{
    public function __invoke(Request $request, Incharge $incharge, AuditLogBuilder $auditLogBuilder): JsonResponse
    {
        Gate::authorize('view', $incharge);

        $perPage = max(10, min((int) $request->query('per_page', 25), 100));
        $page = max(1, (int) $request->query('page', 1));
        $period = $request->query('period');
        $year = $request->query('year');
        $search = trim((string) $request->query('search', ''));
        $action = trim((string) $request->query('action', ''));
        $subject = trim((string) $request->query('subject', ''));

        $from = $this->parseDate($request->query('from'));
        $to = $this->parseDate($request->query('to'), true);

        if ($from === null && is_string($period)) {
            $from = match ($period) {
                'month' => CarbonImmutable::today()->subMonth(),
                'quarter' => CarbonImmutable::today()->subMonths(3),
                'half_year' => CarbonImmutable::today()->subMonths(6),
                'year' => CarbonImmutable::today()->subYear(),
                default => null,
            };
        }

        $logs = collect($auditLogBuilder->forIncharge($incharge));

        if ($from !== null) {
            $logs = $logs->filter(
                fn (array $entry): bool => CarbonImmutable::parse(
                    (string) $entry['at'],
                )->greaterThanOrEqualTo($from),
            );
        }

        if ($to !== null) {
            $logs = $logs->filter(
                fn (array $entry): bool => CarbonImmutable::parse(
                    (string) $entry['at'],
                )->lessThanOrEqualTo($to),
            );
        }

        if ($action !== '') {
            $logs = $logs->filter(
                fn (array $entry): bool => $entry['action'] === $action,
            );
        }

        if ($subject !== '') {
            $logs = $logs->filter(
                fn (array $entry): bool => $entry['subject'] === $subject,
            );
        }

        if ($year !== null && $year !== '') {
            $logs = $logs->filter(
                fn (array $entry): bool => CarbonImmutable::parse((string) $entry['at'])->year === (int) $year,
            );
        }

        if ($search !== '') {
            $needle = mb_strtolower($search);

            $logs = $logs->filter(function (array $entry) use ($needle): bool {
                if (str_contains(mb_strtolower((string) ($entry['by'] ?? '')), $needle)) {
                    return true;
                }

                if (str_contains(mb_strtolower((string) $entry['subject']), $needle)) {
                    return true;
                }

                foreach ($entry['changes'] as $change) {
                    if (str_contains(mb_strtolower((string) ($change['field'] ?? '')), $needle)) {
                        return true;
                    }

                    if (str_contains(mb_strtolower((string) ($change['old'] ?? '')), $needle)) {
                        return true;
                    }

                    if (str_contains(mb_strtolower((string) ($change['new'] ?? '')), $needle)) {
                        return true;
                    }
                }

                return false;
            });
        }

        $all = $logs->values();
        $total = $all->count();
        $items = $all->forPage($page, $perPage)->values()->all();

        return response()->json([
            'data' => $items,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'has_more' => $page * $perPage < $total,
            ],
        ]);
    }

    private function parseDate(null|string $value, bool $endOfDay = false): ?CarbonImmutable
    {
        if ($value === null || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('Y-m-d', $value);

        if ($date === false) {
            return null;
        }

        return $endOfDay ? $date->endOfDay() : $date->startOfDay();
    }
}
