<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\ReportFilterRequest;
use App\Models\User;
use App\Services\Reports\UnitHeadcountReport;
use Illuminate\Http\JsonResponse;

class UnitHeadcountController
{
    public function __construct(private readonly UnitHeadcountReport $report) {}

    public function __invoke(ReportFilterRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $filters = $request->filters();
        $data = $this->report->run($user->organization_id, $filters);

        return response()->json(['data' => $data, 'filters' => $filters]);
    }
}
