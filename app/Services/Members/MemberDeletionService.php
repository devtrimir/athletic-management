<?php

declare(strict_types=1);

namespace App\Services\Members;

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MemberDeletionService
{
    /**
     * Inspect all system references and return an impact summary before deletion.
     *
     * @return array{
     *     can_delete: bool,
     *     has_connections: bool,
     *     summary: array{
     *         active_teams_count: int,
     *         past_teams_count: int,
     *         linked_coach: array{id: int, name: string, pno: string|null}|null,
     *         participations_count: int,
     *         medals: array{total: int, gold: int, silver: int, bronze: int},
     *         active_external_coaching_count: int,
     *         special_achievements_count: int,
     *         promotions_count: int
     *     },
     *     active_teams: list<array{id: int|null, name: string|null, sport: string|null, session: string|null, role: string|null}>,
     *     active_external_coaching: list<array{id: int, coach_name: string|null, sport_name: string|null}>
     * }
     */
    public function getImpact(Member $member): array
    {
        $activeTeams = $member->teamMemberships()
            ->whereNull('left_on')
            ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
            ->get()
            ->map(fn (TeamMember $tm): array => [
                'id' => $tm->team?->id,
                'name' => $tm->team?->name,
                'sport' => $tm->team?->sport?->name,
                'session' => $tm->session?->name,
                'role' => $tm->role,
            ])
            ->values()
            ->all();

        $pastTeamsCount = $member->teamMemberships()->whereNotNull('left_on')->count();

        $linkedCoach = Coach::where('member_id', $member->id)->first(['id', 'full_name', 'pno']);

        $participationsCount = $member->participations()->count();

        $medalsStats = Achievement::query()
            ->whereIn('participation_id', $member->participations()->select('id'))
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN medal_type = 'GOLD' THEN 1 ELSE 0 END) as gold,
                SUM(CASE WHEN medal_type = 'SILVER' THEN 1 ELSE 0 END) as silver,
                SUM(CASE WHEN medal_type = 'BRONZE' THEN 1 ELSE 0 END) as bronze
            ")
            ->first();

        $activeExternalCoaching = $member->externalCoachingAssignments()
            ->where(function ($query): void {
                $query->whereIn('status', ['active', 'approved'])
                    ->where(function ($q): void {
                        $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
                    });
            })
            ->with(['externalCoach:id,full_name', 'sport:id,name'])
            ->get()
            ->map(fn ($assignment): array => [
                'id' => (int) $assignment->id,
                'coach_name' => $assignment->externalCoach?->full_name,
                'sport_name' => $assignment->sport?->name,
            ])
            ->values()
            ->all();

        $specialAchievementsCount = $member->specialAchievements()->count();
        $promotionsCount = MemberPromotion::where('member_id', $member->id)->count();

        $hasConnections = count($activeTeams) > 0
            || $linkedCoach !== null
            || count($activeExternalCoaching) > 0
            || $participationsCount > 0
            || $specialAchievementsCount > 0
            || $promotionsCount > 0;

        return [
            'can_delete' => true,
            'has_connections' => $hasConnections,
            'summary' => [
                'active_teams_count' => count($activeTeams),
                'past_teams_count' => $pastTeamsCount,
                'linked_coach' => $linkedCoach ? [
                    'id' => (int) $linkedCoach->id,
                    'name' => (string) $linkedCoach->full_name,
                    'pno' => $linkedCoach->pno ? (string) $linkedCoach->pno : null,
                ] : null,
                'participations_count' => $participationsCount,
                'medals' => [
                    'total' => (int) ($medalsStats->total ?? 0),
                    'gold' => (int) ($medalsStats->gold ?? 0),
                    'silver' => (int) ($medalsStats->silver ?? 0),
                    'bronze' => (int) ($medalsStats->bronze ?? 0),
                ],
                'active_external_coaching_count' => count($activeExternalCoaching),
                'special_achievements_count' => $specialAchievementsCount,
                'promotions_count' => $promotionsCount,
            ],
            'active_teams' => $activeTeams,
            'active_external_coaching' => $activeExternalCoaching,
        ];
    }

    /**
     * Atomically disengage active relations and soft-delete the member.
     */
    public function delete(Member $member, ?User $actor = null): void
    {
        DB::transaction(function () use ($member, $actor): void {
            $today = now()->toDateString();

            // 1. Mark active team roster memberships as departed today
            $member->teamMemberships()
                ->whereNull('left_on')
                ->update(['left_on' => $today]);

            // 2. Unlink any Coach record linked to this member
            Coach::where('member_id', $member->id)->update(['member_id' => null]);

            // 3. Conclude / cancel any active external coaching assignments
            $member->externalCoachingAssignments()
                ->whereIn('status', ['active', 'approved'])
                ->where(function ($query) use ($today): void {
                    $query->whereNull('end_date')->orWhere('end_date', '>=', $today);
                })
                ->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => 'Member archived/deleted',
                    'end_date' => $today,
                ]);

            // 4. Update member status to INACTIVE and record in status history if not already
            if ($member->current_status !== 'INACTIVE') {
                $member->update(['current_status' => 'INACTIVE']);

                $member->statusHistory()->create([
                    'status' => 'INACTIVE',
                    'effective_on' => $today,
                    'reason' => 'Member archived and removed from active rosters.',
                    'recorded_by' => $actor?->id,
                ]);
            }

            // 5. Soft-delete the member record (AuditObserver will record 'deleted' event)
            $member->delete();
        });
    }
}
