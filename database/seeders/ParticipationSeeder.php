<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\SportSession;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds participation and achievement records for every tournament event in
 * the current sport session.
 *
 * For each event 3–8 members whose gender matches the event's gender_class are
 * enrolled as participants.  The top 3 finishers receive GOLD / SILVER / BRONZE
 * achievement records.
 *
 * Uses raw DB inserts (bypasses AuditObserver).  AuditLogSeeder back-fills
 * the corresponding audit entries afterwards.
 *
 * Run order: after MemberSeeder and TournamentSeeder.
 */
class ParticipationSeeder extends Seeder
{
    /** Medal type keyed by finishing position (1-indexed). */
    private const MEDALS = [1 => 'GOLD', 2 => 'SILVER', 3 => 'BRONZE'];

    /** Participants per event (inclusive range). */
    private const MIN_PARTICIPANTS = 3;

    private const MAX_PARTICIPANTS = 8;

    public function run(): void
    {
        $org = Organization::firstOrFail();

        $session = SportSession::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('is_current', true)
            ->firstOrFail();

        $eventIds = DB::table('events as e')
            ->join('tournaments as t', 'e.tournament_id', '=', 't.id')
            ->where('t.organization_id', $org->id)
            ->where('t.session_id', $session->id)
            ->pluck('e.id');

        if ($eventIds->isEmpty()) {
            $this->command->warn('ParticipationSeeder: no events found — run TournamentSeeder first.');

            return;
        }

        $events = Event::withoutGlobalScopes()
            ->whereIn('id', $eventIds)
            ->with(['tournament:id,date_from'])
            ->get();

        if ($events->isEmpty()) {
            $this->command->warn('ParticipationSeeder: no events found — run TournamentSeeder first.');

            return;
        }

        // Pre-load active member IDs split by gender (shuffled for variety).
        $maleIds = Member::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('gender', 'M')
            ->where('current_status', 'ACTIVE')
            ->pluck('id')
            ->shuffle();

        $femaleIds = Member::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('gender', 'F')
            ->where('current_status', 'ACTIVE')
            ->pluck('id')
            ->shuffle();

        $allIds = $maleIds->merge($femaleIds)->shuffle();

        if ($allIds->isEmpty()) {
            $this->command->warn('ParticipationSeeder: no active members found.');

            return;
        }

        $now = now()->toDateTimeString();
        $participationRows = [];
        $usedPairs = []; // "event_id:member_id" → true (dedup guard)

        foreach ($events as $event) {
            $pool = match ($event->gender_class) {
                'M' => $maleIds,
                'F' => $femaleIds,
                default => $allIds,
            };

            if ($pool->isEmpty()) {
                continue;
            }

            $count = min(random_int(self::MIN_PARTICIPANTS, self::MAX_PARTICIPANTS), $pool->count());
            $picked = $pool->random($count);

            $position = 1;
            foreach ($picked as $memberId) {
                $key = "{$event->id}:{$memberId}";
                if (isset($usedPairs[$key])) {
                    continue;
                }
                $usedPairs[$key] = true;

                $participationRows[] = [
                    'event_id' => $event->id,
                    'member_id' => $memberId,
                    'team_id' => null,
                    'session_id' => $session->id,
                    'position' => $position,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $position++;
            }
        }

        if (empty($participationRows)) {
            $this->command->warn('ParticipationSeeder: nothing to insert.');

            return;
        }

        foreach (array_chunk($participationRows, 200) as $chunk) {
            DB::table('participations')->insertOrIgnore($chunk);
        }

        // Reload inserted rows to build achievement records by position.
        $inserted = DB::table('participations')
            ->where('session_id', $session->id)
            ->select(['id', 'position'])
            ->whereNotNull('position')
            ->get();

        $achievementRows = [];
        foreach ($inserted as $row) {
            if (isset(self::MEDALS[$row->position])) {
                $achievementRows[] = [
                    'participation_id' => $row->id,
                    'medal_type' => self::MEDALS[$row->position],
                    'position' => $row->position,
                    'remarks' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($achievementRows, 200) as $chunk) {
            DB::table('achievements')->insertOrIgnore($chunk);
        }

        $this->command->info(sprintf(
            'ParticipationSeeder: %d participations, %d achievements seeded.',
            count($participationRows),
            count($achievementRows),
        ));
    }
}
