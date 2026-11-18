<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\TrainingVenue;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Gives one player every combination of submitted status x location result x
 * review outcome, so each can be inspected on the admin attendance review
 * screens, the member profile and the external coach athlete tab.
 *
 *   php artisan db:seed --class=ExternalAttendanceScenarioSeeder
 *
 * 4 submitted statuses x 7 location results x 8 review outcomes = 224 records,
 * one per day counting back from yesterday, on a dedicated assignment marked
 * with SCENARIO_REMARKS. Each record's coach remark reads
 * "Scenario: <status> · <location> · <outcome>" so it can be searched. Re-running
 * does nothing once that assignment exists; to start over, delete the
 * assignment (and its attendance) whose remarks match SCENARIO_REMARKS.
 */
class ExternalAttendanceScenarioSeeder extends Seeder
{
    public const SCENARIO_REMARKS = 'Attendance scenario demo: every status, location and review combination.';

    /** PNO of the player to seed; override in tests. */
    public static string $pno = '232330500';

    private const SUBMITTED = ['present', 'absent', 'late', 'excused'];

    private const GEO = [
        'valid',
        'outside_radius',
        'location_missing',
        'low_accuracy',
        'outside_training_time',
        'location_permission_denied',
        'manual_review_required',
    ];

    private const CORRECTIONS = ['present', 'absent', 'late', 'excused', 'not_marked'];

    private const FLAG_REASONS = [
        'valid' => null,
        'outside_radius' => 'Submission was 640 meters from the venue.',
        'location_missing' => 'Location coordinates were not submitted.',
        'low_accuracy' => 'GPS accuracy was 250 meters.',
        'outside_training_time' => 'Submission was outside the approved training time.',
        'location_permission_denied' => 'Location permission was denied on the device.',
        'manual_review_required' => 'Marked for manual review.',
    ];

    public function run(): void
    {
        $member = Member::withoutGlobalScope(BelongsToOrganization::class)->where('pno', self::$pno)->first()
            ?? throw new RuntimeException('No member with PNO '.self::$pno.'.');

        $base = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('member_id', $member->id)
            ->where(fn ($query) => $query->whereNull('remarks')->orWhere('remarks', '!=', self::SCENARIO_REMARKS))
            ->latest('id')
            ->first()
            ?? throw new RuntimeException('The player needs an existing external coaching assignment to copy the coach and venue from.');

        if (ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('member_id', $member->id)
            ->where('remarks', self::SCENARIO_REMARKS)
            ->exists()) {
            $this->command?->info('Scenario attendance already seeded; nothing to do.');

            return;
        }

        $venue = TrainingVenue::withoutGlobalScope(BelongsToOrganization::class)->findOrFail($base->training_venue_id);
        $reviewerId = User::query()->where('organization_id', $base->organization_id)->orderBy('id')->value('id');
        $today = CarbonImmutable::today();
        $combos = $this->combinations();

        $assignment = ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)->create([
            'organization_id' => $base->organization_id,
            'member_id' => $member->id,
            'external_coach_id' => $base->external_coach_id,
            'training_venue_id' => $base->training_venue_id,
            'sport_id' => $base->sport_id,
            'sport_event_id' => $base->sport_event_id,
            'start_date' => $today->subDays(count($combos) + 30)->toDateString(),
            'end_date' => $today->addMonths(2)->toDateString(),
            'training_days' => $base->training_days,
            'training_start_time' => $base->training_start_time,
            'training_end_time' => $base->training_end_time,
            'attendance_mode' => 'single_mark',
            'status' => 'active',
            'remarks' => self::SCENARIO_REMARKS,
            'created_by' => $reviewerId,
        ]);

