<?php

use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\TrainingVenue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('training venue print page requires permission and applies filters', function () {
    $user = rcUser('training-venues.view');
    TrainingVenue::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Alpha Ground', 'status' => 'active']);
    TrainingVenue::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Beta Hall', 'status' => 'inactive']);

    $this->actingAs($user)->get(route('training-venues.print', ['filter' => ['status' => 'inactive']]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('training-venues/print')
            ->has('venues', 1)
            ->where('venues.0.name', 'Beta Hall'));

    $this->actingAs(rcUser())->get(route('training-venues.print'))->assertForbidden();
});

test('assignment print page applies the same filters as the listing', function () {
    $user = rcUser('external-coaching-assignments.view');
    $org = $user->organization_id;
    $member = Member::factory()->create(['organization_id' => $org, 'full_name' => 'Printable Player']);
    ExternalCoachingAssignment::factory()->create(['organization_id' => $org, 'member_id' => $member->id, 'status' => 'active']);
    ExternalCoachingAssignment::factory()->create(['organization_id' => $org, 'status' => 'draft']);

    $this->actingAs($user)->get(route('external-coaching-assignments.print', ['filter' => ['status' => 'active', 'member_query' => 'Printable']]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coaching-assignments/print')
            ->has('assignments', 1)
            ->where('assignments.0.member', 'Printable Player')
            ->missing('assignments.0.permission_document_path'));

    $this->actingAs(rcUser())->get(route('external-coaching-assignments.print'))->assertForbidden();
});

test('performance update print page filters by review status and hides request metadata', function () {
    $user = rcUser('external-coach-performance-updates.view');
    $org = $user->organization_id;
    ExternalCoachPerformanceUpdate::factory()->create(['organization_id' => $org, 'review_status' => 'pending']);
    ExternalCoachPerformanceUpdate::factory()->create(['organization_id' => $org, 'review_status' => 'reviewed']);

    $this->actingAs($user)->get(route('external-coach-performance-updates.print', ['filter' => ['review_status' => 'reviewed']]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach-performance-updates/print')
            ->has('updates', 1)
            ->where('updates.0.review_status', 'reviewed')
            ->missing('updates.0.ip_address'));

    $this->actingAs(rcUser())->get(route('external-coach-performance-updates.print'))->assertForbidden();
});

test('attendance print page honors selected ids', function () {
    $user = rcUser('external-training-attendances.view');
    $org = $user->organization_id;
    $first = ExternalTrainingAttendance::factory()->create(['organization_id' => $org]);
    ExternalTrainingAttendance::factory()->create(['organization_id' => $org]);

    $this->actingAs($user)->get(route('external-training-attendances.print', ['ids' => [$first->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-training-attendances/print')
            ->has('attendances', 1)
            ->where('attendances.0.id', $first->id)
            ->where('filters.selected', 1));

    $this->actingAs(rcUser())->get(route('external-training-attendances.print'))->assertForbidden();
});
