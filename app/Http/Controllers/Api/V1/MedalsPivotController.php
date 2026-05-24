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

        return response()->json([
            'data' => $this->report->run($orgId, $filters),
            'filters' => $filters,
        ]);
    }
}
