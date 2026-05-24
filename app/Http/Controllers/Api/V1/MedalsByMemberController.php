<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MedalsByMemberRequest;
use App\Services\Reports\MedalsByMemberReport;
use Illuminate\Http\JsonResponse;

class MedalsByMemberController extends Controller
{
    public function __construct(private readonly MedalsByMemberReport $report) {}

    public function __invoke(MedalsByMemberRequest $request): JsonResponse
    {
        $orgId = (int) $request->user()->organization_id;
        $filters = $request->filters();
        $limit = $request->integer('limit', 50);

        return response()->json([
            'data' => $this->report->run($orgId, $filters, $limit),
            'filters' => $filters,
            'limit' => $limit,
        ]);
    }
}
