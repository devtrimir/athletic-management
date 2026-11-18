<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachDocument;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalCoachStatusHistory;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use App\Models\User;
use App\Services\FileCompressor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('external coaches table has the foundation columns', function () {
    expect(Schema::hasTable('external_coaches'))->toBeTrue();

    foreach ([
        'id',
        'organization_id',
        'name',
        'phone',
        'email',
        'password',
        'remarks',
        'status',
        'last_login_at',
        'remember_token',
        'deleted_at',
        'created_at',
        'updated_at',
    ] as $column) {
        expect(Schema::hasColumn('external_coaches', $column))->toBeTrue("Missing column: {$column}");
    }

    expect(Schema::hasTable('external_coach_status_histories'))->toBeTrue();
});

test('external coach guard authenticates external coaches separately from web users', function () {
    $organization = Organization::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'admin@example.test',
    ]);
    $externalCoach = ExternalCoach::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'coach@example.test',
    ]);

    expect(Auth::guard('web')->attempt([
        'email' => $externalCoach->email,
        'password' => 'password',
    ]))->toBeFalse();

    expect(Auth::guard('external_coach')->attempt([
        'email' => $externalCoach->email,
        'password' => 'password',
    ]))->toBeTrue();

    expect(Auth::guard('external_coach')->id())->toBe($externalCoach->id);

    Auth::guard('external_coach')->logout();

    expect(Auth::guard('external_coach')->attempt([
        'email' => $user->email,
        'password' => 'password',
    ]))->toBeFalse();
});

test('external coach model reports login eligibility from status', function () {
    expect(ExternalCoach::factory()->make(['status' => 'active'])->isActiveForLogin())->toBeTrue();
    expect(ExternalCoach::factory()->make(['status' => 'inactive'])->isActiveForLogin())->toBeFalse();
    expect(ExternalCoach::factory()->make(['status' => 'suspended'])->isActiveForLogin())->toBeFalse();
    expect(ExternalCoach::factory()->make(['status' => 'blacklisted'])->isActiveForLogin())->toBeFalse();
});

test('external coach login page is separate from admin login', function () {
    $this->get(route('external-coach.login'))
        ->assertRedirect(route('home', ['panel' => 'coach']));

    $this->get(route('home', ['panel' => 'coach']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('panel', 'coach'));
});

test('external coach protected pages redirect guests to external coach login', function () {
    $this->get(route('external-coach.dashboard'))
        ->assertRedirect(route('external-coach.login'));
});

test('external coach dashboard does not resolve internal rbac permissions', function () {
    $externalCoach = ExternalCoach::factory()->create(['status' => 'active']);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->where('auth.permissions', [])
            ->etc());
});

test('external coach dashboard lists assigned active athletes', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $member = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Assigned Player', 'current_status' => 'ACTIVE']);
    $otherMember = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Other Coach Player', 'current_status' => 'ACTIVE']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id, 'name' => 'Main Training Ground']);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'name' => 'Athletics']);

    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);
    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->has('assignments.data', 1)
            ->where('assignments.data.0.member.full_name', 'Assigned Player')
            ->where('assignments.data.0.training_venue.name', 'Main Training Ground')
            ->where('assignments.data.0.sport.name', 'Athletics')
            ->where('summary.active_assignments', 1)
            ->etc());
});

test('external coach dashboard paginates large assigned athlete lists', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id]);
    $sport = Sport::factory()->create(['organization_id' => $organization->id]);

    for ($index = 1; $index <= 12; $index++) {
        $member = Member::factory()->create([
            'organization_id' => $organization->id,
            'full_name' => "Assigned Athlete {$index}",
            'pno' => "PNO-{$index}",
            'current_status' => 'ACTIVE',
        ]);

        ExternalCoachingAssignment::factory()->create([
            'organization_id' => $organization->id,
            'member_id' => $member->id,
            'external_coach_id' => $externalCoach->id,
            'training_venue_id' => $venue->id,
            'sport_id' => $sport->id,
            'status' => 'active',
            'end_date' => today()->addDays($index),
        ]);
    }

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/dashboard')
            ->has('assignments.data', 10)
            ->where('assignments.total', 12)
            ->where('assignments.per_page', 10)
            ->where('summary.active_assignments', 12)
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('assignments.data', 2)
            ->where('assignments.current_page', 2)
            ->where('summary.active_assignments', 12)
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.dashboard', ['pno' => 'PNO-12']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('assignments.data', 1)
            ->where('assignments.data.0.member.pno', 'PNO-12')
            ->where('summary.active_assignments', 1)
            ->where('filters.pno', 'PNO-12')
            ->etc());
});

