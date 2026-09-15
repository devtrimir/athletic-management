<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Rank;
use Illuminate\Support\Facades\DB;

class PromotionSyncService
{
    /**
     * Flag to prevent recursion when syncing between member and coach promotions.
     */
    private bool $isSyncing = false;

    /**
     * Synchronize a MemberPromotion to its corresponding CoachPromotion.
     */
    public function syncFromMember(MemberPromotion $memberPromotion): ?CoachPromotion
    {
        if ($this->isSyncing) {
            return null;
        }

        $member = $memberPromotion->member ?? Member::find($memberPromotion->member_id);
        if (! $member) {
            return null;
        }

        $coach = $member->coach ?? Coach::where('member_id', $member->id)->first();
        if (! $coach) {
            return null;
        }

        $this->isSyncing = true;

        try {
            return DB::transaction(function () use ($memberPromotion, $member, $coach): CoachPromotion {
                $coachPromotion = null;

                if ($memberPromotion->coach_promotion_id) {
                    $coachPromotion = CoachPromotion::where('coach_id', $coach->id)
                        ->find($memberPromotion->coach_promotion_id);
                }

                if (! $coachPromotion) {
                    $coachPromotion = CoachPromotion::where('member_promotion_id', $memberPromotion->id)->first();
                }

                $data = [
                    'organization_id' => $coach->organization_id,
                    'coach_id' => $coach->id,
                    'member_promotion_id' => $memberPromotion->id,
                    'promotion_date' => $memberPromotion->promotion_date,
                    'from_rank' => $memberPromotion->from_rank,
                    'to_rank' => $memberPromotion->to_rank,
                    'cash_reward_amount' => $memberPromotion->cash_reward_amount,
                    'cash_reward_date' => $memberPromotion->cash_reward_date,
                    'cash_reward_reference' => $memberPromotion->cash_reward_reference,
                    'cash_reward_remarks' => $memberPromotion->cash_reward_remarks,
                    'reason' => $memberPromotion->reason,
                    'remarks' => $memberPromotion->remarks,
                    'recorded_by' => $memberPromotion->recorded_by,
                ];

                if ($coachPromotion) {
                    $coachPromotion->update($data);
                } else {
                    $coachPromotion = CoachPromotion::create($data);
                }

                if ($memberPromotion->coach_promotion_id !== $coachPromotion->id) {
                    $memberPromotion->updateQuietly(['coach_promotion_id' => $coachPromotion->id]);
                }

                $this->syncEvidencesToCoach($memberPromotion, $coachPromotion);
                $this->syncPromotionStates($member, $coach);

                return $coachPromotion;
            });
        } finally {
            $this->isSyncing = false;
        }
    }

    /**
     * Synchronize a CoachPromotion to its corresponding MemberPromotion.
     */
    public function syncFromCoach(CoachPromotion $coachPromotion): ?MemberPromotion
    {
        if ($this->isSyncing) {
            return null;
        }

        $coach = $coachPromotion->coach ?? Coach::find($coachPromotion->coach_id);
        if (! $coach || ! $coach->member_id) {
            return null;
        }

        $member = $coach->member ?? Member::find($coach->member_id);
        if (! $member) {
            return null;
        }

        $this->isSyncing = true;

        try {
            return DB::transaction(function () use ($coachPromotion, $member, $coach): MemberPromotion {
                $memberPromotion = null;

                if ($coachPromotion->member_promotion_id) {
                    $memberPromotion = MemberPromotion::where('member_id', $member->id)
                        ->find($coachPromotion->member_promotion_id);
                }

                if (! $memberPromotion) {
                    $memberPromotion = MemberPromotion::where('coach_promotion_id', $coachPromotion->id)->first();
                }

                // In member_promotions, to_rank is non-nullable string.
                $toRank = $coachPromotion->to_rank
                    ?: ($coachPromotion->from_rank ?: ($member->rank ?: ''));

                $fromRank = $coachPromotion->from_rank ?: $member->rank;

                $data = [
                    'organization_id' => $member->organization_id,
                    'member_id' => $member->id,
                    'coach_promotion_id' => $coachPromotion->id,
                    'promotion_date' => $coachPromotion->promotion_date,
                    'from_rank' => $fromRank,
                    'to_rank' => $toRank,
                    'cash_reward_amount' => $coachPromotion->cash_reward_amount,
                    'cash_reward_date' => $coachPromotion->cash_reward_date,
                    'cash_reward_reference' => $coachPromotion->cash_reward_reference,
                    'cash_reward_remarks' => $coachPromotion->cash_reward_remarks,
                    'reason' => $coachPromotion->reason,
                    'remarks' => $coachPromotion->remarks,
                    'recorded_by' => $coachPromotion->recorded_by,
                ];

                if ($memberPromotion) {
                    $memberPromotion->update($data);
                } else {
                    $memberPromotion = MemberPromotion::create($data);
                }

                if ($coachPromotion->member_promotion_id !== $memberPromotion->id) {
                    $coachPromotion->updateQuietly(['member_promotion_id' => $memberPromotion->id]);
                }

                $this->syncEvidencesToMember($coachPromotion, $memberPromotion, $member);
                $this->syncPromotionStates($member, $coach);

                return $memberPromotion;
            });
        } finally {
            $this->isSyncing = false;
        }
    }

