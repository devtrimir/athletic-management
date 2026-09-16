<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Coach;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\Member;
use App\Models\MemberPromotion;
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
     * Check whether a MemberPromotion represents an actual rank promotion.
     */
    public function isMemberRankPromotion(MemberPromotion $memberPromotion): bool
    {
        if ($memberPromotion->promotion_date === null || empty($memberPromotion->to_rank)) {
            return false;
        }

        if ($memberPromotion->from_rank !== null && $memberPromotion->from_rank === $memberPromotion->to_rank) {
            return false;
        }

        return true;
    }

    /**
     * Check whether a CoachPromotion represents an actual rank promotion.
     */
    public function isCoachRankPromotion(CoachPromotion $coachPromotion): bool
    {
        if ($coachPromotion->promotion_date === null || empty($coachPromotion->to_rank)) {
            return false;
        }

        if ($coachPromotion->from_rank !== null && $coachPromotion->from_rank === $coachPromotion->to_rank) {
            return false;
        }

        return true;
    }

    /**
     * Synchronize a MemberPromotion to its corresponding CoachPromotion.
     * Only rank promotions are synchronized; cash rewards and tournament evidences do not cross over.
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
            return DB::transaction(function () use ($memberPromotion, $member, $coach): ?CoachPromotion {
                $coachPromotion = null;

                if ($memberPromotion->coach_promotion_id) {
                    $coachPromotion = CoachPromotion::withoutGlobalScopes()
                        ->where('coach_id', $coach->id)
                        ->find($memberPromotion->coach_promotion_id);
                }

                if (! $coachPromotion) {
                    $coachPromotion = CoachPromotion::withoutGlobalScopes()
                        ->where('member_promotion_id', $memberPromotion->id)
                        ->first();
                }

                // If not a rank promotion (e.g. cash reward only), do not mirror onto coach profile.
                if (! $this->isMemberRankPromotion($memberPromotion)) {
                    if ($coachPromotion) {
                        $coachPromotion->evidences()->delete();
                        $coachPromotion->delete();
                    }

                    if ($memberPromotion->coach_promotion_id !== null) {
                        $memberPromotion->updateQuietly(['coach_promotion_id' => null]);
                    }

                    $this->syncPromotionStates($member, $coach);

                    return null;
                }

                $data = [
                    'organization_id' => $coach->organization_id,
                    'coach_id' => $coach->id,
                    'member_promotion_id' => $memberPromotion->id,
                    'promotion_date' => $memberPromotion->promotion_date,
                    'from_rank' => $memberPromotion->from_rank,
                    'to_rank' => $memberPromotion->to_rank,
                    'cash_reward_amount' => null,
                    'cash_reward_date' => null,
                    'cash_reward_reference' => null,
                    'cash_reward_remarks' => null,
                    'reason' => $memberPromotion->reason,
                    'remarks' => $memberPromotion->remarks,
                    'recorded_by' => $memberPromotion->recorded_by,
                ];

                if ($coachPromotion) {
                    $coachPromotion->update($data);
                } else {
                    $coachPromotion = CoachPromotion::create([...$data, 'source' => 'synced']);
                }

                if ($memberPromotion->coach_promotion_id !== $coachPromotion->id) {
                    $memberPromotion->updateQuietly(['coach_promotion_id' => $coachPromotion->id]);
                }

                // Synced promotions on the coach side must not carry athlete evidences.
                $coachPromotion->evidences()->delete();
                $this->syncPromotionStates($member, $coach);

                return $coachPromotion;
            });
        } finally {
            $this->isSyncing = false;
        }
    }

    /**
     * Synchronize a CoachPromotion to its corresponding MemberPromotion.
     * Only rank promotions are synchronized; cash rewards and tournament evidences do not cross over.
     */
    public function syncFromCoach(CoachPromotion $coachPromotion): ?MemberPromotion
    {
        if ($this->isSyncing) {
            return null;
        }

        $coach = $coachPromotion->coach ?? Coach::withoutGlobalScopes()->find($coachPromotion->coach_id);
        if (! $coach || ! $coach->member_id) {
            return null;
        }

        $member = $coach->member ?? Member::withoutGlobalScopes()->find($coach->member_id);
        if (! $member) {
            return null;
        }

        $this->isSyncing = true;

        try {
            return DB::transaction(function () use ($coachPromotion, $member, $coach): ?MemberPromotion {
                $memberPromotion = null;

                if ($coachPromotion->member_promotion_id) {
                    $memberPromotion = MemberPromotion::withoutGlobalScopes()
                        ->where('member_id', $member->id)
                        ->find($coachPromotion->member_promotion_id);
                }

                if (! $memberPromotion) {
                    $memberPromotion = MemberPromotion::withoutGlobalScopes()
                        ->where('coach_promotion_id', $coachPromotion->id)
                        ->first();
                }

                // If not a rank promotion (e.g. coach reward only), do not mirror onto member profile.
                if (! $this->isCoachRankPromotion($coachPromotion)) {
                    if ($memberPromotion) {
                        $memberPromotion->evidences()->delete();
                        $memberPromotion->delete();
                    }

                    if ($coachPromotion->member_promotion_id !== null) {
                        $coachPromotion->updateQuietly(['member_promotion_id' => null]);
                    }

                    $this->syncPromotionStates($member, $coach);

                    return null;
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
                    'cash_reward_amount' => null,
                    'cash_reward_date' => null,
                    'cash_reward_reference' => null,
                    'cash_reward_remarks' => null,
                    'reason' => $coachPromotion->reason,
                    'remarks' => $coachPromotion->remarks,
                    'recorded_by' => $coachPromotion->recorded_by,
                ];

                if ($memberPromotion) {
                    $memberPromotion->update($data);
                } else {
                    $memberPromotion = MemberPromotion::create([...$data, 'source' => 'synced']);
                }

                if ($coachPromotion->member_promotion_id !== $memberPromotion->id) {
                    $coachPromotion->updateQuietly(['member_promotion_id' => $memberPromotion->id]);
                }

                // Synced promotions on the member side must not carry coach evidences.
                $memberPromotion->evidences()->delete();
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
                $coachPromotion = CoachPromotion::withoutGlobalScopes()->find($memberPromotion->coach_promotion_id);
            }
            if (! $coachPromotion) {
                $coachPromotion = CoachPromotion::withoutGlobalScopes()->where('member_promotion_id', $memberPromotion->id)->first();
            }

            if ($coachPromotion) {
                $coach = $coachPromotion->coach ?? Coach::withoutGlobalScopes()->find($coachPromotion->coach_id);
                $member = $memberPromotion->member ?? ($coach?->member_id ? Member::withoutGlobalScopes()->find($coach->member_id) : null);

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
                $memberPromotion = MemberPromotion::withoutGlobalScopes()->find($coachPromotion->member_promotion_id);
            }
            if (! $memberPromotion) {
                $memberPromotion = MemberPromotion::withoutGlobalScopes()->where('coach_promotion_id', $coachPromotion->id)->first();
            }

            if ($memberPromotion) {
                $member = $memberPromotion->member ?? Member::withoutGlobalScopes()->find($memberPromotion->member_id);
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
        // Purge obsolete synced promotions that had cash rewards or are not rank promotions
        CoachPromotion::withoutGlobalScopes()
            ->where('coach_id', $coach->id)
            ->where('source', 'synced')
            ->where(function ($q): void {
                $q->whereNotNull('cash_reward_amount')
                    ->orWhereNull('promotion_date')
                    ->orWhereNull('to_rank')
                    ->orWhereColumn('from_rank', '=', 'to_rank');
            })
            ->each(function (CoachPromotion $p): void {
                $p->evidences()->delete();
                $p->delete();
            });

        MemberPromotion::withoutGlobalScopes()
            ->where('member_id', $member->id)
            ->where('source', 'synced')
            ->where(function ($q): void {
                $q->whereNotNull('cash_reward_amount')
                    ->orWhereNull('promotion_date')
                    ->orWhereNull('to_rank')
                    ->orWhereColumn('from_rank', '=', 'to_rank');
            })
            ->each(function (MemberPromotion $p): void {
                $p->evidences()->delete();
                $p->delete();
            });

        // Ensure no synced promotions carry evidences
        CoachPromotionEvidence::withoutGlobalScopes()
            ->whereHas('coachPromotion', fn ($q) => $q->withoutGlobalScopes()->where('coach_id', $coach->id)->where('source', 'synced'))
            ->delete();

        PromotionEvidence::withoutGlobalScopes()
            ->whereHas('memberPromotion', fn ($q) => $q->withoutGlobalScopes()->where('member_id', $member->id)->where('source', 'synced'))
            ->delete();

        $memberPromotions = MemberPromotion::withoutGlobalScopes()->where('member_id', $member->id)->where('source', 'native')->get();
        $coachPromotions = CoachPromotion::withoutGlobalScopes()->where('coach_id', $coach->id)->where('source', 'native')->get();

        // 1. Sync member promotions to coach
        foreach ($memberPromotions as $memberPromo) {
            $this->syncFromMember($memberPromo);
        }

        // 2. Sync coach promotions to member
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
            ->whereNotNull('promotion_date')
            ->where(function ($q): void {
                $q->whereNull('from_rank')
                    ->orWhereColumn('from_rank', '!=', 'to_rank');
            })
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        if (! $latestRankPromotion) {
            $latestCoachRankPromo = CoachPromotion::query()
                ->where('coach_id', $coach->id)
                ->whereNotNull('to_rank')
                ->whereNotNull('promotion_date')
                ->where(function ($q): void {
                    $q->whereNull('from_rank')
                        ->orWhereColumn('from_rank', '!=', 'to_rank');
                })
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
            ->whereNotNull('to_rank')
            ->where(function ($q): void {
                $q->whereNull('from_rank')
                    ->orWhereColumn('from_rank', '!=', 'to_rank');
            })
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        if (! $latestDatePromotion && ! $latestRankPromotion) {
            $latestCoachDatePromo = CoachPromotion::query()
                ->where('coach_id', $coach->id)
                ->whereNotNull('promotion_date')
                ->whereNotNull('to_rank')
                ->where(function ($q): void {
                    $q->whereNull('from_rank')
                        ->orWhereColumn('from_rank', '!=', 'to_rank');
                })
                ->orderByDesc('promotion_date')
                ->orderByDesc('id')
                ->first();

            $promotionDate = $latestCoachDatePromo?->promotion_date;
        } else {
            $promotionDate = $latestDatePromotion?->promotion_date;
        }

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
}