test('external coach can view assigned athlete profile and history only', function () {
    $organization = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $otherCoach = ExternalCoach::factory()->create(['organization_id' => $organization->id, 'status' => 'active']);
    $member = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Assigned Athlete', 'current_status' => 'ACTIVE']);
    $otherMember = Member::factory()->create(['organization_id' => $organization->id, 'full_name' => 'Other Athlete', 'current_status' => 'ACTIVE']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $organization->id, 'name' => 'Training Hall']);
    $sport = Sport::factory()->create(['organization_id' => $organization->id, 'name' => 'Boxing']);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);
    $otherAssignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $organization->id,
        'member_id' => $otherMember->id,
        'external_coach_id' => $otherCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
    ]);

    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'attendance_date' => now()->toDateString(),
        'attendance_status' => 'present',
        'review_status' => 'corrected',
        'review_remarks' => 'Corrected after admin verification.',
        'reviewed_at' => now(),
    ]);
    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'training_venue_id' => $venue->id,
        'attendance_date' => now()->subMonthNoOverflow()->toDateString(),
        'attendance_status' => 'absent',
        'review_status' => 'accepted',
    ]);
    ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'sport_id' => $sport->id,
        'update_date' => now()->toDateString(),
        'training_summary' => 'Footwork improved.',
    ]);
    ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $organization->id,
        'external_coaching_assignment_id' => $assignment->id,
        'member_id' => $member->id,
        'external_coach_id' => $externalCoach->id,
        'sport_id' => $sport->id,
        'update_date' => now()->subMonthNoOverflow()->toDateString(),
        'training_summary' => 'Strength improved.',
    ]);

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.show', $member))
        ->assertRedirect(route('external-coach.athletes.attendance', $member));

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.attendance', $member))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/athletes/show')
            ->where('activeTab', 'attendance')
            ->where('athlete.full_name', 'Assigned Athlete')
            ->missing('athlete.member_code')
            ->has('assignments', 1)
            ->where('assignments.0.training_venue.name', 'Training Hall')
            ->where('tabCounts.attendance', 2)
            ->where('tabCounts.performance', 2)
            ->where('attendanceFilters.month', now()->format('Y-m'))
            ->has('attendances', 1)
            ->where('attendances.0.attendance_status', 'present')
            ->where('attendances.0.review_status', 'corrected')
            ->where('attendances.0.review_remarks', 'Corrected after admin verification.')
            ->missing('performanceUpdates')
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.performance', $member))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/athletes/show')
            ->where('activeTab', 'performance')
            ->where('athlete.full_name', 'Assigned Athlete')
            ->has('assignments', 1)
            ->where('tabCounts.attendance', 2)
            ->where('tabCounts.performance', 2)
            ->where('performanceFilters.month', now()->format('Y-m'))
            ->missing('attendances')
            ->has('performanceUpdates', 1)
            ->where('performanceUpdates.0.training_summary', 'Footwork improved.')
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.performance', [
            'member' => $member,
            'month' => now()->subMonthNoOverflow()->format('Y-m'),
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/athletes/show')
            ->where('activeTab', 'performance')
            ->where('performanceFilters.month', now()->subMonthNoOverflow()->format('Y-m'))
            ->has('performanceUpdates', 1)
            ->where('performanceUpdates.0.training_summary', 'Strength improved.')
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.attendance', [
            'member' => $member,
            'month' => now()->subMonthNoOverflow()->format('Y-m'),
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coach/athletes/show')
            ->where('activeTab', 'attendance')
            ->where('attendanceFilters.month', now()->subMonthNoOverflow()->format('Y-m'))
            ->has('attendances', 1)
            ->where('attendances.0.attendance_status', 'absent')
            ->etc());

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.attendance', $otherAssignment->member_id))
        ->assertNotFound();

    $this->actingAs($externalCoach, 'external_coach')
        ->get(route('external-coach.athletes.performance', $otherAssignment->member_id))
        ->assertNotFound();
});

