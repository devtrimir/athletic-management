<?php

declare(strict_types=1);

namespace App\Services\Coaches;

use App\Models\Coach;
use App\Models\Member;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CoachDeletionService
{
    /**
     * Summarize a coach's live connections, used to decide whether an
     * archived coach can be safely purged.
     *
     * @return array{
     *     has_connections: bool,
     *     summary: array{
     *         active_assignments_count: int,
     *         sports_count: int,
     *         promotions_count: int,
     *         playing_achievements_count: int
     *     }
     * }
     */
    public function getImpact(Coach $coach): array
    {
        $activeAssignmentsCount = $coach->currentAssignments()->count();
        $sportsCount = $coach->sports()->count();
        $promotionsCount = $coach->promotions()->count();
        $playingAchievementsCount = $coach->playingAchievements()->count();

        $hasConnections = $activeAssignmentsCount > 0
            || $sportsCount > 0
            || $promotionsCount > 0
            || $playingAchievementsCount > 0;

        return [
            'has_connections' => $hasConnections,
            'summary' => [
                'active_assignments_count' => $activeAssignmentsCount,
                'sports_count' => $sportsCount,
                'promotions_count' => $promotionsCount,
                'playing_achievements_count' => $playingAchievementsCount,
            ],
        ];
    }

    /**
     * Inspect PNO availability within an organization, checking active
     * conflicts and archived coaches. Mirrors
     * App\Services\Members\MemberDeletionService::checkPno().
     *
     * @return array<string, mixed>
     */
    public function checkPno(string $pno, int $organizationId, ?int $ignoreCoachId = null, ?int $ignoreMemberId = null): array
    {
        $pno = trim($pno);
        if ($pno === '') {
            return ['status' => 'empty'];
        }

        $activeMember = Member::query()
            ->where('organization_id', $organizationId)
            ->where('pno', $pno)
            ->when($ignoreMemberId !== null, fn ($query) => $query->where('id', '!=', $ignoreMemberId))
            ->first(['id', 'full_name', 'member_code', 'rank']);

        if ($activeMember !== null) {
            return [
                'status' => 'active_conflict',
                'entity' => 'member',
                'name' => $activeMember->full_name,
                'rank' => $activeMember->rank,
                'code' => $activeMember->member_code,
                'id' => $activeMember->id,
            ];
        }

        $activeCoach = Coach::query()
            ->where('organization_id', $organizationId)
            ->where('pno', $pno)
            ->when($ignoreCoachId !== null, fn ($query) => $query->where('id', '!=', $ignoreCoachId))
            ->first(['id', 'full_name']);

        if ($activeCoach !== null) {
            return [
                'status' => 'active_conflict',
                'entity' => 'coach',
                'name' => $activeCoach->full_name,
                'id' => $activeCoach->id,
            ];
        }

        $activeIncharge = DB::table('incharges')
            ->where('organization_id', $organizationId)
            ->where('pno', $pno)
            ->whereNull('deleted_at')
            ->first(['id', 'full_name']);

        if ($activeIncharge !== null) {
            return [
                'status' => 'active_conflict',
                'entity' => 'incharge',
                'name' => $activeIncharge->full_name,
                'id' => $activeIncharge->id,
            ];
        }

        $deletedCoach = Coach::onlyTrashed()
            ->where('organization_id', $organizationId)
            ->where('pno', $pno)
            ->first();

        if ($deletedCoach !== null) {
            $impact = $this->getImpact($deletedCoach);

            return [
                'status' => 'deleted_coach',
                'coach' => [
                    'id' => $deletedCoach->id,
                    'full_name' => $deletedCoach->full_name,
                    'pno' => $deletedCoach->pno,
                    'deleted_at' => $deletedCoach->deleted_at?->format('Y-m-d'),
                    'can_purge' => ! $impact['has_connections'],
                    'summary' => $impact['summary'],
                ],
            ];
        }

        return ['status' => 'available'];
    }

    /**
     * Restore a soft-deleted coach and reactivate their status.
     *
     * @throws ValidationException
     */
    public function restore(Coach $coach, ?User $actor = null): void
    {
        if (! empty($coach->pno)) {
            $activeCollision = Coach::query()
                ->where('organization_id', $coach->organization_id)
                ->where('pno', $coach->pno)
                ->where('id', '!=', $coach->id)
                ->exists();

            if ($activeCollision) {
                throw ValidationException::withMessages([
                    'pno' => __('Cannot restore coach: PNO :pno is currently in use by an active coach.', [
                        'pno' => $coach->pno,
                    ]),
                ]);
            }
        }

        DB::transaction(function () use ($coach, $actor): void {
            $coach->restore();
            $coach->update(['coach_status' => 'ACTIVE']);

            $coach->statusHistory()->create([
                'status' => 'ACTIVE',
                'effective_on' => now()->toDateString(),
                'reason' => 'Coach restored from archive.',
                'recorded_by' => $actor?->id,
            ]);
        });
    }
}
