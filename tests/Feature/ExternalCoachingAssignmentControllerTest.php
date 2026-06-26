<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

function externalAssignmentPayload(array $overrides = []): array
{
    return [
        'member_id' => $overrides['member_id'],
        'external_coach_id' => $overrides['external_coach_id'],
        'training_venue_id' => $overrides['training_venue_id'],
        'sport_id' => $overrides['sport_id'],
        'start_date' => '2026-07-01',
        'end_date' => '2026-09-30',
        'training_days' => ['monday', 'wednesday', 'friday'],
        'training_start_time' => '06:00',
        'training_end_time' => '08:00',
        'attendance_mode' => 'single_mark',
        'permission_reference_number' => 'PERM-2026-001',
        'status' => 'active',
        'remarks' => 'Approved private sprint coaching.',
        ...$overrides,
    ];
}

function externalAssignmentFixture(int $organizationId): array
{
    return [
        'member' => Member::factory()->create(['organization_id' => $organizationId, 'current_status' => 'ACTIVE']),
        'externalCoach' => ExternalCoach::factory()->create(['organization_id' => $organizationId, 'status' => 'active']),
        'trainingVenue' => TrainingVenue::factory()->create(['organization_id' => $organizationId, 'status' => 'active']),
        'sport' => Sport::factory()->create(['organization_id' => $organizationId, 'is_active' => true]),
    ];
}

function createExternalAssignmentForFilterScenario(int $organizationId, array $memberOverrides = [], array $coachOverrides = [], array $assignmentOverrides = []): ExternalCoachingAssignment
{
    $member = Member::factory()->create([
        'organization_id' => $organizationId,
        'current_status' => 'ACTIVE',
        ...$memberOverrides,
    ]);

    $coach = ExternalCoach::factory()->create([
        'organization_id' => $organizationId,
        'status' => 'active',
        ...$coachOverrides,
    ]);

    $trainingVenue = TrainingVenue::factory()->create(['organization_id' => $organizationId, 'status' => 'active']);
    $sport = Sport::factory()->create(['organization_id' => $organizationId, 'is_active' => true]);

    return ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organizationId,
        'member_id' => $member->id,
        'external_coach_id' => $coach->id,
        'training_venue_id' => $trainingVenue->id,
        'sport_id' => $sport->id,
        ...$assignmentOverrides,
    ]);
}

test('external coaching assignments table exists with required columns', function (): void {
    expect(Schema::hasTable('external_coaching_assignments'))->toBeTrue();

    foreach ([
        'organization_id',
        'member_id',
        'external_coach_id',
        'training_venue_id',
        'sport_id',
        'start_date',
        'end_date',
        'attendance_mode',
        'permission_document_path',
        'permission_document_original_name',
        'permission_document_mime_type',
        'permission_document_size_bytes',
        'approved_by',
        'approved_at',
        'status',
        'deleted_at',
    ] as $column) {
        expect(Schema::hasColumn('external_coaching_assignments', $column))->toBeTrue("Missing column: {$column}");
    }
});

test('external coaching assignment index requires permission', function (): void {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index'))
        ->assertForbidden();
});

