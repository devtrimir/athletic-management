<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Back-fills audit_log entries and member_status_history records for data
 * that was seeded without the Eloquent AuditObserver (all bulk-insert seeders
 * bypass the observer for performance).
 *
 * Creates:
 *   — Member "created"        — one per member, back-dated near joining_date
 *   — Member "updated"        — rank promotions for ~35% of promotable members
 *   — MemberStatusHistory     — one record + audit entry per non-ACTIVE member
 *   — TeamMember "created"    — one per team-member assignment
 *   — Participation "created" — one per participation record
 *   — Achievement "created"   — one per achievement record
 *
 * Run order: after TeamMemberSeeder and ParticipationSeeder.
 */
class AuditLogSeeder extends Seeder
{
    private const CHUNK = 500;

    /**
     * UP Police rank promotion ladder.
     * Key = rank before promotion, value = rank after.
     *
     * @var array<string, string>
     */
    private const RANK_LADDER = [
        'Constable' => 'Head Constable',
        'Head Constable' => 'SI',
        'SI' => 'Inspector',
    ];

    /**
     * Human-readable Hindi reasons for each non-ACTIVE status.
     *
     * @var array<string, list<string>>
     */
    private const STATUS_REASONS = [
        'RESIGNED' => ['खेल दल से त्यागपत्र', 'स्वेच्छा से पद से मुक्त'],
        'DISMISSED' => ['अनुशासनहीनता के कारण बर्खास्त', 'विभागीय जाँच उपरांत बर्खास्त'],
        'DECEASED' => ['सेवाकाल में मृत्यु'],
        'RETIRED' => ['सेवानिवृत्ति पर पद से मुक्त', 'अधिवर्षिता पर सेवानिवृत्त'],
    ];

    public function run(): void
    {
        $org = Organization::firstOrFail();
        $orgId = $org->id;
        $adminUserId = User::where('organization_id', $orgId)->value('id');

        $this->seedMemberLogs($orgId, $adminUserId);
        $this->seedStatusHistoryLogs($orgId, $adminUserId);
        $this->seedTeamMemberLogs($orgId, $adminUserId);
        $this->seedParticipationLogs($orgId, $adminUserId);
        $this->seedAchievementLogs($orgId, $adminUserId);
    }

    // ─── Member: created + updated (rank promotion) ────────────────────────────