test('external coach admin routes require permission', function () {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('external-coaches.index'))
        ->assertForbidden();
});

test('external coaches index can be filtered and paginated', function () {
    $user = rcUser('external-coaches.view');

    ExternalCoach::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Asha Sprint Coach',
        'email' => 'asha.sprint@example.test',
        'status' => 'active',
    ]);
    ExternalCoach::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Inactive Swimming Coach',
        'email' => 'swim.coach@example.test',
        'status' => 'inactive',
    ]);
    ExternalCoach::factory()->create([
        'name' => 'Other Organization Coach',
        'email' => 'other.org.coach@example.test',
        'status' => 'active',
    ]);

    $this->actingAs($user)
        ->get(route('external-coaches.index', [
            'filter' => [
                'q' => 'asha',
                'status' => 'active',
            ],
            'per_page' => 10,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('external-coaches/index')
            ->where('filters.q', 'asha')
            ->where('filters.status', 'active')
            ->where('perPage', 10)
            ->where('externalCoaches.total', 1)
            ->where('externalCoaches.data.0.name', 'Asha Sprint Coach')
            ->where('statuses', ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'])
            ->etc());
});

test('external coach phone must be a valid indian mobile number', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'Invalid Phone Coach',
            'phone' => '1234567890',
            'email' => 'invalid.phone.coach@example.test',
            'password' => 'password',
            'status' => 'active',
        ])
        ->assertSessionHasErrors('phone');

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'Valid Phone Coach',
            'phone' => '+91 98765 43210',
            'email' => 'valid.phone.coach@example.test',
            'password' => 'password',
            'status' => 'active',
        ])
        ->assertRedirect();

    expect(ExternalCoach::query()->where('email', 'valid.phone.coach@example.test')->value('phone'))
        ->toBe('9876543210');
});

test('admin can create update and delete external coaches with status history', function () {
    $user = rcUser(
        'external-coaches.view',
        'external-coaches.create',
        'external-coaches.update',
        'external-coaches.manageStatus',
        'external-coaches.delete',
    );

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'Private Coach',
            'phone' => '9876543210',
            'email' => 'private.coach@example.test',
            'password' => 'password',
            'status' => 'active',
            'remarks' => 'Works with sprint athletes.',
        ])
        ->assertRedirect();

    $externalCoach = ExternalCoach::query()->where('email', 'private.coach@example.test')->firstOrFail();

    expect($externalCoach->organization_id)->toBe($user->organization_id)
        ->and($externalCoach->created_by)->toBe($user->id)
        ->and($externalCoach->statusHistory()->count())->toBe(1);

    $this->actingAs($user)
        ->patch(route('external-coaches.update', $externalCoach), [
            'name' => 'Private Coach Updated',
            'phone' => '9876543210',
            'email' => 'private.coach@example.test',
            'password' => '',
            'status' => 'suspended',
            'status_reason' => 'Repeated missing reports.',
        ])
        ->assertRedirect(route('external-coaches.show', $externalCoach));

    expect($externalCoach->refresh()->status)->toBe('suspended')
        ->and($externalCoach->statusHistory()->count())->toBe(2)
        ->and(ExternalCoachStatusHistory::query()->latest('id')->first()?->reason)->toBe('Repeated missing reports.');

    $this->actingAs($user)
        ->delete(route('external-coaches.destroy', $externalCoach))
        ->assertRedirect(route('external-coaches.index'));

    $this->assertSoftDeleted($externalCoach);
    expect(AuditLog::query()
        ->where('entity', 'ExternalCoach')
        ->where('entity_id', $externalCoach->id)
        ->whereIn('action', ['created', 'updated', 'deleted'])
        ->count())->toBe(3);
});

