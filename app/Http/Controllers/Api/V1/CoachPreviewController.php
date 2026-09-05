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

        $coach->loadMissing([
            'certifications',
            'sports',
            'specialAchievements',
            'playingAchievements',
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

        $playingAchievements = $coach->playingAchievements
            ->map(fn ($achievement) => [
                'id' => $achievement->id,
                'title' => $achievement->title,
                'period' => $achievement->period,
                'level' => $achievement->level,
                'competition_details' => $achievement->competition_details,
                'event_date' => $achievement->event_date?->toDateString(),
                'venue' => $achievement->venue,
                'sport_discipline' => $achievement->sport_discipline,
                'event' => $achievement->event,
                'medal_type' => $achievement->medal_type,
                'position' => $achievement->position,
                'achieved_on' => $achievement->achieved_on?->toDateString(),
                'remarks' => $achievement->remarks,
            ])
            ->values();

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
            'assignment_history' => $assignments,
        ]);
    }
}
