<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    private const FILTERS = ['entity', 'action', 'actor_type', 'source', 'from', 'to', 'q'];

    public function index(Request $request): Response
    {
        Gate::authorize('audit-logs.view');

        $orgId = (int) $request->user()->organization_id;
        $filters = collect(self::FILTERS)
            ->mapWithKeys(fn (string $key): array => [$key => trim((string) $request->query($key, '')) ?: null])
            ->all();
        $perPage = 50;

        $logs = AuditLog::query()
            ->where('organization_id', $orgId)
            ->filter($filters)
            ->with('user:id,name')
            ->latest('at')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $coachNames = ExternalCoach::withTrashed()
            ->whereIn('id', $logs->getCollection()->where('actor_type', 'external_coach')->pluck('actor_id'))
            ->pluck('name', 'id');

        $logs->getCollection()->transform(fn (AuditLog $log): array => [
            ...$log->only(['id', 'at', 'entity', 'entity_id', 'action', 'source', 'actor_type', 'ip_address', 'user_agent', 'url', 'http_method', 'request_id', 'diff']),
            'actor_name' => match ($log->actor_type) {
                'user' => $log->user?->name,
                'external_coach' => $coachNames[$log->actor_id] ?? null,
                default => null,
            },
        ]);

        $scope = AuditLog::query()->where('organization_id', $orgId);

        return Inertia::render('audit-logs/index', [
            'logs' => Inertia::scroll($logs),
            'filters' => $filters,
            'entities' => (clone $scope)->distinct()->orderBy('entity')->pluck('entity'),
            'actions' => (clone $scope)->distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}