test('suspending or blacklisting an external coach requires a reason', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'No Reason Coach',
            'email' => 'no.reason@example.test',
            'password' => 'password',
            'status' => 'blacklisted',
        ])
        ->assertSessionHasErrors(['status_reason']);
});

test('external coach route binding does not expose other organization records', function () {
    $user = rcUser('external-coaches.view');
    $otherOrg = Organization::factory()->create();
    $externalCoach = ExternalCoach::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->get(route('external-coaches.show', $externalCoach))
        ->assertNotFound();
});

test('external coaches can login only through the external coach portal', function () {
    $externalCoach = ExternalCoach::factory()->create([
        'email' => 'portal.coach@example.test',
        'status' => 'active',
    ]);

    $this->post(route('external-coach.login.store'), [
        'email' => $externalCoach->email,
        'password' => 'password',
    ])
        ->assertRedirect(route('external-coach.dashboard'));

    $this->assertAuthenticatedAs($externalCoach, 'external_coach');
    $this->assertGuest('web');

    $this->post(route('external-coach.logout'))
        ->assertRedirect(route('home'));

    $this->assertGuest('external_coach');
});

test('a stale admin url never hijacks the coach login redirect', function () {
    $externalCoach = ExternalCoach::factory()->create(['email' => 'stale.coach@example.test', 'status' => 'active']);

    $this->withSession(['url.intended' => url('/members')])
        ->post(route('external-coach.login.store'), ['email' => $externalCoach->email, 'password' => 'password'])
        ->assertRedirect(route('external-coach.dashboard'));
});

test('a deactivated coach with an open session lands on the welcome page with the reason shown', function () {
    $externalCoach = ExternalCoach::factory()->create(['status' => 'active']);

    $this->actingAs($externalCoach, 'external_coach');
    $externalCoach->update(['status' => 'inactive']);

    $this->get(route('external-coach.dashboard'))
        ->assertRedirect(route('external-coach.login'));

    $this->followingRedirects()
        ->get(route('external-coach.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('welcome'));
});

test('inactive external coaches cannot login', function () {
    $externalCoach = ExternalCoach::factory()->inactive()->create([
        'email' => 'inactive.coach@example.test',
    ]);

    $this->post(route('external-coach.login.store'), [
        'email' => $externalCoach->email,
        'password' => 'password',
    ])
        ->assertSessionHasErrors(['email']);

    $this->assertGuest('external_coach');
});

test('external coach profile saves photo, sports, venues and documents', function () {
    Storage::fake('public');
    Storage::fake('local');

    $user = rcUser('external-coaches.view', 'external-coaches.create', 'external-coaches.update');
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $venue = TrainingVenue::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'Photo Coach',
            'email' => 'photo.coach@example.test',
            'password' => 'password',
            'status' => 'active',
            'photo' => UploadedFile::fake()->image('me.jpg'),
            'sport_ids' => [$sport->id],
            'training_venue_ids' => [$venue->id],
            'documents' => [['type' => 'aadhaar', 'file' => UploadedFile::fake()->create('aadhaar.pdf', 100, 'application/pdf')]],
        ])
        ->assertSessionHasNoErrors();

    $coach = ExternalCoach::query()->where('email', 'photo.coach@example.test')->firstOrFail();

    Storage::disk('public')->assertExists($coach->photo_path);
    expect($coach->sports()->pluck('sports.id')->all())->toBe([$sport->id])
        ->and($coach->trainingVenues()->pluck('training_venues.id')->all())->toBe([$venue->id])
        ->and($coach->documents)->toHaveCount(1);

    $document = $coach->documents->first();
    Storage::disk('local')->assertExists($document->path);

    $this->actingAs($user)
        ->get(route('external-coaches.documents.show', [$coach, $document]))
        ->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private');

    $this->actingAs($user)
        ->get(route('external-coaches.documents.show', [$coach, $document, 'download' => 1]))
        ->assertDownload('aadhaar.pdf');

    expect(AuditLog::query()->where('entity', 'ExternalCoach')->where('entity_id', $coach->id)->pluck('action')->all())
        ->toContain('document_uploaded', 'document_viewed', 'document_downloaded');

    // Clearing: empty selections and remove_photo detach/clear everything.
    $this->actingAs($user)
        ->patch(route('external-coaches.update', $coach), [
            'name' => 'Photo Coach',
            'email' => 'photo.coach@example.test',
            'status' => 'active',
            'remove_photo' => '1',
        ])
        ->assertSessionHasNoErrors();

    expect($coach->refresh()->photo_path)->toBeNull()
        ->and($coach->sports()->count())->toBe(0)
        ->and($coach->trainingVenues()->count())->toBe(0);

    $this->actingAs($user)
        ->delete(route('external-coaches.documents.destroy', [$coach, $document]))
        ->assertRedirect();

    expect($coach->documents()->count())->toBe(0)
        ->and(AuditLog::query()->where('entity_id', $coach->id)->where('action', 'document_deleted')->exists())->toBeTrue();
    Storage::disk('local')->assertMissing($document->path);
});

