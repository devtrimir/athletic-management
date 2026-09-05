<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Coach;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CoachPreviewController extends Controller
{
    public function __invoke(Request $request, Coach $coach): JsonResponse
    {
        Gate::authorize('view', $coach);

        $coach->loadMissing([
            'certifications',
            'sports',
            'specialAchievements',
            'playingAchievements.sport:id,name',
            'assignmentHistory' => fn ($query) => $query
                ->with(['team', 'session'])
                ->orderByDesc('is_current')
                ->orderByDesc('assigned_at')
                ->orderByDesc('id'),
        ]);

        $assignments = $coach->assignmentHistory
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
            ->values();

        $certifications = $coach->certifications
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
            ->values();

        $sports = $coach->sports
            ->map(fn ($sport) => [
                'id' => $sport->id,
                'name' => $sport->name,
                'is_primary' => (bool) $sport->pivot?->is_primary,
                'level' => $sport->pivot?->level,
                'effective_from' => $sport->pivot?->effective_from?->toDateString(),
                'effective_to' => $sport->pivot?->effective_to?->toDateString(),
                'notes' => $sport->pivot?->notes,
            ])
            ->values();

        $specialAchievements = $coach->specialAchievements
            ->map(fn ($achievement) => [
                'id' => $achievement->id,
                'achievement_type' => $achievement->achievement_type,
                'title' => $achievement->title,
                'awarded_on' => $achievement->awarded_on?->toDateString(),
                'issuing_authority' => $achievement->issuing_authority,
                'place' => $achievement->place,
                'remarks' => $achievement->remarks,
            ])
            ->values();

        $member = $coach->member()->select(['id', 'member_code', 'full_name'])->first();

        if ($member !== null) {
            $memberTeamIds = TeamMember::query()
                ->where('member_id', $member->id)
                ->pluck('team_id')
                ->filter()
                ->map(static fn (int $teamId): int => $teamId)
                ->values()
                ->all();

            $playingAchievements = Achievement::whereHas('participation', function ($query) use ($member, $memberTeamIds): void {
                $query->where('member_id', $member->id);

                if ($memberTeamIds !== []) {
                    $query->orWhereIn('team_id', $memberTeamIds);
                }
            })
                ->with([
                    'participation.session:id,name',
                    'participation.event:id,tournament_id,name,event_type',
                    'participation.event.tournament:id,name,tier_id,date_from,date_to,venue',
                    'participation.event.tournament.tier:id,code,label_en,weight',
                ])
                ->orderByDesc('id')
                ->get()
                ->map(fn (Achievement $achievement): array => [
                    'id' => $achievement->id,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'remarks' => $achievement->remarks,
                    'session_name' => $achievement->participation->session->name,
                    'tournament_name' => $achievement->participation->event->tournament->name,
                    'tier_code' => $achievement->participation->event->tournament->tier?->code,
                    'tier_label' => $achievement->participation->event->tournament->tier?->label_en,
                    'date_from' => $achievement->participation->event->tournament->date_from?->toDateString(),
                    'date_to' => $achievement->participation->event->tournament->date_to?->toDateString(),
                    'venue' => $achievement->participation->event->tournament->venue,
                    'event_name' => $achievement->participation->event->name,
                    'event_kind' => ($achievement->participation->event->event_type ?? ($achievement->participation->team_id ? 'team' : 'individual')) === 'team' ? 'team' : 'individual',
                    'achieved_on' => $achievement->participation->event->tournament->date_from?->toDateString(),
                ])
                ->values()
                ->all();
        } else {
            $playingAchievements = $coach->playingAchievements
                ->map(fn ($achievement) => [
                    'id' => $achievement->id,
                    'title' => $achievement->title,
                    'period' => $achievement->period,
                    'level' => $achievement->level,
                    'competition_details' => $achievement->competition_details,
                    'event_date' => $achievement->event_date?->toDateString(),
                    'venue' => $achievement->venue,
                    'sport_id' => $achievement->sport_id,
                    'sport' => $achievement->sport?->name,
                    'event' => $achievement->event,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'achieved_on' => $achievement->achieved_on?->toDateString(),
                    'remarks' => $achievement->remarks,
                ])
                ->values()
                ->all();
        }

        return response()->json([
            'id' => $coach->id,
            'full_name' => $coach->full_name,
            'display_name' => $coach->display_name,
            'pno' => $coach->pno,
            'mobile' => $coach->mobile,
            'email' => $coach->email,
            'gender' => $coach->gender,
            'date_of_birth' => $coach->date_of_birth?->toDateString(),
            'coach_status' => $coach->coach_status,
            'team_activity_status' => $coach->hasActiveCurrentSessionTeamAssignment() ? 'active' : 'inactive',
            'bio' => $coach->bio,
            'address' => $coach->address,
            'photo_path' => $coach->photo_path,
            'profile_status_badge' => $coach->profile_status_badge,
            'certifications' => $certifications,
            'sports' => $sports,
            'special_achievements' => $specialAchievements,
            'playing_achievements' => $playingAchievements,
            'playing_achievements_source' => $member !== null ? 'member' : 'legacy',
            'linked_member' => $member ? [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
            ] : null,
            'assignment_history' => $assignments,
        ]);
    }
}