        foreach ($combos as $index => [$status, $geo, $outcome]) {
            $date = $today->subDays($index + 1);
            $label = "{$status} · {$geo} · {$outcome}";
            $submittedAt = $date->setTime($geo === 'outside_training_time' ? 3 : 17, 20 + ($index % 30));
            $point = $this->location($geo, $venue, $index);
            $reviewed = $outcome !== 'pending';

            ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->create([
                'organization_id' => $assignment->organization_id,
                'external_coaching_assignment_id' => $assignment->id,
                'member_id' => $member->id,
                'external_coach_id' => $assignment->external_coach_id,
                'training_venue_id' => $assignment->training_venue_id,
                'attendance_date' => $date->toDateString(),
                'attendance_status' => $status,
                'corrected_attendance_status' => str_starts_with($outcome, 'corrected:') ? substr($outcome, 10) : null,
                'review_status' => $this->reviewStatus($outcome),
                'reviewed_by' => $reviewed ? $reviewerId : null,
                'reviewed_at' => $reviewed ? $submittedAt->addDay() : null,
                'review_remarks' => $reviewed ? $this->remarks($outcome, $geo) : null,
                'geo_status' => $geo,
                'flag_reason' => self::FLAG_REASONS[$geo],
                'coach_remarks' => "Scenario: {$label}",
                'submitted_at' => $submittedAt,
                'submitted_latitude' => $point['lat'],
                'submitted_longitude' => $point['lng'],
                'submitted_gps_accuracy' => $point['accuracy'],
                'distance_from_venue_meters' => $point['distance'],
                'submitted_photo_path' => in_array($status, ['present', 'late'], true) ? 'external-training-attendance/demo-proof.jpg' : null,
                'submitted_photo_original_name' => in_array($status, ['present', 'late'], true) ? 'proof.jpg' : null,
                'submitted_photo_mime_type' => in_array($status, ['present', 'late'], true) ? 'image/jpeg' : null,
                'submitted_photo_size_bytes' => in_array($status, ['present', 'late'], true) ? 180_000 : null,
                'submitted_photo_uploaded_at' => in_array($status, ['present', 'late'], true) ? $submittedAt : null,
                'submitted_photo_source' => in_array($status, ['present', 'late'], true) ? 'camera' : null,
                'venue_latitude_snapshot' => $venue->latitude,
                'venue_longitude_snapshot' => $venue->longitude,
                'allowed_radius_meters_snapshot' => $venue->allowed_radius_meters,
                'venue_name_snapshot' => $venue->name,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Scenario seeder',
                'browser_timezone' => 'Asia/Kolkata',
                'submitted_source' => 'external_coach_portal',
            ]);
        }

        $this->command?->info(count($combos).' scenario attendance records seeded for PNO '.self::$pno.'.');
    }

    /**
     * @return list<array{0: string, 1: string, 2: string}>
     */
    private function combinations(): array
    {
        $combos = [];

        foreach (self::SUBMITTED as $status) {
            foreach (self::GEO as $geo) {
                $outcomes = ['pending', 'accepted', 'rejected', 'locked'];

                foreach (self::CORRECTIONS as $correction) {
                    if ($correction !== $status) {
                        $outcomes[] = "corrected:{$correction}";
                    }
                }

                foreach ($outcomes as $outcome) {
                    $combos[] = [$status, $geo, $outcome];
                }
            }
        }

        return $combos;
    }

    private function reviewStatus(string $outcome): string
    {
        return str_starts_with($outcome, 'corrected:') ? 'corrected' : $outcome;
    }

    private function remarks(string $outcome, string $geo): string
    {
        return match (true) {
            $outcome === 'accepted' && $geo !== 'valid' => 'Accepted after the coach confirmed the athlete was present at the venue.',
            $outcome === 'accepted' => 'Verified against the roster.',
            $outcome === 'rejected' => 'Rejected: the submission could not be verified.',
            $outcome === 'locked' => 'Month closed; record locked.',
            default => 'Corrected after admin verification.',
        };
    }

    /**
     * @return array{lat: float|null, lng: float|null, accuracy: int|null, distance: float|null}
     */
    private function location(string $geo, TrainingVenue $venue, int $index): array
    {
        $lat = (float) $venue->latitude;
        $lng = (float) $venue->longitude;
        $near = ['lat' => round($lat + (($index % 5) - 2) * 0.0001, 7), 'lng' => round($lng + (($index % 7) - 3) * 0.0001, 7)];

        return match ($geo) {
            'outside_radius' => ['lat' => round($lat + 0.0058, 7), 'lng' => $lng, 'accuracy' => 12, 'distance' => 640.0],
            'location_missing', 'location_permission_denied' => ['lat' => null, 'lng' => null, 'accuracy' => null, 'distance' => null],
            'low_accuracy' => [...$near, 'accuracy' => 250, 'distance' => 40.0],
            default => [...$near, 'accuracy' => 12, 'distance' => (float) (10 + ($index % 12) * 8)],
        };
    }
}
