<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Coach;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Frozen coach search-hit contract.
 * Do NOT add or remove fields without updating all pickers.
 *
 * @mixin Coach
 */
class CoachSearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'pno' => $this->pno,
            'mobile' => $this->mobile,
            'blood_group' => $this->blood_group,
            'display_name' => $this->display_name,
            'designation' => $this->designation,
            'email' => $this->email,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'coach_status' => $this->coach_status,
            'bio' => $this->bio,
            'address' => $this->address,
            'nis_certified' => (bool) $this->nis_certified,
            'district_id' => $this->district_id,
            'unit_id' => $this->unit_id,
            'profile_status_badge' => $this->profile_status_badge,
            'member' => $this->whenLoaded('member', fn () => [
                'id' => $this->member?->id,
                'member_code' => $this->member?->member_code,
            ]),
            'certifications' => $this->whenLoaded('certifications', fn () => $this->certifications
                ->map(fn ($cert) => [
                    'id' => $cert->id,
                    'name' => $cert->name,
                    'certificate_type' => $cert->certificate_type,
                    'issuer' => $cert->issuer,
                    'issued_at' => $cert->issued_at?->toDateString(),
                    'expired_at' => $cert->expired_at?->toDateString(),
                    'attachment_path' => $cert->attachment_path,
                    'metadata' => $cert->metadata,
                ])
                ->values()),
            'sports' => $this->whenLoaded('sports', fn () => $this->sports
                ->map(fn ($sport) => [
                    'id' => $sport->id,
                    'name' => $sport->name,
                    'is_primary' => (bool) $sport->pivot?->is_primary,
                    'level_master_id' => $sport->pivot?->level_master_id,
                    'level' => $sport->pivot?->level,
                    'sport_event' => $sport->pivot?->sport_event,
                    'effective_from' => $sport->pivot?->effective_from?->toDateString(),
                    'effective_to' => $sport->pivot?->effective_to?->toDateString(),
                    'notes' => $sport->pivot?->notes,
                ])
                ->values()),
            'assignment_history' => $this->whenLoaded('assignmentHistory', fn () => $this->assignmentHistory
                ->map(fn ($assignment) => [
                    'id' => $assignment->id,
                    'role' => $assignment->role,
                    'team_name' => $assignment->team?->name,
                    'session_name' => $assignment->session?->name,
                    'is_current' => (bool) $assignment->is_current,
                    'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
                    'removed_at' => $assignment->removed_at?->toDateTimeString(),
                    'notes' => $assignment->notes,
                ])
                ->values()),
        ];
    }
}
