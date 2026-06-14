<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Coach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CoachExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'pno' => 'PNO',
        'full_name' => 'Name',
        'mobile' => 'Mobile',
        'nis_certified' => 'NIS Certified',
        'linked_member' => 'Linked Member Code',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Coach::class);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        if (! empty($ids)) {
            $coaches = Coach::whereIn('id', array_map('intval', $ids))
                ->with('member:id,member_code')
                ->orderBy('full_name')
                ->get();
        } else {
            $coaches = QueryBuilder::for(Coach::class)
                ->allowedFilters([
                    AllowedFilter::exact('nis_certified'),
                    AllowedFilter::callback('has_member', function ($query, $value): void {
                        if ($value === 'true' || $value === true) {
                            $query->whereNotNull('member_id');
                        } else {
                            $query->whereNull('member_id');
                        }
                    }),
                    AllowedFilter::partial('q', 'full_name'),
                ])
                ->allowedSorts(['full_name', 'pno', 'created_at'])
                ->defaultSort('full_name')
                ->with('member:id,member_code')
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $coaches->map(function (Coach $coach) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'nis_certified' => $coach->nis_certified ? 'Yes' : 'No',
                    'linked_member' => $coach->member?->member_code,
                    default => $coach->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Coaches'),
            'coaches-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function show(Coach $coach, Request $request): BinaryFileResponse
    {
        Gate::authorize('view', $coach);

        $coach->load('member:id,member_code');

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));
        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = collect([[]])->map(function () use ($coach, $validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'nis_certified' => $coach->nis_certified ? 'Yes' : 'No',
                    'linked_member' => $coach->member?->member_code,
                    default => $coach->{$col},
                };
            }

            return $row;
        });

        $filename = 'coach-'.($coach->pno ?? $coach->id).'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new ReportExport($rows, array_values($headings), $coach->full_name),
            $filename,
        );
    }
}
