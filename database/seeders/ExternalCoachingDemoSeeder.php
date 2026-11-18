<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ExternalCoach;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\User;
use Carbon\CarbonImmutable;
use Faker\Factory;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Cross-linked demo data for the external coaching module: ~200 coaches,
 * assignments, attendance records and performance updates, plus extra venues.
 *
 * Run explicitly — NOT part of the default db:seed flow:
 *   php artisan db:seed --class=ExternalCoachingDemoSeeder
 *
 * Requires members, sports and an admin user (run the default db:seed first on
 * an empty database). Re-running is a no-op once demo coaches exist; to start
 *
 * over, delete the rows whose coach email matches demo.coach*@example.test.
 * Demo coaches can log in with the password "password".
 */
class ExternalCoachingDemoSeeder extends Seeder
{
    public const COUNT = 200;

    private const EMAIL_PREFIX = 'demo.coach';

    private const CITIES = [
        'Lucknow' => [26.8467, 80.9462], 'Kanpur' => [26.4499, 80.3319], 'Varanasi' => [25.3176, 82.9739],
        'Agra' => [27.1767, 78.0081], 'Prayagraj' => [25.4358, 81.8463], 'Meerut' => [28.9845, 77.7064],
        'Noida' => [28.5355, 77.3910], 'Ghaziabad' => [28.6692, 77.4538], 'Gorakhpur' => [26.7606, 83.3732],
        'Bareilly' => [28.3670, 79.4304],
    ];

    private const VENUE_KINDS = ['Sports Complex', 'Police Lines Ground', 'Stadium', 'Athletics Track', 'Training Academy'];

    private const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    private const COACH_STATUS = ['active' => 82, 'pending_invite' => 5, 'inactive' => 8, 'suspended' => 4, 'blacklisted' => 1];

    private const ASSIGNMENT_STATUS = [
        'active' => 52, 'completed' => 14, 'expired' => 8, 'paused' => 7, 'approved' => 5,
        'pending_approval' => 5, 'draft' => 4, 'cancelled' => 3, 'rejected' => 2,
    ];

    private const ATTENDANCE_STATUS = ['present' => 72, 'late' => 10, 'absent' => 8, 'excused' => 5, 'auto_absent' => 5];

    private const GEO_STATUS = ['valid' => 72, 'outside_radius' => 10, 'low_accuracy' => 6, 'location_missing' => 4, 'outside_training_time' => 5, 'manual_review_required' => 3];

    private const ATTENDANCE_REVIEW = ['pending' => 45, 'accepted' => 30, 'corrected' => 12, 'rejected' => 8, 'locked' => 5];

    private const PERFORMANCE_REVIEW = ['pending' => 48, 'accepted' => 30, 'needs_correction' => 10, 'rejected' => 7, 'locked' => 5];

    private const LEVELS = ['improving' => [6, 8], 'stable' => [5, 7], 'excellent' => [9, 10], 'needs_attention' => [2, 4]];

    private const SUMMARIES = [
        'Worked on technique drills and endurance circuits for 90 minutes.',
        'Speed and agility session followed by recovery stretching.',
        'Focused on fundamentals; athlete showed good consistency.',
        'Match simulation with tactical review at the end of the session.',
        'Strength and conditioning block with progressive loading.',
        'Skill refinement and video analysis of the previous competition.',
    ];

    private const NOTES = [
        'Good improvement in stamina; continue the current plan.',
        'Needs more work on recovery between sets.',
        'Technique is solid, consistency under pressure is the next target.',
        'Strong effort; monitor workload to avoid fatigue.',
        'Nutrition and sleep habits should be reviewed.',
    ];

    private Generator $faker;

