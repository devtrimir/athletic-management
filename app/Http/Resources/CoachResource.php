<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Coach;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Inertia prop shape for Coach.
 *
 * @mixin Coach
 */
class CoachResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'display_name' => $this->display_name,
            'designation' => $this->designation,
            'blood_group' => $this->blood_group,
            'email' => $this->email,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'coach_status' => $this->coach_status,
            'bio' => $this->bio,
            'address' => $this->address,
            'photo_path' => $this->photo_path,
            'pno' => $this->pno,
            'mobile' => $this->mobile,
            'nis_certified' => $this->nis_certified,
            'district_id' => $this->district_id,
            'unit_id' => $this->unit_id,
            'district' => $this->whenLoaded('district', fn () => [
                'id' => $this->district->id,
                'name' => $this->district->name,
            ]),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'name' => $this->unit->name,
            ]),
            'nis_master_id' => $this->nis_master_id,
            'tier_master_id' => $this->tier_master_id,
            'rank_master_id' => $this->rank_master_id,
            'designation_master_id' => $this->designation_master_id,
            'profile_status_badge' => $this->profile_status_badge,
            'aliases' => $this->whenLoaded('aliases', fn () => $this->aliases
                ->map(fn ($alias) => [
                    'id' => $alias->id,
                    'alias' => $alias->alias,
                    'source' => $alias->source,
                ])
                ->values()),
            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory
                ->map(fn ($history) => [
                    'id' => $history->id,
                    'status' => $history->status,
                    'effective_on' => $history->effective_on->toDateString(),
                    'reason' => $history->reason,
                    'recorded_by_name' => $history->recorder?->name,
                ])
                ->values()),
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
                    'coach_sport_id' => $sport->pivot?->id,
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
            'promotions' => $this->whenLoaded('promotions', fn () => $this->promotions
                ->map(fn ($promotion) => [
                    'id' => $promotion->id,
                    'promotion_date' => $promotion->promotion_date?->toDateString(),
                    'from_rank' => $promotion->from_rank,
                    'to_rank' => $promotion->to_rank,
                    'cash_reward_amount' => $promotion->cash_reward_amount,
                    'cash_reward_date' => $promotion->cash_reward_date?->toDateString(),
                    'cash_reward_reference' => $promotion->cash_reward_reference,
                    'cash_reward_remarks' => $promotion->cash_reward_remarks,
                    'reason' => $promotion->reason,
                    'remarks' => $promotion->remarks,
                    'recorded_by_name' => $promotion->recorder?->name,
                    'evidences' => $promotion->relationLoaded('evidences')
                        ? $promotion->evidences->map(fn ($evidence) => [
                            'id' => $evidence->id,
                            'session_id' => $evidence->session_id,
                            'tournament_id' => $evidence->tournament_id,
                            'event_id' => $evidence->event_id,
                            'team_id' => $evidence->team_id,
                            'achievement_id' => $evidence->achievement_id,
                            'summary' => collect([
                                $evidence->session?->name,
                                $evidence->tournament?->name,
                                $evidence->event?->name,
                                $evidence->team?->name,
                            ])->filter()->join(' · '),
                            'session' => $evidence->session ? [
                                'id' => $evidence->session->id,
                                'name' => $evidence->session->name,
                            ] : null,
                            'tournament' => $evidence->tournament ? [
                                'id' => $evidence->tournament->id,
                                'name' => $evidence->tournament->name,
                                'tier_code' => $evidence->tournament->tier?->code,
                                'date_from' => $evidence->tournament->date_from?->toDateString(),
                                'date_to' => $evidence->tournament->date_to?->toDateString(),
                                'venue' => $evidence->tournament->venue,
                            ] : null,
                            'event' => $evidence->event ? [
                                'id' => $evidence->event->id,
                                'name' => $evidence->event->name,
                                'gender_class' => $evidence->event->gender_class,
                                'discipline' => $evidence->event->discipline,
                                'weight_category' => $evidence->event->weight_category,
                            ] : null,
                            'team' => $evidence->team ? [
                                'id' => $evidence->team->id,
                                'name' => $evidence->team->name,
                            ] : null,
                        ])->values()
                        : [],
                ])
                ->values()),
            'assignment_history' => $this->whenLoaded('assignmentHistory', fn () => $this->assignmentHistory
                ->map(fn ($assignment) => [
                    'id' => $assignment->id,
                    'role' => $assignment->role,
                    'is_current' => (bool) $assignment->is_current,
                    'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
                    'removed_at' => $assignment->removed_at?->toDateTimeString(),
                    'notes' => $assignment->notes,
                    'team' => $assignment->team ? [
                        'id' => $assignment->team->id,
                        'name' => $assignment->team->name,
                    ] : null,
                    'sport' => $assignment->team && $assignment->team->sport ? [
                        'id' => $assignment->team->sport->id,
                        'name' => $assignment->team->sport->name,
                    ] : null,
                    'session' => $assignment->session ? [
                        'id' => $assignment->session->id,
                        'name' => $assignment->session->name,
                    ] : null,
                ])
                ->values()),
        ];
    }
}