test('admin can create update view and delete assignment with private permission document', function (): void {
    Storage::fake('local');

    $user = rcUser(
        'external-coaching-assignments.view',
        'external-coaching-assignments.create',
        'external-coaching-assignments.update',
        'external-coaching-assignments.delete',
    );
    $fixture = externalAssignmentFixture((int) $user->organization_id);
    $file = UploadedFile::fake()->create('permission.pdf', 128, 'application/pdf');

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
            'permission_document' => $file,
        ]))
        ->assertRedirect();

    $assignment = ExternalCoachingAssignment::query()->firstOrFail();

    expect($assignment->organization_id)->toBe($user->organization_id)
        ->and($assignment->approved_by)->toBe($user->id)
        ->and($assignment->approved_at)->not->toBeNull()
        ->and($assignment->permission_document_path)->not->toBeNull()
        ->and($assignment->permission_document_original_name)->toBe('permission.pdf');

    Storage::disk('local')->assertExists($assignment->permission_document_path);

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.show', $assignment))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('external-coaching-assignments/show')
            ->where('assignment.permission_document.name', 'permission.pdf')
            ->where('assignment.permission_document.original_name', 'permission.pdf')
            ->where('assignment.permission_document.preview_url', route('external-coaching-assignments.permission-document.preview', $assignment))
            ->where('assignment.permission_document.download_url', route('external-coaching-assignments.permission-document', $assignment)));

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.permission-document', $assignment))
        ->assertDownload('permission.pdf');

    $replacement = UploadedFile::fake()->create('permission-updated.pdf', 128, 'application/pdf');
    $oldPath = $assignment->permission_document_path;

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.update', $assignment), [
            '_method' => 'patch',
            ...externalAssignmentPayload([
                'member_id' => $fixture['member']->id,
                'external_coach_id' => $fixture['externalCoach']->id,
                'training_venue_id' => $fixture['trainingVenue']->id,
                'sport_id' => $fixture['sport']->id,
                'permission_document' => $replacement,
                'end_date' => '2026-10-31',
            ]),
        ])
        ->assertRedirect(route('external-coaching-assignments.show', $assignment));

    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($assignment->refresh()->permission_document_path);

    $this->actingAs($user)
        ->delete(route('external-coaching-assignments.destroy', $assignment))
        ->assertRedirect(route('external-coaching-assignments.index'));

    Storage::disk('local')->assertMissing($assignment->permission_document_path);
    $this->assertSoftDeleted($assignment);
    expect(AuditLog::query()
        ->where('entity', 'ExternalCoachingAssignment')
        ->where('entity_id', $assignment->id)
        ->whereIn('action', ['created', 'updated', 'deleted'])
        ->count())->toBe(3);
});

test('overlapping active assignments for same member and sport are rejected', function (): void {
    $user = rcUser('external-coaching-assignments.view', 'external-coaching-assignments.create');
    $fixture = externalAssignmentFixture((int) $user->organization_id);

    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['externalCoach']->id,
        'training_venue_id' => $fixture['trainingVenue']->id,
        'sport_id' => $fixture['sport']->id,
        'start_date' => '2026-07-15',
        'end_date' => '2026-08-15',
        'status' => 'active',
    ]);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
        ]))
        ->assertSessionHasErrors(['start_date']);
});

test('assignment update accepts post method spoofed put payload from file capable forms', function (): void {
    $user = rcUser('external-coaching-assignments.view', 'external-coaching-assignments.update');
    $fixture = externalAssignmentFixture((int) $user->organization_id);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['externalCoach']->id,
        'training_venue_id' => $fixture['trainingVenue']->id,
        'sport_id' => $fixture['sport']->id,
        'start_date' => '2026-07-01',
        'end_date' => '2026-09-30',
        'status' => 'draft',
    ]);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.update', $assignment), [
            '_method' => 'put',
            ...externalAssignmentPayload([
                'member_id' => $fixture['member']->id,
                'external_coach_id' => $fixture['externalCoach']->id,
                'training_venue_id' => $fixture['trainingVenue']->id,
                'sport_id' => $fixture['sport']->id,
                'start_date' => '2026-08-01',
                'end_date' => '2026-11-30',
                'status' => 'approved',
            ]),
        ])
        ->assertRedirect(route('external-coaching-assignments.show', $assignment))
        ->assertSessionHasNoErrors();

    expect($assignment->refresh())
        ->start_date->toDateString()->toBe('2026-08-01')
        ->end_date->toDateString()->toBe('2026-11-30')
        ->status->toBe('approved');
});

test('assignment requests normalize picker display dates before strict validation', function (): void {
    $user = rcUser(
        'external-coaching-assignments.view',
        'external-coaching-assignments.create',
        'external-coaching-assignments.update',
    );
    $fixture = externalAssignmentFixture((int) $user->organization_id);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
            'start_date' => '02/06/2026',
            'end_date' => '30/06/2026',
            'status' => 'draft',
        ]))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $assignment = ExternalCoachingAssignment::query()->latest('id')->firstOrFail();

    expect($assignment)
        ->start_date->toDateString()->toBe('2026-06-02')
        ->end_date->toDateString()->toBe('2026-06-30');

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.update', $assignment), [
            '_method' => 'put',
            ...externalAssignmentPayload([
                'member_id' => $fixture['member']->id,
                'external_coach_id' => $fixture['externalCoach']->id,
                'training_venue_id' => $fixture['trainingVenue']->id,
                'sport_id' => $fixture['sport']->id,
                'start_date' => '05/07/2026',
                'end_date' => '31/07/2026',
                'status' => 'draft',
            ]),
        ])
        ->assertRedirect(route('external-coaching-assignments.show', $assignment))
        ->assertSessionHasNoErrors();

    expect($assignment->refresh())
        ->start_date->toDateString()->toBe('2026-07-05')
        ->end_date->toDateString()->toBe('2026-07-31');
});

