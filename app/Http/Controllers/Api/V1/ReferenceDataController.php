<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\DistrictResource;
use App\Http\Resources\Api\V1\SportResource;
use App\Http\Resources\Api\V1\TournamentTierResource;
use App\Http\Resources\Api\V1\UnitResource;
use App\Models\District;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReferenceDataController extends Controller
{
    public function tournamentTiers(): AnonymousResourceCollection
    {
        $tiers = TournamentTier::orderByDesc('weight')->get();

        return TournamentTierResource::collection($tiers);
    }

    public function sports(Request $request): AnonymousResourceCollection
    {
        $sports = Sport::where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->get();

        return SportResource::collection($sports);
    }

    public function units(Request $request): AnonymousResourceCollection
    {
        $units = Unit::where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->get();

        return UnitResource::collection($units);
    }

    public function districts(): AnonymousResourceCollection
    {
        $districts = District::orderBy('name')->get();

        return DistrictResource::collection($districts);
    }
}
