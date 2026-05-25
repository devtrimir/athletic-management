<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Inertia prop shape for Member. Consumed by Show/Edit pages.
 *
 * @mixin Member
 */
class MemberResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'member_code' => $this->member_code,
            'pno' => $this->pno,
            'full_name_hi' => $this->full_name_hi,
            'full_name_en' => $this->full_name_en,
            'father_name_hi' => $this->father_name_hi,
            'rank' => $this->rank,
            'gender' => $this->gender,
            'dob' => $this->dob?->toDateString(),
            'joining_date' => $this->joining_date?->toDateString(),
            'mobile' => $this->mobile,
            'player_category' => $this->player_category,
            'player_level' => $this->player_level,
            'current_status' => $this->current_status,
            'source_refs' => $this->source_refs,
            // P2B profile fields
            'photo_path' => $this->photo_path,
            'blood_group' => $this->blood_group,
            'caste' => $this->caste,
            'promotion_date' => $this->promotion_date?->toDateString(),
            'appointment' => $this->appointment,
            'home_address' => $this->home_address,
            'recruitment_type' => $this->recruitment_type,
            'sport_event' => $this->sport_event,
            'other_notes' => $this->other_notes,
            'team_since' => $this->team_since?->toDateString(),
            'home_district' => $this->whenLoaded('homeDistrict', fn () => [
                'id' => $this->homeDistrict->id,
                'name_hi' => $this->homeDistrict->name_hi,
            ]),
            'current_unit' => $this->whenLoaded('currentUnit', fn () => [
                'id' => $this->currentUnit->id,
                'name_hi' => $this->currentUnit->name_hi,
            ]),
        ];
    }
}