test('assignment requests normalize single-digit date display values', function (): void {
    $user = rcUser(
        'external-coaching-assignments.view',
        'external-coaching-assignments.create',
        'external-coaching-assignments.update',
    );
    $fixture = externalAssignmentFixture((int) $user->organization_id);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
            'start_date' => '2/6/2026',
            'end_date' => '3/7/2026',
            'status' => 'draft',
        ]))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $assignment = ExternalCoachingAssignment::query()->latest('id')->firstOrFail();

    expect($assignment)
        ->start_date->toDateString()->toBe('2026-06-02')
        ->end_date->toDateString()->toBe('2026-07-03');
});

test('assignment requests reject unsupported date formats', function (): void {
    $user = rcUser(
        'external-coaching-assignments.view',
        'external-coaching-assignments.create',
    );
    $fixture = externalAssignmentFixture((int) $user->organization_id);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
            'start_date' => '2026/06/02',
            'end_date' => '2026-07-03',
            'status' => 'draft',
        ]))
        ->assertSessionHasErrors(['start_date']);
});

test('assignment rejects inactive coach inactive venue and inactive member', function (): void {
    $user = rcUser('external-coaching-assignments.view', 'external-coaching-assignments.create');
    $fixture = externalAssignmentFixture((int) $user->organization_id);
    $fixture['member']->update(['current_status' => 'INACTIVE']);
    $fixture['externalCoach']->update(['status' => 'inactive']);
    $fixture['trainingVenue']->update(['status' => 'inactive']);

    $this->actingAs($user)
        ->post(route('external-coaching-assignments.store'), externalAssignmentPayload([
            'member_id' => $fixture['member']->id,
            'external_coach_id' => $fixture['externalCoach']->id,
            'training_venue_id' => $fixture['trainingVenue']->id,
            'sport_id' => $fixture['sport']->id,
        ]))
        ->assertSessionHasErrors(['member_id', 'external_coach_id', 'training_venue_id']);
});

test('assignment route binding does not expose another organization records', function (): void {
    $user = rcUser('external-coaching-assignments.view');
    $otherOrg = Organization::factory()->create();
    $fixture = externalAssignmentFixture($otherOrg->id);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $otherOrg->id,
        'member_id' => $fixture['member']->id,
        'external_coach_id' => $fixture['externalCoach']->id,
        'training_venue_id' => $fixture['trainingVenue']->id,
        'sport_id' => $fixture['sport']->id,
    ]);

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.show', $assignment))
        ->assertNotFound();
});

test('external coaching assignments index filters by status, member, coach, and start date range', function (): void {
    $user = rcUser('external-coaching-assignments.view');

    $assignmentA = createExternalAssignmentForFilterScenario((int) $user->organization_id, [
        'full_name' => 'Asha Runner',
        'pno' => 'PNO-1001',
    ], [
        'name' => 'Coach Alpha',
        'phone' => '+91-111-222-333',
    ], [
        'status' => 'active',
        'start_date' => '2026-06-01',
        'end_date' => '2026-07-31',
    ]);

    $assignmentB = createExternalAssignmentForFilterScenario((int) $user->organization_id, [
        'full_name' => 'Bharat Guard',
        'pno' => 'PNO-2002',
    ], [
        'name' => 'Coach Beta',
        'phone' => '+91-444-555-666',
    ], [
        'status' => 'paused',
        'start_date' => '2026-08-01',
        'end_date' => '2026-09-30',
    ]);

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index', ['filter' => ['status' => 'active']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('assignments.total', 1));

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index', ['filter' => ['member_query' => 'sha']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('assignments.total', 1)
            ->where('assignments.data.0.id', $assignmentA->id)
            ->where('filters.member_query', 'sha'));

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index', ['filter' => ['member_query' => '100']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('assignments.total', 1)
            ->where('assignments.data.0.id', $assignmentA->id));

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index', ['filter' => ['coach_query' => '111-222']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('assignments.total', 1)
            ->where('assignments.data.0.id', $assignmentA->id));

    $this->actingAs($user)
        ->get(route('external-coaching-assignments.index', ['filter' => [
            'start_date_from' => '2026-06-15',
            'start_date_to' => '2026-08-10',
        ]]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('assignments.total', 2));
});
