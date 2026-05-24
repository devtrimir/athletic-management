<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\NewJoinersRequest;
use App\Models\User;
use App\Services\Reports\NewJoinersReport;
use Illuminate\Http\JsonResponse;

class NewJoinersController
{
    public function __construct(private readonly NewJoinersReport $report) {}

    public function __invoke(NewJoinersRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $filters = $request->allFilters();
        $data = $this->report->run($user->organization_id, $filters);

        return response()->json(['data' => $data, 'filters' => $filters]);
    }
}
