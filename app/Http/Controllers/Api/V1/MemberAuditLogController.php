<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Services\AuditLogBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MemberAuditLogController extends Controller
{
    public function __invoke(Request $request, Member $member, AuditLogBuilder $auditLogBuilder): JsonResponse
    {
        Gate::authorize('view', $member);

        $perPage = max(10, min((int) $request->query('per_page', 25), 100));
        $page = max(1, (int) $request->query('page', 1));

        $logs = collect($auditLogBuilder->forMember($member));
        $total = $logs->count();
        $items = $logs->forPage($page, $perPage)->values()->all();

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
}
