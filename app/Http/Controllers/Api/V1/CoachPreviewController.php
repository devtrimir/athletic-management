<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coach;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachPreviewController extends Controller
{
    public function __invoke(Request $request, Coach $coach): JsonResponse
    {
        Gate::authorize('view', $coach);

        $coach->loadMissing(['member.currentUnit']);

        return response()->json([
            'id' => $coach->id,
            'full_name_hi' => $coach->full_name_hi,
            'full_name_en' => $coach->full_name_en,
            'pno' => $coach->pno,
            'mobile' => $coach->mobile,
            'nis_certified' => $coach->nis_certified,
            'member' => $coach->member ? [
                'id' => $coach->member->id,
                'member_code' => $coach->member->member_code,
                'full_name_hi' => $coach->member->full_name_hi,
                'rank' => $coach->member->rank,
                'current_status' => $coach->member->current_status,
                'current_unit' => $coach->member->currentUnit ? ['name_hi' => $coach->member->currentUnit->name_hi] : null,
            ] : null,
        ]);
    }
}
