<?php

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Sport;
use App\Models\User;
use Database\Seeders\ExternalCoachingDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('the demo seeder creates cross-linked external coaching data and is idempotent', function () {
    $admin = rcUser();
    $org = $admin->organization_id;
    Member::factory()->count(30)->create(['organization_id' => $org, 'current_status' => 'ACTIVE']);
    Sport::factory()->count(6)->create(['organization_id' => $org, 'is_active' => true]);

    app(ExternalCoachingDemoSeeder::class)->run();

    expect(ExternalCoach::query()->count())->toBe(200)
        ->and(ExternalCoachingAssignment::withoutGlobalScopes()->count())->toBe(200)
        ->and(ExternalTrainingAttendance::withoutGlobalScopes()->count())->toBe(200)
        ->and(ExternalCoachPerformanceUpdate::withoutGlobalScopes()->count())->toBe(200);

    // Every attendance and update agrees with the assignment it belongs to.
    $mismatchedAttendance = ExternalTrainingAttendance::withoutGlobalScopes()
        ->join('external_coaching_assignments as a', 'a.id', '=', 'external_training_attendances.external_coaching_assignment_id')
        ->whereColumn('a.member_id', '!=', 'external_training_attendances.member_id')
        ->orWhereColumn('a.external_coach_id', '!=', 'external_training_attendances.external_coach_id')
        ->orWhereColumn('a.training_venue_id', '!=', 'external_training_attendances.training_venue_id')
        ->count();
    $mismatchedUpdates = ExternalCoachPerformanceUpdate::withoutGlobalScopes()
        ->join('external_coaching_assignments as a', 'a.id', '=', 'external_coach_performance_updates.external_coaching_assignment_id')
        ->whereColumn('a.sport_id', '!=', 'external_coach_performance_updates.sport_id')
        ->orWhereColumn('a.external_coach_id', '!=', 'external_coach_performance_updates.external_coach_id')
        ->count();

    expect($mismatchedAttendance)->toBe(0)->and($mismatchedUpdates)->toBe(0);

    // Assignments use sports and venues the coach is actually linked to.
    $unlinked = ExternalCoachingAssignment::withoutGlobalScopes()
        ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('external_coach_sport as s')
            ->whereColumn('s.external_coach_id', 'external_coaching_assignments.external_coach_id')
            ->whereColumn('s.sport_id', 'external_coaching_assignments.sport_id'))
        ->count();

    expect($unlinked)->toBe(0)
        ->and(ExternalCoachingAssignment::withoutGlobalScopes()->where('status', 'active')->count())->toBeGreaterThan(50)
        ->and(ExternalTrainingAttendance::withoutGlobalScopes()->distinct()->pluck('review_status')->count())->toBeGreaterThan(2)
        ->and(ExternalTrainingAttendance::withoutGlobalScopes()->where('attendance_date', '>', now()->toDateString())->count())->toBe(0);

    app(ExternalCoachingDemoSeeder::class)->run();

    expect(ExternalCoach::query()->count())->toBe(200);
    expect(User::query()->count())->toBeGreaterThan(0);
});