test('external coach sports must belong to the same organization', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');
    $foreignSport = Sport::factory()->create(['organization_id' => Organization::factory()->create()->id]);

    $this->actingAs($user)
        ->post(route('external-coaches.store'), [
            'name' => 'X',
            'email' => 'x.coach@example.test',
            'password' => 'password',
            'status' => 'active',
            'sport_ids' => [$foreignSport->id],
        ])
        ->assertSessionHasErrors('sport_ids.0');
});

test('file compressor shrinks oversized images in place and skips unknown files', function () {
    Storage::fake('local');

    $image = new Imagick;
    $image->newPseudoImage(3000, 2000, 'gradient:red-blue');
    $image->setImageFormat('png');
    Storage::disk('local')->put('t/big.png', $image->getImagesBlob());
    Storage::disk('local')->put('t/note.txt', 'hello');
    $before = Storage::disk('local')->size('t/big.png');

    $compressor = app(FileCompressor::class);

    expect($compressor->compressInPlace('local', 't/big.png'))->toBeGreaterThan(0)
        ->and(Storage::disk('local')->size('t/big.png'))->toBeLessThan($before)
        ->and(getimagesize(Storage::disk('local')->path('t/big.png'))[0])->toBe(2000)
        ->and($compressor->compressInPlace('local', 't/note.txt'))->toBe(0)
        ->and($compressor->compressInPlace('local', 't/missing.pdf'))->toBe(0);
});

test('external coach assignments page filters by activity and player search', function () {
    $user = rcUser('external-coaches.view');
    $org = $user->organization_id;
    $coach = ExternalCoach::factory()->create(['organization_id' => $org]);
    $running = Member::factory()->create(['organization_id' => $org, 'full_name' => 'Running Rina']);
    $ended = Member::factory()->create(['organization_id' => $org, 'full_name' => 'Ended Esha']);

    $make = fn (Member $member, string $start, string $end) => ExternalCoachingAssignment::factory()->create([
        'organization_id' => $org,
        'external_coach_id' => $coach->id,
        'member_id' => $member->id,
        'status' => 'active',
        'start_date' => $start,
        'end_date' => $end,
    ]);
    $make($running, now()->subWeek()->toDateString(), now()->addMonth()->toDateString());
    $make($ended, now()->subMonths(2)->toDateString(), now()->subMonth()->toDateString());

    $names = fn (array $query) => collect(
        $this->actingAs($user)
            ->get(route('external-coaches.assignments', [$coach, ...$query]))
            ->assertOk()
            ->viewData('page')['props']['assignments']['data'],
    )->pluck('member.full_name')->all();

    expect($names([]))->toHaveCount(2)
        ->and($names(['active' => 'active']))->toBe(['Running Rina'])
        ->and($names(['active' => 'inactive']))->toBe(['Ended Esha'])
        ->and($names(['search' => 'esha']))->toBe(['Ended Esha']);

    $this->actingAs($user)
        ->get(route('external-coaches.assignments', $coach))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeAssignmentsCount', 1)
            ->where('activeAssignmentMemberIds', [$running->id]));

    $this->actingAs($user)
        ->get(route('external-coaches.player-assignments', [$coach, $running, 'month' => now()->format('Y-m')]))
        ->assertOk();
});

