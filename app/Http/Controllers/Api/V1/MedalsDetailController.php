<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Services\Reports\MedalsDetailReport;
use Illuminate\Http\JsonResponse;

class MedalsDetailController extends Controller
{
    public function __construct(private readonly MedalsDetailReport $report) {}

    public function __invoke(ReportFilterRequest $request): JsonResponse
    {
        $orgId = (int) $request->user()->organization_id;
        $filters = $request->filters();
        $perPage = min($request->integer('per_page', 25), 100);

        $paginator = $this->report->run($orgId, $filters, $perPage);
        $medalCounts = $this->report->countByType($orgId, $filters);

        $data = $paginator->toArray();
        $data['medal_counts'] = $medalCounts;

        return response()->json($data);
    }
}