    /**
     * Delete the linked CoachPromotion when a MemberPromotion is deleted.
     */
    public function deleteForMember(MemberPromotion $memberPromotion): void
    {
        if ($this->isSyncing) {
            return;
        }

        $this->isSyncing = true;

        try {
            $coachPromotion = null;
            if ($memberPromotion->coach_promotion_id) {
                $coachPromotion = CoachPromotion::find($memberPromotion->coach_promotion_id);
            }
            if (! $coachPromotion) {
                $coachPromotion = CoachPromotion::where('member_promotion_id', $memberPromotion->id)->first();
            }

            if ($coachPromotion) {
                $coach = $coachPromotion->coach;
                $member = $memberPromotion->member ?? ($coach?->member_id ? Member::find($coach->member_id) : null);

                $coachPromotion->evidences()->delete();
                $coachPromotion->delete();

                if ($member && $coach) {
                    $this->syncPromotionStates($member, $coach);
                }
            }
        } finally {
            $this->isSyncing = false;
        }
    }

    /**
     * Delete the linked MemberPromotion when a CoachPromotion is deleted.
     */
    public function deleteForCoach(CoachPromotion $coachPromotion): void
    {
        if ($this->isSyncing) {
            return;
        }

        $this->isSyncing = true;

        try {
            $memberPromotion = null;
            if ($coachPromotion->member_promotion_id) {
                $memberPromotion = MemberPromotion::find($coachPromotion->member_promotion_id);
            }
            if (! $memberPromotion) {
                $memberPromotion = MemberPromotion::where('coach_promotion_id', $coachPromotion->id)->first();
            }

            if ($memberPromotion) {
                $member = $memberPromotion->member;
                $coach = $coachPromotion->coach ?? ($member?->coach ?? null);

                $memberPromotion->evidences()->delete();
                $memberPromotion->delete();

                if ($member && $coach) {
                    $this->syncPromotionStates($member, $coach);
                }
            }
        } finally {
            $this->isSyncing = false;
        }
    }

    /**
     * Sync all promotions between a linked Member and Coach.
     */
    public function syncLinkedProfiles(Member $member, Coach $coach): void
    {
        $memberPromotions = MemberPromotion::where('member_id', $member->id)->with('evidences')->get();
        $coachPromotions = CoachPromotion::where('coach_id', $coach->id)->with('evidences')->get();

        // 1. Sync member promotions to coach
        foreach ($memberPromotions as $memberPromo) {
            $this->syncFromMember($memberPromo);
        }

        // 2. Sync any coach promotions that weren't in member promotions
        foreach ($coachPromotions as $coachPromo) {
            $this->syncFromCoach($coachPromo);
        }

        // 3. Ensure both member and coach ranks/dates match
        $this->syncPromotionStates($member, $coach);
    }

    /**
     * Synchronize rank and latest promotion date across both Member and Coach.
     */
    public function syncPromotionStates(Member $member, Coach $coach): void
    {
        $latestRankPromotion = MemberPromotion::query()
            ->where('member_id', $member->id)
            ->whereNotNull('to_rank')
            ->where(function ($q): void {
                $q->whereNull('from_rank')
                    ->orWhereColumn('from_rank', '!=', 'to_rank');
            })
            ->orderByRaw('promotion_date IS NULL')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        if (! $latestRankPromotion) {
            $latestCoachRankPromo = CoachPromotion::query()
                ->where('coach_id', $coach->id)
                ->whereNotNull('to_rank')
                ->where(function ($q): void {
                    $q->whereNull('from_rank')
                        ->orWhereColumn('from_rank', '!=', 'to_rank');
                })
                ->orderByRaw('promotion_date IS NULL')
                ->orderByDesc('promotion_date')
                ->orderByDesc('id')
                ->first();

            $rankValue = $latestCoachRankPromo?->to_rank;
        } else {
            $rankValue = $latestRankPromotion->to_rank;
        }

        $latestDatePromotion = MemberPromotion::query()
            ->where('member_id', $member->id)
            ->whereNotNull('promotion_date')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        $promotionDate = $latestDatePromotion?->promotion_date;

        $targetRankCode = $rankValue ?: $member->initial_rank ?: $member->rank;

        if ($targetRankCode) {
            $rankModel = Rank::query()
                ->where('code', $targetRankCode)
                ->orWhere('name', $targetRankCode)
                ->first();

            $resolvedCode = $rankModel?->code ?? $targetRankCode;

            $member->update([
                'rank' => $resolvedCode,
                'promotion_date' => $promotionDate,
            ]);

            if ($rankModel) {
                $coach->update(['rank_master_id' => $rankModel->id]);
            }
        } else {
            $member->update([
                'promotion_date' => $promotionDate,
            ]);
        }
    }

