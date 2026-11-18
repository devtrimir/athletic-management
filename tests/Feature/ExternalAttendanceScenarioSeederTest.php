<?php

declare(strict_types=1);

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use App\Models\User;
use Database\Seeders\ExternalAttendanceScenarioSeeder;

beforeEach(function (): void {
    $org = Organization::factory()->create();
    User::factory()->create(['organization_id' => $org->id]);
    $this->member = Member::factory()->create(['organization_id' => $org->id, 'pno' => '999000111', 'current_status' => 'ACTIVE']);
    $this->coach = ExternalCoach::factory()->create(['organization_id' => $org->id, 'status' => 'active']);
    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $org->id,
        'member_id' => $this->member->id,
        'external_coach_id' => $this->coach->id,
        'training_venue_id' => TrainingVenue::factory()->create(['organization_id' => $org->id])->id,
        'sport_id' => Sport::factory()->create(['organization_id' => $org->id])->id,
        'status' => 'active',
    ]);
    ExternalAttendanceScenarioSeeder::$pno = '999000111';
});

function scenarioRows()
{
    return ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->get();
}

it('seeds every status, location and review combination exactly once, and only once', function (): void {
    $this->seed(ExternalAttendanceScenarioSeeder::class);

    $rows = scenarioRows();

    expect($rows)->toHaveCount(224)
        ->and($rows->pluck('attendance_date')->map->toDateString()->unique())->toHaveCount(224)
        ->and($rows->pluck('attendance_status')->unique()->sort()->values()->all())->toBe(['absent', 'excused', 'late', 'present'])
        ->and($rows->pluck('geo_status')->unique())->toHaveCount(7)
        ->and($rows->pluck('review_status')->unique()->sort()->values()->all())->toBe(['accepted', 'corrected', 'locked', 'pending', 'rejected'])
        ->and($rows->pluck('corrected_attendance_status')->filter()->unique()->sort()->values()->all())->toBe(['absent', 'excused', 'late', 'not_marked', 'present'])
        ->and($rows->pluck('coach_remarks')->unique())->toHaveCount(224);

    // Corrections never repeat the submitted status; unreviewed rows have no reviewer.
    expect($rows->filter(fn ($r) => $r->corrected_attendance_status === $r->attendance_status)->count())->toBe(0)
        ->and($rows->where('review_status', 'pending')->whereNotNull('reviewed_by')->count())->toBe(0)
        ->and($rows->whereIn('review_status', ['accepted', 'rejected', 'corrected', 'locked'])->whereNull('reviewed_by')->count())->toBe(0);

    $this->seed(ExternalAttendanceScenarioSeeder::class);

    expect(scenarioRows())->toHaveCount(224);
});
