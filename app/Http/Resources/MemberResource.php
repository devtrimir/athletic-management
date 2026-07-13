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
            'full_name' => $this->full_name,
            'father_name' => $this->father_name,
            'rank' => $this->rank,
            'designation' => $this->designation,
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
            'other_notes' => $this->other_notes,
            'team_since' => $this->team_since?->toDateString(),
            'playable_sports' => $this->whenLoaded('playableSports', fn () => $this->playableSports
                ->map(fn ($sport) => [
                    'id' => $sport->id,
                    'name' => $sport->name,
                    'name' => $sport->name ?? $sport->name,
                    'role' => $sport->pivot?->role,
                    'position' => $sport->pivot?->position,
                    'sport_event' => $sport->pivot?->sport_event,
                    'weight' => $sport->pivot?->weight,
                    'notes' => $sport->pivot?->notes,
                ])
                ->values()
                ->all()),
            'home_district' => $this->whenLoaded('homeDistrict', fn () => [
                'id' => $this->homeDistrict->id,
                'name' => $this->homeDistrict->name,
            ]),
            'posting_district' => $this->whenLoaded('postingDistrict', fn () => $this->postingDistrict ? [
                'id' => $this->postingDistrict->id,
                'name' => $this->postingDistrict->name,
            ] : null),
            'current_unit' => $this->whenLoaded('currentUnit', fn () => [
                'id' => $this->currentUnit->id,
                'name' => $this->currentUnit->name,
            ]),
        ];
    }
}