    private function seedMemberLogs(int $orgId, ?int $userId): void
    {
        $members = DB::table('members')
            ->where('organization_id', $orgId)
            ->select([
                'id', 'pno', 'full_name', 'rank', 'gender',
                'player_category', 'player_level', 'current_status',
                'joining_date', 'current_unit_id', 'home_district_id', 'posting_district_id', 'sport_id',
                'created_at',
            ])
            ->get();

        $createdRows = [];
        $updatedRows = [];
        $now = now();

        foreach ($members as $member) {
            // Back-date the 'created' audit entry near the member's joining_date.
            $joinedAt = $member->joining_date
                ? Carbon::parse($member->joining_date)->addDays(random_int(1, 14))
                : Carbon::parse($member->created_at)->subDays(random_int(30, 365));

            if ($joinedAt->isAfter($now)) {
                $joinedAt = $now->clone()->subDays(random_int(1, 30));
            }

            $diff = array_filter([
                'pno' => $member->pno,
                'full_name' => $member->full_name,
                'rank' => $member->rank,
                'gender' => $member->gender,
                'player_category' => $member->player_category,
                'player_level' => $member->player_level,
                'current_status' => $member->current_status,
                'joining_date' => $member->joining_date,
                'current_unit_id' => $member->current_unit_id,
                'home_district_id' => $member->home_district_id,
                'posting_district_id' => $member->posting_district_id,
                'sport_id' => $member->sport_id,
            ], static fn ($v) => $v !== null);

            $createdRows[] = [
                'user_id' => $userId,
                'organization_id' => $orgId,
                'entity' => 'Member',
                'entity_id' => $member->id,
                'action' => 'created',
                'diff' => json_encode($diff),
                'at' => $joinedAt->toDateTimeString(),
            ];

            // Rank-promotion audit entry for ~35% of members whose rank has a predecessor.
            $prevRank = array_search($member->rank, self::RANK_LADDER, true);
            if ($prevRank !== false && random_int(1, 100) <= 35) {
                $promotedAt = $joinedAt->clone()->addDays(random_int(365 * 2, 365 * 6));
                if ($promotedAt->isAfter($now)) {
                    $promotedAt = $now->clone()->subDays(random_int(30, 180));
                }

                $updatedRows[] = [
                    'user_id' => $userId,
                    'organization_id' => $orgId,
                    'entity' => 'Member',
                    'entity_id' => $member->id,
                    'action' => 'updated',
                    'diff' => json_encode([
                        'old' => ['rank' => $prevRank, 'promotion_date' => null],
                        'new' => ['rank' => $member->rank, 'promotion_date' => $promotedAt->toDateString()],
                    ]),
                    'at' => $promotedAt->toDateTimeString(),
                ];
            }
        }

        foreach (array_chunk($createdRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        foreach (array_chunk($updatedRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        $this->command->info(sprintf(
            'AuditLogSeeder: %d member-created, %d member-updated entries.',
            count($createdRows),
            count($updatedRows),
        ));
    }

    // ─── MemberStatusHistory for non-ACTIVE members ────────────────────────────

    private function seedStatusHistoryLogs(int $orgId, ?int $userId): void
    {
        $nonActive = DB::table('members')
            ->where('organization_id', $orgId)
            ->whereIn('current_status', ['RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'])
            ->select(['id', 'current_status', 'joining_date', 'created_at'])
            ->get();

        if ($nonActive->isEmpty()) {
            $this->command->info('AuditLogSeeder: no non-active members — skipping status history.');

            return;
        }

        $historyRows = [];
        $auditRows = [];
        $now = now();

        foreach ($nonActive as $member) {
            $base = $member->joining_date
                ? Carbon::parse($member->joining_date)
                : Carbon::parse($member->created_at);

            // Status becomes effective 1–10 years after joining.
            $effectiveOn = $base->clone()->addDays(random_int(365, 365 * 10));
            if ($effectiveOn->isAfter($now)) {
                $effectiveOn = $now->clone()->subDays(random_int(30, 365));
            }

            $reasons = self::STATUS_REASONS[$member->current_status] ?? ['—'];
            $reasonHi = $reasons[array_rand($reasons)];

            $historyRows[] = [
                'member_id' => $member->id,
                'status' => $member->current_status,
                'effective_on' => $effectiveOn->toDateString(),
                'reason' => $reasonHi,
                'recorded_by' => $userId,
                'created_at' => $effectiveOn->toDateTimeString(),
                'updated_at' => $effectiveOn->toDateTimeString(),
            ];
        }

        // Insert history records and collect their IDs.
        foreach (array_chunk($historyRows, self::CHUNK) as $chunk) {
            DB::table('member_status_history')->insertOrIgnore($chunk);
        }

        // Re-fetch to get auto-increment IDs for audit entries.
        $inserted = DB::table('member_status_history')
            ->whereIn('member_id', $nonActive->pluck('id'))
            ->select(['id', 'member_id', 'status', 'effective_on', 'reason', 'recorded_by', 'created_at'])
            ->get()
            ->keyBy('member_id');

        foreach ($inserted as $row) {
            $auditRows[] = [
                'user_id' => $userId,
                'organization_id' => $orgId,
                'entity' => 'MemberStatusHistory',
                'entity_id' => $row->id,
                'action' => 'created',
                'diff' => json_encode(array_filter([
                    'member_id' => $row->member_id,
                    'status' => $row->status,
                    'effective_on' => $row->effective_on,
                    'reason' => $row->reason,
                    'recorded_by' => $row->recorded_by,
                ], static fn ($v) => $v !== null)),
                'at' => $row->created_at,
            ];
        }

        foreach (array_chunk($auditRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        $this->command->info(sprintf(
            'AuditLogSeeder: %d status-history records + audit entries.',
            count($historyRows),
        ));
    }

    // ─── TeamMember: created ───────────────────────────────────────────────────

    private function seedTeamMemberLogs(int $orgId, ?int $userId): void
    {
        $rows = DB::table('team_members as tm')
            ->join('teams as t', 'tm.team_id', '=', 't.id')
            ->where('t.organization_id', $orgId)
            ->select([
                'tm.id', 'tm.team_id', 'tm.member_id', 'tm.session_id',
                'tm.role', 'tm.joined_on', 'tm.created_at',
            ])
            ->get();

        $auditRows = [];
        $sessionStart = Carbon::create(2026, 1, 1);

        foreach ($rows as $row) {
            $at = $row->joined_on
                ? Carbon::parse($row->joined_on)->addDays(random_int(0, 3))
                : $sessionStart->clone()->addDays(random_int(0, 60));

            $auditRows[] = [
                'user_id' => $userId,
                'organization_id' => $orgId,
                'entity' => 'TeamMember',
                'entity_id' => $row->id,
                'action' => 'created',
                'diff' => json_encode(array_filter([
                    'member_id' => $row->member_id,
                    'team_id' => $row->team_id,
                    'session_id' => $row->session_id,
                    'role' => $row->role,
                    'joined_on' => $row->joined_on,
                ], static fn ($v) => $v !== null)),
                'at' => $at->toDateTimeString(),
            ];
        }

        foreach (array_chunk($auditRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        $this->command->info(sprintf('AuditLogSeeder: %d team-member entries.', count($auditRows)));
    }

    // ─── Participation: created ────────────────────────────────────────────────

    private function seedParticipationLogs(int $orgId, ?int $userId): void
    {
        $rows = DB::table('participations as p')
            ->join('events as e', 'p.event_id', '=', 'e.id')
            ->join('tournaments as t', 'e.tournament_id', '=', 't.id')
            ->where('t.organization_id', $orgId)
            ->select([
                'p.id', 'p.event_id', 'p.member_id', 'p.session_id',
                'p.team_id', 'p.position', 't.date_from',
            ])
            ->get();

        $auditRows = [];
        $fallback = Carbon::create(2026, 3, 1);

        foreach ($rows as $row) {
            // Registration typically happens 1–7 days before the event starts.
            $at = $row->date_from
                ? Carbon::parse($row->date_from)->subDays(random_int(1, 7))
                : $fallback->clone()->addDays(random_int(0, 30));

            $auditRows[] = [
                'user_id' => $userId,
                'organization_id' => $orgId,
                'entity' => 'Participation',
                'entity_id' => $row->id,
                'action' => 'created',
                'diff' => json_encode(array_filter([
                    'member_id' => $row->member_id,
                    'event_id' => $row->event_id,
                    'session_id' => $row->session_id,
                    'team_id' => $row->team_id,
                    'position' => $row->position,
                ], static fn ($v) => $v !== null)),
                'at' => $at->toDateTimeString(),
            ];
        }

        foreach (array_chunk($auditRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        $this->command->info(sprintf('AuditLogSeeder: %d participation entries.', count($auditRows)));
    }

    // ─── Achievement: created ──────────────────────────────────────────────────

    private function seedAchievementLogs(int $orgId, ?int $userId): void
    {
        $rows = DB::table('achievements as a')
            ->join('participations as p', 'a.participation_id', '=', 'p.id')
            ->join('events as e', 'p.event_id', '=', 'e.id')
            ->join('tournaments as t', 'e.tournament_id', '=', 't.id')
            ->where('t.organization_id', $orgId)
            ->select([
                'a.id', 'a.participation_id', 'a.medal_type', 'a.position', 't.date_from',
            ])
            ->get();

        $auditRows = [];
        $fallback = Carbon::create(2026, 3, 1);

        foreach ($rows as $row) {
            // Medal is recorded on or just after the competition day.
            $at = $row->date_from
                ? Carbon::parse($row->date_from)->addDays(random_int(0, 2))
                : $fallback->clone()->addDays(random_int(0, 30));

            $auditRows[] = [
                'user_id' => $userId,
                'organization_id' => $orgId,
                'entity' => 'Achievement',
                'entity_id' => $row->id,
                'action' => 'created',
                'diff' => json_encode(array_filter([
                    'participation_id' => $row->participation_id,
                    'medal_type' => $row->medal_type,
                    'position' => $row->position,
                ], static fn ($v) => $v !== null)),
                'at' => $at->toDateTimeString(),
            ];
        }

        foreach (array_chunk($auditRows, self::CHUNK) as $chunk) {
            DB::table('audit_logs')->insert($chunk);
        }

        $this->command->info(sprintf('AuditLogSeeder: %d achievement entries.', count($auditRows)));
    }
}
