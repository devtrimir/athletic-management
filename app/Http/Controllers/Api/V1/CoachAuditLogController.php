<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coach;
use App\Services\AuditLogBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachAuditLogController extends Controller
{
    public function __invoke(Request $request, Coach $coach, AuditLogBuilder $auditLogBuilder): JsonResponse
    {
        Gate::authorize('viewAuditLog', $coach);

        return response()->json($auditLogBuilder->forCoach($coach));
    }
}