    /**
     * Sync evidences from MemberPromotion to CoachPromotion.
     */
    private function syncEvidencesToCoach(MemberPromotion $memberPromotion, CoachPromotion $coachPromotion): void
    {
        $coachPromotion->evidences()->delete();

        $memberEvidences = $memberPromotion->evidences()->get();
        if ($memberEvidences->isEmpty()) {
            return;
        }

        $createdKeys = [];

        foreach ($memberEvidences as $evidence) {
            $resolvedType = match ($evidence->evidencable_type) {
                'achievement', Achievement::class => 'achievement',
                'participation', Participation::class => 'participation',
                default => null,
            };

            if ($resolvedType === 'achievement') {
                $achievement = Achievement::with(['participation.event', 'participation.team'])->find($evidence->evidencable_id);
                if ($achievement && $achievement->participation) {
                    $p = $achievement->participation;
                    $sessionId = (int) $p->session_id;
                    $tournamentId = (int) ($p->event?->tournament_id ?? 0);
                    $eventId = $p->event_id ? (int) $p->event_id : null;
                    $teamId = $p->team_id ? (int) $p->team_id : null;
                    $achievementId = (int) $achievement->id;

                    $key = "{$sessionId}:{$tournamentId}:{$eventId}:{$teamId}:{$achievementId}";
                    if ($tournamentId > 0 && ! isset($createdKeys[$key])) {
                        CoachPromotionEvidence::create([
                            'organization_id' => $coachPromotion->organization_id,
                            'coach_promotion_id' => $coachPromotion->id,
                            'session_id' => $sessionId,
                            'tournament_id' => $tournamentId,
                            'event_id' => $eventId,
                            'team_id' => $teamId,
                            'achievement_id' => $achievementId,
                        ]);
                        $createdKeys[$key] = true;
                    }
                }
            } elseif ($resolvedType === 'participation') {
                $participation = Participation::with(['event', 'team', 'achievement'])->find($evidence->evidencable_id);
                if ($participation) {
                    $sessionId = (int) $participation->session_id;
                    $tournamentId = (int) ($participation->event?->tournament_id ?? 0);
                    $eventId = $participation->event_id ? (int) $participation->event_id : null;
                    $teamId = $participation->team_id ? (int) $participation->team_id : null;
                    $achievementId = $participation->achievement?->id ? (int) $participation->achievement->id : null;

                    $key = "{$sessionId}:{$tournamentId}:{$eventId}:{$teamId}:{$achievementId}";
                    if ($tournamentId > 0 && ! isset($createdKeys[$key])) {
                        CoachPromotionEvidence::create([
                            'organization_id' => $coachPromotion->organization_id,
                            'coach_promotion_id' => $coachPromotion->id,
                            'session_id' => $sessionId,
                            'tournament_id' => $tournamentId,
                            'event_id' => $eventId,
                            'team_id' => $teamId,
                            'achievement_id' => $achievementId,
                        ]);
                        $createdKeys[$key] = true;
                    }
                }
            }
        }
    }

    /**
     * Sync evidences from CoachPromotion to MemberPromotion.
     */
    private function syncEvidencesToMember(CoachPromotion $coachPromotion, MemberPromotion $memberPromotion, Member $member): void
    {
        $memberPromotion->evidences()->delete();

        $coachEvidences = $coachPromotion->evidences()->get();
        if ($coachEvidences->isEmpty()) {
            return;
        }

        $createdTypes = [];

        foreach ($coachEvidences as $evidence) {
            if ($evidence->achievement_id) {
                $key = "achievement:{$evidence->achievement_id}";
                if (! isset($createdTypes[$key])) {
                    PromotionEvidence::create([
                        'organization_id' => $memberPromotion->organization_id,
                        'member_promotion_id' => $memberPromotion->id,
                        'evidencable_type' => 'achievement',
                        'evidencable_id' => $evidence->achievement_id,
                    ]);
                    $createdTypes[$key] = true;
                }
            } elseif ($evidence->event_id) {
                $participation = Participation::forMember($member)
                    ->where('event_id', $evidence->event_id)
                    ->first();

                if ($participation) {
                    $key = "participation:{$participation->id}";
                    if (! isset($createdTypes[$key])) {
                        PromotionEvidence::create([
                            'organization_id' => $memberPromotion->organization_id,
                            'member_promotion_id' => $memberPromotion->id,
                            'evidencable_type' => 'participation',
                            'evidencable_id' => $participation->id,
                        ]);
                        $createdTypes[$key] = true;
                    }
                }
            } elseif ($evidence->tournament_id) {
                $participation = Participation::forMember($member)
                    ->where('session_id', $evidence->session_id)
                    ->whereHas('event', fn ($q) => $q->where('tournament_id', $evidence->tournament_id))
                    ->first();

                if ($participation) {
                    $key = "participation:{$participation->id}";
                    if (! isset($createdTypes[$key])) {
                        PromotionEvidence::create([
                            'organization_id' => $memberPromotion->organization_id,
                            'member_promotion_id' => $memberPromotion->id,
                            'evidencable_type' => 'participation',
                            'evidencable_id' => $participation->id,
                        ]);
                        $createdTypes[$key] = true;
                    }
                }
            }
        }
    }
}