    private CarbonImmutable $today;

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('ExternalCoachingDemoSeeder must not run in production.');
        }

        if (ExternalCoach::withTrashed()->where('email', 'like', self::EMAIL_PREFIX.'%@example.test')->exists()) {
            $this->command?->warn('Demo external coaching data already exists — nothing to do.');

            return;
        }

        $org = Organization::query()->firstOrFail();
        $admin = User::query()->where('organization_id', $org->id)->orderBy('id')->firstOrFail();
        $memberIds = Member::withoutGlobalScopes()->where('organization_id', $org->id)->where('current_status', 'ACTIVE')->pluck('id')->all();
        $sportIds = Sport::withoutGlobalScopes()->where('organization_id', $org->id)->where('is_active', true)->pluck('id')->all();

        if ($memberIds === [] || $sportIds === []) {
            throw new RuntimeException('Seed members and sports first (php artisan db:seed).');
        }

        $this->faker = Factory::create('en_IN');
        $this->faker->seed(2026);
        $this->today = CarbonImmutable::today('Asia/Kolkata');

        DB::transaction(function () use ($org, $admin, $memberIds, $sportIds): void {
            $venues = $this->seedVenues($org->id);
            $coaches = $this->seedCoaches($org->id, $admin->id, $sportIds, array_keys($venues), $venues);
            $assignments = $this->seedAssignments($org->id, $admin->id, $coaches, $memberIds, $venues);
            $attendances = $this->seedAttendances($org->id, $admin->id, $assignments, $venues);
            $updates = $this->seedPerformanceUpdates($org->id, $admin->id, $assignments);

            $this->command?->info(sprintf(
                'Seeded %d venues, %d coaches, %d assignments, %d attendance records and %d performance updates.',
                count($venues), count($coaches), count($assignments), $attendances, $updates,
            ));
        });
    }

    /**
     * @return array<int, array{id: int, name: string, lat: float, lng: float, radius: int}> keyed by venue id
     */
    private function seedVenues(int $orgId): array
    {
        $now = now();
        $cities = array_keys(self::CITIES);

        for ($i = 1; $i <= 25; $i++) {
            $city = $cities[($i - 1) % count($cities)];
            [$lat, $lng] = self::CITIES[$city];
            DB::table('training_venues')->insert([
                'organization_id' => $orgId,
                'name' => sprintf('%s %s %d', $city, self::VENUE_KINDS[$i % count(self::VENUE_KINDS)], intdiv($i - 1, count($cities)) + 1),
                'code' => sprintf('DEMO-VEN-%02d', $i),
                'address' => $this->faker->streetAddress().', '.$city,
                'city' => $city,
                'state' => 'Uttar Pradesh',
                'latitude' => round($lat + $this->faker->randomFloat(4, -0.05, 0.05), 7),
                'longitude' => round($lng + $this->faker->randomFloat(4, -0.05, 0.05), 7),
                'allowed_radius_meters' => $this->faker->randomElement([100, 150, 200, 300]),
                'status' => $this->weighted(['active' => 90, 'under_review' => 5, 'inactive' => 5]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return DB::table('training_venues')
            ->where('organization_id', $orgId)
            ->where('status', 'active')
            ->get(['id', 'name', 'latitude', 'longitude', 'allowed_radius_meters'])
            ->mapWithKeys(fn (object $venue): array => [(int) $venue->id => [
                'id' => (int) $venue->id,
                'name' => $venue->name,
                'lat' => (float) $venue->latitude,
                'lng' => (float) $venue->longitude,
                'radius' => (int) $venue->allowed_radius_meters,
            ]])
            ->all();
    }

    /**
     * @param  list<int>  $sportIds
     * @param  list<int>  $venueIds
     * @param  array<int, array{id: int}>  $venues
     * @return list<array{id: int, status: string, sports: list<int>, venues: list<int>}>
     */
    private function seedCoaches(int $orgId, int $adminId, array $sportIds, array $venueIds, array $venues): array
    {
        $password = Hash::make('password');
        $now = now();
        $coaches = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $status = $this->weighted(self::COACH_STATUS);
            $city = $this->faker->randomElement(array_keys(self::CITIES));
            $id = DB::table('external_coaches')->insertGetId([
                'organization_id' => $orgId,
                'name' => $this->faker->name(),
                'phone' => '9'.str_pad((string) (100000000 + $i * 7331), 9, '0', STR_PAD_LEFT),
                'email' => sprintf('%s%d@example.test', self::EMAIL_PREFIX, $i),
                'password' => $password,
                'gender' => $this->faker->randomElement(['M', 'M', 'M', 'F', 'F', 'O']),
                'date_of_birth' => $this->faker->dateTimeBetween('-60 years', '-24 years')->format('Y-m-d'),
                'city' => $city,
                'address' => $this->faker->streetAddress().', '.$city,
                'experience_years' => $this->faker->numberBetween(1, 30),
                'certification_details' => $this->faker->randomElement(['NIS Diploma in Coaching', 'Level 2 Coaching Certificate', 'B.P.Ed with national coaching license', 'State-level coaching certificate']),
                'emergency_contact' => '8'.str_pad((string) (200000000 + $i * 4421), 9, '0', STR_PAD_LEFT),
                'status' => $status,
                'created_by' => $adminId,
                'updated_by' => $adminId,
                'created_at' => $now->copy()->subDays($this->faker->numberBetween(30, 400)),
                'updated_at' => $now,
            ]);

            $sports = $this->faker->randomElements($sportIds, $this->faker->numberBetween(1, 3));
            $coachVenues = $this->faker->randomElements($venueIds, $this->faker->numberBetween(1, 3));

            DB::table('external_coach_sport')->insert(array_map(fn (int $sportId): array => [
                'external_coach_id' => $id, 'sport_id' => $sportId, 'created_at' => $now, 'updated_at' => $now,
            ], $sports));
            DB::table('external_coach_training_venue')->insert(array_map(fn (int $venueId): array => [
                'external_coach_id' => $id, 'training_venue_id' => $venueId, 'created_at' => $now, 'updated_at' => $now,
            ], $coachVenues));
            DB::table('external_coach_status_histories')->insert([
                'external_coach_id' => $id,
                'status' => $status,
                'reason' => in_array($status, ['suspended', 'blacklisted'], true) ? 'Reported by the unit; pending review.' : null,
                'recorded_by' => $adminId,
                'recorded_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $coaches[] = ['id' => $id, 'status' => $status, 'sports' => $sports, 'venues' => $coachVenues];
        }

        return $coaches;
    }

    /**
     * @param  list<array{id: int, status: string, sports: list<int>, venues: list<int>}>  $coaches
     * @param  list<int>  $memberIds
     * @param  array<int, array{id: int}>  $venues
     * @return list<array<string, mixed>> inserted assignments with their dates and members
     */
    private function seedAssignments(int $orgId, int $adminId, array $coaches, array $memberIds, array $venues): array
    {
        $now = now();
        $activeCoaches = array_values(array_filter($coaches, fn (array $coach): bool => $coach['status'] === 'active'));
        $assignments = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $status = $this->weighted(self::ASSIGNMENT_STATUS);
            $coach = $this->faker->randomElement(in_array($status, ['active', 'paused', 'approved', 'completed'], true) ? $activeCoaches : $coaches);
            $venueId = $this->faker->randomElement(array_values(array_filter($coach['venues'], fn (int $id): bool => isset($venues[$id]))) ?: [array_key_first($venues)]);
            [$start, $end] = $this->assignmentDates($status);
            $days = $this->faker->randomElements(self::DAYS, $this->faker->numberBetween(3, 5));
            $startTime = $this->faker->randomElement(['05:30', '06:00', '06:30', '16:00', '17:00']);
            $endTime = CarbonImmutable::parse($startTime)->addMinutes($this->faker->randomElement([90, 120, 150]))->format('H:i');
            $approved = ! in_array($status, ['draft', 'pending_approval', 'rejected'], true);

            $row = [
                'organization_id' => $orgId,
                'member_id' => $this->faker->randomElement($memberIds),
                'external_coach_id' => $coach['id'],
                'training_venue_id' => $venueId,
                'sport_id' => $this->faker->randomElement($coach['sports']),
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'training_days' => json_encode($days),
                'training_start_time' => $startTime,
                'training_end_time' => $endTime,
                'attendance_mode' => $this->weighted(['single_mark' => 85, 'check_in_check_out' => 15]),
                'permission_reference_number' => sprintf('UPPSCB/EXT/%d/%04d', $start->year, $i),
                'approved_by' => $approved ? $adminId : null,
                'approved_at' => $approved ? $start->subDays(3)->setTime(11, 0) : null,
                'status' => $status,
                'cancellation_reason' => in_array($status, ['cancelled', 'rejected'], true) ? 'Not required by the unit.' : null,
                'completion_remarks' => $status === 'completed' ? 'Training cycle completed successfully.' : null,
                'created_by' => $adminId,
                'updated_by' => $adminId,
                'created_at' => $start->subDays(7),
                'updated_at' => $now,
            ];
            $row['id'] = DB::table('external_coaching_assignments')->insertGetId($row);
            $row['days'] = $days;
            $assignments[] = $row;
        }

        return $assignments;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function assignmentDates(string $status): array
    {
        $today = $this->today;
        $n = fn (int $min, int $max): int => $this->faker->numberBetween($min, $max);

        return match ($status) {
            'completed' => (function () use ($today, $n): array {
                $end = $today->subDays($n(1, 40));

                return [$end->subDays($n(30, 120)), $end];
            })(),
            'expired' => (function () use ($today, $n): array {
                $end = $today->subDays($n(5, 60));

                return [$end->subDays($n(30, 90)), $end];
            })(),
            'draft', 'pending_approval', 'approved' => (function () use ($today, $n): array {
                $start = $today->addDays($n(0, 30));

                return [$start, $start->addDays($n(60, 150))];
            })(),
            'cancelled', 'rejected' => (function () use ($today, $n): array {
                $start = $today->subDays($n(0, 60));

                return [$start, $start->addDays($n(30, 90))];
            })(),
            default => [$today->subDays($n(10, 120)), $today->addDays($n(15, 150))],
        };
    }

    /**
     * @param  list<array<string, mixed>>  $assignments
     * @param  array<int, array{id: int, name: string, lat: float, lng: float, radius: int}>  $venues
     */
    private function seedAttendances(int $orgId, int $adminId, array $assignments, array $venues): int
    {
        $eligible = $this->runningAssignments($assignments);
        $seen = [];
        $inserted = 0;
        $attempts = 0;

        while ($inserted < self::COUNT && $attempts++ < 20000) {
            $assignment = $this->faker->randomElement($eligible);
            $range = $this->datesFor($assignment, onlyTrainingDays: true);

            if ($range === []) {
                continue;
            }

            $date = $this->faker->randomElement($range);
            $key = $assignment['id'].'|'.$date->toDateString();

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            DB::table('external_training_attendances')->insert($this->attendanceRow($orgId, $adminId, $assignment, $date, $venues[$assignment['training_venue_id']] ?? null));
            $inserted++;
        }

        return $inserted;
    }

    /**
     * @param  array<string, mixed>  $assignment
     * @param  array{id: int, name: string, lat: float, lng: float, radius: int}|null  $venue
     * @return array<string, mixed>
     */
    private function attendanceRow(int $orgId, int $adminId, array $assignment, CarbonImmutable $date, ?array $venue): array
    {
        $kind = $this->weighted(self::ATTENDANCE_STATUS);
        $auto = $kind === 'auto_absent';
        $status = $auto ? 'absent' : $kind;
        $geo = $auto ? 'manual_review_required' : $this->weighted(self::GEO_STATUS);
        $hasProof = ! $auto && ! in_array($status, ['absent'], true);
        $submitted = $date->setTime(...$this->timeParts($assignment['training_start_time']))->addMinutes($geo === 'outside_training_time' ? 240 : $this->faker->numberBetween(0, 60));
        $review = $this->weighted(self::ATTENDANCE_REVIEW);
        $reviewed = $review !== 'pending';
        $radius = $venue['radius'] ?? 200;

        [$distance, $accuracy] = match ($geo) {
            'outside_radius' => [$this->faker->numberBetween($radius + 50, 900), $this->faker->numberBetween(8, 40)],
            'low_accuracy' => [$this->faker->numberBetween(5, $radius - 10), $this->faker->numberBetween(120, 400)],
            default => [$this->faker->numberBetween(0, max(5, intdiv($radius, 2))), $this->faker->numberBetween(6, 40)],
        };
        $coords = $hasProof && $geo !== 'location_missing' && $venue !== null
            ? [round($venue['lat'] + $distance / 111320, 7), round($venue['lng'] + $distance / 111320 / max(0.2, cos(deg2rad($venue['lat']))), 7)]
            : [null, null];
        $checkInOut = $assignment['attendance_mode'] === 'check_in_check_out' && $hasProof;

        return [
            'organization_id' => $orgId,
            'external_coaching_assignment_id' => $assignment['id'],
            'member_id' => $assignment['member_id'],
            'external_coach_id' => $assignment['external_coach_id'],
            'training_venue_id' => $assignment['training_venue_id'],
            'attendance_date' => $date->toDateString(),
            'attendance_status' => $status,
            'corrected_attendance_status' => $review === 'corrected' ? $this->faker->randomElement(['present', 'late', 'excused']) : null,
            'review_status' => $review,
            'reviewed_by' => $reviewed ? $adminId : null,
            'reviewed_at' => $reviewed ? $submitted->addDay() : null,
            'review_remarks' => $reviewed ? $this->faker->randomElement(['Verified against the roster.', 'Location confirmed with the venue manager.', 'Corrected after speaking with the coach.', 'Proof photo is unclear.']) : null,
            'geo_status' => $geo,
            'flag_reason' => $auto ? 'coach_not_submitted_attendance' : match ($geo) {
                'outside_radius' => "Submission was {$distance} meters from the venue.",
                'low_accuracy' => "GPS accuracy was {$accuracy} meters.",
                'location_missing' => 'Location coordinates were not submitted.',
                'outside_training_time' => 'Submission was outside the approved training time.',
                default => null,
            },
            'coach_remarks' => $auto ? null : $this->faker->optional(0.4)->randomElement(['Regular session.', 'Athlete arrived late.', 'Light drills due to weather.', 'Focus on endurance today.']),
            'submitted_at' => $submitted,
            'submitted_latitude' => $coords[0],
            'submitted_longitude' => $coords[1],
            'submitted_gps_accuracy' => $coords[0] === null ? null : $accuracy,
            'distance_from_venue_meters' => $coords[0] === null ? null : $distance,
            'submitted_photo_path' => $hasProof ? 'external-training-attendance/demo-proof.jpg' : null,
            'submitted_photo_original_name' => $hasProof ? 'proof.jpg' : null,
            'submitted_photo_mime_type' => $hasProof ? 'image/jpeg' : null,
            'submitted_photo_size_bytes' => $hasProof ? $this->faker->numberBetween(80_000, 400_000) : null,
            'submitted_photo_uploaded_at' => $hasProof ? $submitted : null,
            'submitted_photo_width' => $hasProof ? 1280 : null,
            'submitted_photo_height' => $hasProof ? 960 : null,
            'submitted_photo_source' => $hasProof ? $this->faker->randomElement(['camera', 'upload']) : null,
            'check_in_at' => $checkInOut ? $submitted : null,
            'check_in_latitude' => $checkInOut ? $coords[0] : null,
            'check_in_longitude' => $checkInOut ? $coords[1] : null,
            'check_in_geo_status' => $checkInOut ? $geo : null,
            'check_out_at' => $checkInOut ? $submitted->addMinutes($duration = $this->faker->numberBetween(80, 150)) : null,
            'check_out_latitude' => $checkInOut ? $coords[0] : null,
            'check_out_longitude' => $checkInOut ? $coords[1] : null,
            'check_out_geo_status' => $checkInOut ? $geo : null,
            'duration_minutes' => $checkInOut ? $duration : null,
            'venue_latitude_snapshot' => $venue['lat'] ?? null,
            'venue_longitude_snapshot' => $venue['lng'] ?? null,
            'allowed_radius_meters_snapshot' => $venue['radius'] ?? null,
            'venue_name_snapshot' => $venue['name'] ?? null,
            'ip_address' => $auto ? null : $this->faker->ipv4(),
            'user_agent' => $auto ? null : 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
            'browser_timezone' => 'Asia/Kolkata',
            'submitted_source' => $auto ? 'system' : 'external_coach_portal',
            'created_at' => $submitted,
            'updated_at' => $submitted,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $assignments
     */
    private function seedPerformanceUpdates(int $orgId, int $adminId, array $assignments): int
    {
        $eligible = $this->runningAssignments($assignments);
        $seen = [];
        $inserted = 0;
        $attempts = 0;

        while ($inserted < self::COUNT && $attempts++ < 20000) {
            $assignment = $this->faker->randomElement($eligible);
            $range = $this->datesFor($assignment, onlyTrainingDays: false);

            if ($range === []) {
                continue;
            }

            $date = $this->faker->randomElement($range);
            $key = $assignment['id'].'|'.$date->toDateString();

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $level = $this->faker->randomElement(array_keys(self::LEVELS));
            $review = $this->weighted(self::PERFORMANCE_REVIEW);
            $reviewed = $review !== 'pending';
            $at = $date->setTime($this->faker->numberBetween(17, 21), $this->faker->numberBetween(0, 59));

            DB::table('external_coach_performance_updates')->insert([
                'organization_id' => $orgId,
                'external_coaching_assignment_id' => $assignment['id'],
                'member_id' => $assignment['member_id'],
                'external_coach_id' => $assignment['external_coach_id'],
                'sport_id' => $assignment['sport_id'],
                'update_date' => $date->toDateString(),
                'performance_level' => $level,
                'performance_score' => $this->faker->numberBetween(...self::LEVELS[$level]),
                'training_summary' => $this->faker->randomElement(self::SUMMARIES),
                'improvement_notes' => $this->faker->randomElement(self::NOTES),
                'injury_or_fitness_notes' => $this->faker->optional(0.2)->randomElement(['Minor knee strain, advised rest.', 'Fitness level is good.', 'Mild fatigue after the weekend session.']),
                'next_focus' => $this->faker->optional(0.7)->randomElement(['Endurance', 'Speed work', 'Technique', 'Mental preparation', 'Recovery']),
                'review_status' => $review,
                'reviewed_by' => $reviewed ? $adminId : null,
                'reviewed_at' => $reviewed ? $at->addDay() : null,
                'review_remarks' => $reviewed ? $this->faker->randomElement(['Looks good.', 'Please add more detail on the drills.', 'Reviewed with the unit sports officer.']) : null,
                'ip_address' => $this->faker->ipv4(),
                'user_agent' => 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
                'created_at' => $at,
                'updated_at' => $at,
            ]);
            $inserted++;
        }

        return $inserted;
    }

    /**
     * Assignments that have actually started and can have attendance/updates.
     *
     * @param  list<array<string, mixed>>  $assignments
     * @return list<array<string, mixed>>
     */
    private function runningAssignments(array $assignments): array
    {
        return array_values(array_filter($assignments, fn (array $assignment): bool => in_array($assignment['status'], ['active', 'completed', 'expired', 'paused'], true)
            && $assignment['start_date'] <= $this->today->toDateString()));
    }

    /**
     * Past dates inside an assignment's window (optionally only its training weekdays).
     *
     * @param  array<string, mixed>  $assignment
     * @return list<CarbonImmutable>
     */
    private function datesFor(array $assignment, bool $onlyTrainingDays): array
    {
        $start = CarbonImmutable::parse($assignment['start_date']);
        $end = min(CarbonImmutable::parse($assignment['end_date']), $this->today->subDay());
        $dates = [];

        for ($day = $start; $day->lte($end); $day = $day->addDay()) {
            if (! $onlyTrainingDays || in_array(strtolower($day->englishDayOfWeek), $assignment['days'], true)) {
                $dates[] = $day;
            }
        }

        return $dates;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function timeParts(string $time): array
    {
        [$hour, $minute] = array_map('intval', explode(':', $time));

        return [$hour, $minute];
    }

    /**
     * @param  array<string, int>  $weights
     */
    private function weighted(array $weights): string
    {
        $roll = $this->faker->numberBetween(1, array_sum($weights));

        foreach ($weights as $value => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return (string) $value;
            }
        }

        return (string) array_key_last($weights);
    }
}