test('a combined document must be a pdf', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');
    $payload = fn (string $type, UploadedFile $file) => [
        'name' => 'C',
        'email' => 'combined.coach@example.test',
        'password' => 'password',
        'status' => 'active',
        'documents' => [['type' => $type, 'file' => $file]],
    ];

    $this->actingAs($user)
        ->post(route('external-coaches.store'), $payload('combined', UploadedFile::fake()->image('scan.jpg')))
        ->assertSessionHasErrors('documents.0.file');

    $this->actingAs($user)
        ->post(route('external-coaches.store'), $payload('combined', UploadedFile::fake()->create('all.pdf', 100, 'application/pdf')))
        ->assertSessionHasNoErrors();
});

test('external coach edit and show pages expose the document mime type for the viewer', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.update');
    $coach = ExternalCoach::factory()->create(['organization_id' => $user->organization_id]);
    ExternalCoachDocument::factory()->create(['external_coach_id' => $coach->id]);

    foreach (['external-coaches.show', 'external-coaches.edit'] as $route) {
        $this->actingAs($user)->get(route($route, $coach))
            ->assertInertia(fn (Assert $page) => $page->where('externalCoach.documents.0.mime_type', 'application/pdf'));
    }
});

test('external coaching dates serialize as plain dates so IST does not shift the day', function () {
    $assignment = ExternalCoachingAssignment::factory()->create([
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-30',
    ]);

    expect($assignment->toArray())->toMatchArray(['start_date' => '2026-11-01', 'end_date' => '2026-11-30']);
});

test('external coaches index includes each coach sports and photo path', function () {
    $user = rcUser('external-coaches.view');
    $coach = ExternalCoach::factory()->create(['organization_id' => $user->organization_id, 'photo_path' => 'external-coach-photos/1/x.jpg']);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Archery']);
    $coach->sports()->attach($sport);
    $coach->trainingVenues()->attach(TrainingVenue::factory()->create(['organization_id' => $user->organization_id, 'name' => 'Main Ground']));

    $this->actingAs($user)->get(route('external-coaches.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('externalCoaches.data.0.sports.0.name', 'Archery')
            ->where('externalCoaches.data.0.training_venues.0.name', 'Main Ground')
            ->where('externalCoaches.data.0.photo_path', 'external-coach-photos/1/x.jpg'));
});

test('external coach print page honors permission, filters and selected ids', function () {
    $user = rcUser('external-coaches.view', 'coaches.print');
    $org = $user->organization_id;
    $active = ExternalCoach::factory()->create(['organization_id' => $org, 'name' => 'Active Coach', 'status' => 'active']);
    $inactive = ExternalCoach::factory()->create(['organization_id' => $org, 'name' => 'Inactive Coach', 'status' => 'inactive']);
    ExternalCoach::factory()->create(['name' => 'Other Org Coach']);

    $names = fn (array $query) => collect(
        $this->actingAs($user)->get(route('external-coaches.print', $query))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('external-coaches/print'))
            ->viewData('page')['props']['coaches'],
    )->pluck('name')->all();

    expect($names([]))->toBe(['Active Coach', 'Inactive Coach'])
        ->and($names(['filter' => ['status' => 'inactive']]))->toBe(['Inactive Coach'])
        ->and($names(['ids' => [$active->id]]))->toBe(['Active Coach']);

    $this->actingAs(rcUser('external-coaches.view'))->get(route('external-coaches.print'))->assertForbidden();
});
