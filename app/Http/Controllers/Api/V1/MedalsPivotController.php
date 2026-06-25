<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Http\JsonResponse;

class MedalsPivotController extends Controller
{
    public function __construct(private readonly MedalTallyReport $report) {}

    public function __invoke(ReportFilterRequest $request): JsonResponse
    {
        $orgId = (int) $request->user()->organization_id;
        $filters = $request->filters();
        $groupBy = $request->string('group_by')->toString();

        return response()->json([
            'data' => $groupBy === 'team'
                ? $this->report->runTeams($orgId, $filters)
                : $this->report->run($orgId, $filters),
            'filters' => $filters,
            'group_by' => $groupBy === 'team' ? 'team' : 'tier',
        ]);
    }
}
