<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\ResignationDismissalRequest;
use App\Models\User;
use App\Services\Reports\ResignationDismissalLogReport;
use Illuminate\Http\JsonResponse;

class ResignationDismissalController
{
    public function __construct(private readonly ResignationDismissalLogReport $report) {}

    public function __invoke(ResignationDismissalRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $filters = $request->allFilters();

        $data = $this->report->run(
            $user->organization_id,
            $filters,
            $filters['from_date'] ?? null,
            $filters['to_date'] ?? null,
            $filters['status'] ?? null,
        );

        return response()->json(['data' => $data, 'filters' => $filters]);
    }
}
