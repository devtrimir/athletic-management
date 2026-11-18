<?php

declare(strict_types=1);

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

function securityFixture(): array
{
    $org = Organization::factory()->create();
    $coach = ExternalCoach::factory()->create(['organization_id' => $org->id, 'status' => 'active', 'email' => 'sec.coach@example.test']);
    $other = ExternalCoach::factory()->create(['organization_id' => $org->id, 'status' => 'active']);
    $venue = TrainingVenue::factory()->create(['organization_id' => $org->id, 'latitude' => 26.8467, 'longitude' => 80.9462, 'allowed_radius_meters' => 200]);
    $sport = Sport::factory()->create(['organization_id' => $org->id, 'is_active' => true]);
    $make = function (ExternalCoach $owner, array $overrides = []) use ($org, $venue, $sport): ExternalCoachingAssignment {
        $member = Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'ACTIVE']);

        return ExternalCoachingAssignment::factory()->create([
            'organization_id' => $org->id,
            'member_id' => $member->id,
            'external_coach_id' => $owner->id,
            'training_venue_id' => $venue->id,
            'sport_id' => $sport->id,
            'start_date' => today()->subDays(10),
            'end_date' => today()->addDays(10),
            'status' => 'active',
            ...$overrides,
        ]);
    };

    return [
        'org' => $org, 'coach' => $coach, 'other' => $other,
        'mine' => $make($coach), 'theirs' => $make($other),
        'make' => $make,
    ];
}

function attendancePost(array $overrides = []): array
{
    return ['attendance_date' => today()->toDateString(), 'attendance_status' => 'absent', ...$overrides];
}

function rowCount(string $model): int
{
    return $model::withoutGlobalScope(BelongsToOrganization::class)->count();
}

// ─── Client-controlled dates ─────────────────────────────────────────────────

dataset('tampered dates', [
    'yesterday' => fn () => today()->subDay()->toDateString(),
    'tomorrow' => fn () => today()->addDay()->toDateString(),
    'a year ago' => fn () => today()->subYear()->toDateString(),
    'a year ahead' => fn () => today()->addYear()->toDateString(),
    'not a date' => fn () => 'not-a-date',
    'sql-ish' => fn () => "2026-11-18' OR '1'='1",
    'empty' => fn () => '',
    'array' => fn () => ['2026-11-18'],
    'datetime far' => fn () => '1999-01-01 00:00:00',
]);

it('rejects any attendance date other than today, whatever the browser sends', function (mixed $date): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'attendance_date' => $date,
        ]))
        ->assertSessionHasErrors('attendance_date');

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
})->with('tampered dates');

it('rejects any performance update date other than today', function (mixed $date): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['mine']->id,
            'update_date' => $date,
            'training_summary' => 'x',
        ])
        ->assertSessionHasErrors('update_date');

    expect(rowCount(ExternalCoachPerformanceUpdate::class))->toBe(0);
})->with('tampered dates');

it('stores the server clock, not a client claim, as the submission time', function (): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'submitted_at' => '2020-01-01 00:00:00',
            'browser_timezone' => 'Pacific/Kiritimati',
        ]))
        ->assertSessionHasNoErrors();

    $row = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($row->submitted_at->isToday())->toBeTrue()
        ->and($row->attendance_date->toDateString())->toBe(today()->toDateString());
});

it('rejects a date outside the assignment window even when it is today', function (): void {
    $f = securityFixture();
    $ended = $f['make']($f['coach'], ['start_date' => today()->subDays(20), 'end_date' => today()->subDay()]);
    $notStarted = $f['make']($f['coach'], ['start_date' => today()->addDay(), 'end_date' => today()->addDays(9)]);

    foreach ([$ended, $notStarted] as $assignment) {
        $this->actingAs($f['coach'], 'external_coach')
            ->post(route('external-coach.attendance.store'), attendancePost(['external_coaching_assignment_id' => $assignment->id]))
            ->assertSessionHasErrors('attendance_date');
    }

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
});

// ─── Other tampering ─────────────────────────────────────────────────────────

dataset('bad statuses', ['not_marked', 'PRESENT', 'present;--', '', 'Present ', [['present']]]);

it('rejects attendance statuses outside the allowed list', function (mixed $status): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'attendance_status' => $status,
        ]))
        ->assertSessionHasErrors('attendance_status');

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
})->with('bad statuses');

it('cannot submit against another coach\'s, a missing or a malformed assignment', function (): void {
    $f = securityFixture();

    foreach ([$f['theirs']->id, 999999, 0, 'abc', [1]] as $id) {
        $response = $this->actingAs($f['coach'], 'external_coach')
            ->post(route('external-coach.attendance.store'), attendancePost(['external_coaching_assignment_id' => $id]));

        expect($response->status())->toBeIn([302, 403, 404, 422]);
    }

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost(['external_coaching_assignment_id' => $f['theirs']->id]))
        ->assertForbidden();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['theirs']->id,
            'update_date' => today()->toDateString(),
            'training_summary' => 'x',
        ])
        ->assertForbidden();

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0)
        ->and(rowCount(ExternalCoachPerformanceUpdate::class))->toBe(0);
});

it('ignores every server-controlled field a coach tries to inject', function (): void {
    $f = securityFixture();
    $victim = Member::factory()->create(['organization_id' => $f['org']->id]);
    $otherOrg = Organization::factory()->create();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'review_status' => 'accepted',
            'corrected_attendance_status' => 'present',
            'reviewed_by' => 1,
            'reviewed_at' => now()->toDateTimeString(),
            'review_remarks' => 'pre-approved',
            'geo_status' => 'valid',
            'flag_reason' => null,
            'distance_from_venue_meters' => 0,
            'member_id' => $victim->id,
            'external_coach_id' => $f['other']->id,
            'organization_id' => $otherOrg->id,
            'training_venue_id' => 999,
            'ip_address' => '10.0.0.1',
            'submitted_source' => 'admin_panel',
            'deleted_at' => now()->toDateTimeString(),
        ]))
        ->assertSessionHasNoErrors();

    $row = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($row->review_status)->toBe('pending')
        ->and($row->corrected_attendance_status)->toBeNull()
        ->and($row->reviewed_by)->toBeNull()
        ->and($row->review_remarks)->toBeNull()
        ->and($row->geo_status)->not->toBe('valid')
        ->and($row->member_id)->toBe($f['mine']->member_id)
        ->and($row->external_coach_id)->toBe($f['coach']->id)
        ->and($row->organization_id)->toBe($f['org']->id)
        ->and($row->training_venue_id)->toBe($f['mine']->training_venue_id)
        ->and($row->ip_address)->not->toBe('10.0.0.1')
        ->and($row->submitted_source)->toBe('external_coach_portal')
        ->and($row->deleted_at)->toBeNull();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['mine']->id,
            'update_date' => today()->toDateString(),
            'training_summary' => 'x',
            'review_status' => 'accepted',
            'reviewed_by' => 1,
            'member_id' => $victim->id,
            'external_coach_id' => $f['other']->id,
            'organization_id' => $otherOrg->id,
            'sport_id' => 999,
        ])
        ->assertSessionHasNoErrors();

    $update = ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($update->review_status)->toBe('pending')
        ->and($update->reviewed_by)->toBeNull()
        ->and($update->member_id)->toBe($f['mine']->member_id)
        ->and($update->external_coach_id)->toBe($f['coach']->id)
        ->and($update->organization_id)->toBe($f['org']->id)
        ->and($update->sport_id)->toBe($f['mine']->sport_id);
});

it('flags a faked location far from the venue instead of trusting it', function (): void {
    Storage::fake('local');
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'attendance_status' => 'present',
            'submitted_photo' => UploadedFile::fake()->image('p.jpg'),
            'submitted_latitude' => 10.0,
            'submitted_longitude' => 10.0,
            'submitted_gps_accuracy' => 5,
        ]))
        ->assertSessionHasNoErrors();

    $row = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    expect($row->geo_status)->toBe('outside_radius')
        ->and((float) $row->distance_from_venue_meters)->toBeGreaterThan(1000);
});

dataset('bad coordinates', [
    'latitude too high' => [['submitted_latitude' => 91]],
    'latitude low' => [['submitted_latitude' => -91]],
    'longitude too high' => [['submitted_longitude' => 181]],
    'longitude not numeric' => [['submitted_longitude' => 'east']],
    'negative accuracy' => [['submitted_gps_accuracy' => -1]],
    'huge accuracy' => [['submitted_gps_accuracy' => 10_000_000]],
]);

it('rejects impossible coordinates and accuracy', function (array $extra): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost(['external_coaching_assignment_id' => $f['mine']->id, ...$extra]))
        ->assertSessionHasErrors();

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
})->with('bad coordinates');

it('rejects oversized free-text and device payloads', function (): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'coach_remarks' => str_repeat('a', 2001),
        ]))
        ->assertSessionHasErrors('coach_remarks');

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost([
            'external_coaching_assignment_id' => $f['mine']->id,
            'device_info' => array_fill(0, 500, str_repeat('x', 500)),
        ]))
        ->assertSessionHasErrors('device_info');

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
});

// ─── Uploads ─────────────────────────────────────────────────────────────────

it('only accepts real images as proof and keeps them on the private disk', function (): void {
    Storage::fake('local');
    Storage::fake('public');
    $f = securityFixture();
    $base = attendancePost(['external_coaching_assignment_id' => $f['mine']->id, 'attendance_status' => 'present']);

    $real = function (string $name, string $content, string $mime = 'image/jpeg'): UploadedFile {
        $path = tempnam(sys_get_temp_dir(), 'up');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, $mime, null, true);
    };
    // Real files, so the server sniffs content instead of trusting name or client mime.
    $php = $real('shell.jpg', '<?php system($_GET["c"]); ?>');
    $svg = $real('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/svg+xml');
    $svgAsPng = $real('x.png', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/png');
    $doubleExt = $real('proof.php.jpg', '<?php echo 1;');
    $html = $real('a.jpg', '<html><script>1</script></html>');
    $big = UploadedFile::fake()->image('big.jpg')->size(10241);
    $pdf = UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf');

    foreach ([$php, $svg, $svgAsPng, $doubleExt, $html, $big, $pdf] as $file) {
        $this->actingAs($f['coach'], 'external_coach')
            ->post(route('external-coach.attendance.store'), [...$base, 'submitted_photo' => $file])
            ->assertSessionHasErrors('submitted_photo');
    }

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), $base)
        ->assertSessionHasErrors('submitted_photo');

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.attendance.store'), [...$base, 'submitted_photo' => UploadedFile::fake()->image('ok.png')])
        ->assertSessionHasNoErrors();

    $row = ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail();

    Storage::disk('local')->assertExists($row->submitted_photo_path);
    expect(Storage::disk('public')->allFiles())->toBe([])
        ->and($row->submitted_photo_path)->not->toContain('..');
});

// ─── Duplicates and races ────────────────────────────────────────────────────

it('answers a duplicate submission with a validation error, even when the check races the unique index', function (): void {
    $f = securityFixture();
    $payload = attendancePost(['external_coaching_assignment_id' => $f['mine']->id]);

    $this->actingAs($f['coach'], 'external_coach')->post(route('external-coach.attendance.store'), $payload)->assertSessionHasNoErrors();
    $this->actingAs($f['coach'], 'external_coach')->post(route('external-coach.attendance.store'), $payload)->assertSessionHasErrors('attendance_date');

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(1);
});

// ─── Performance validation ──────────────────────────────────────────────────

dataset('bad performance fields', [
    'score 0' => [['performance_score' => 0]],
    'score 11' => [['performance_score' => 11]],
    'score text' => [['performance_score' => 'ten']],
    'level unknown' => [['performance_level' => 'godlike']],
    'summary empty' => [['training_summary' => '']],
    'summary too long' => [['training_summary' => str_repeat('a', 3001)]],
    'notes too long' => [['improvement_notes' => str_repeat('a', 3001)]],
    'summary array' => [['training_summary' => ['x']]],
]);

it('validates performance updates strictly', function (array $extra): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['mine']->id,
            'update_date' => today()->toDateString(),
            'training_summary' => 'ok',
            ...$extra,
        ])
        ->assertSessionHasErrors();

    expect(rowCount(ExternalCoachPerformanceUpdate::class))->toBe(0);
})->with('bad performance fields');

it('stores script-like text inertly (output is escaped by the client, never executed server-side)', function (): void {
    $f = securityFixture();
    $text = '<script>alert(1)</script> {{ 7*7 }} \' OR 1=1 --';

    $this->actingAs($f['coach'], 'external_coach')
        ->post(route('external-coach.performance.store'), [
            'external_coaching_assignment_id' => $f['mine']->id,
            'update_date' => today()->toDateString(),
            'training_summary' => $text,
        ])
        ->assertSessionHasNoErrors();

    expect(ExternalCoachPerformanceUpdate::withoutGlobalScope(BelongsToOrganization::class)->firstOrFail()->training_summary)->toBe($text);
});

// ─── Access control ──────────────────────────────────────────────────────────

it('only shows a coach athletes they actively coach', function (): void {
    $f = securityFixture();
    $inactive = $f['make']($f['coach'], ['status' => 'completed']);
    $otherOrgMember = Member::factory()->create(['organization_id' => Organization::factory()->create()->id]);

    foreach (['show', 'attendance', 'performance'] as $page) {
        $mine = $this->actingAs($f['coach'], 'external_coach')->get(route("external-coach.athletes.{$page}", $f['mine']->member_id));
        expect($mine->status())->toBeIn([200, 302]);

        foreach ([$f['theirs']->member_id, $inactive->member_id, $otherOrgMember->id, 999999] as $memberId) {
            $this->actingAs($f['coach'], 'external_coach')->get(route("external-coach.athletes.{$page}", $memberId))->assertNotFound();
        }
    }

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.athletes.attendance', ['member' => $f['mine']->member_id, 'month' => "2026-11' OR 1=1"]))
        ->assertSessionHasErrors('month');
});

it('never leaks another coach\'s records through the athlete pages', function (): void {
    $f = securityFixture();
    ExternalTrainingAttendance::factory()->create([
        'organization_id' => $f['org']->id,
        'external_coaching_assignment_id' => $f['theirs']->id,
        'member_id' => $f['theirs']->member_id,
        'external_coach_id' => $f['other']->id,
        'training_venue_id' => $f['theirs']->training_venue_id,
        'attendance_date' => today(),
        'coach_remarks' => 'SECRET-OTHER-COACH',
    ]);

    $this->actingAs($f['coach'], 'external_coach')
        ->get(route('external-coach.dashboard'))
        ->assertOk()
        ->assertDontSee('SECRET-OTHER-COACH');
});

it('keeps coaches out of every admin route and admin users out of coach routes', function (): void {
    $f = securityFixture();
    $attendance = ExternalTrainingAttendance::factory()->create([
        'organization_id' => $f['org']->id,
        'external_coaching_assignment_id' => $f['mine']->id,
        'member_id' => $f['mine']->member_id,
        'external_coach_id' => $f['coach']->id,
        'training_venue_id' => $f['mine']->training_venue_id,
        'review_status' => 'pending',
        'submitted_photo_path' => 'external-training-attendance/x.jpg',
    ]);
    $update = ExternalCoachPerformanceUpdate::factory()->create([
        'organization_id' => $f['org']->id,
        'external_coaching_assignment_id' => $f['mine']->id,
        'member_id' => $f['mine']->member_id,
        'external_coach_id' => $f['coach']->id,
        'sport_id' => $f['mine']->sport_id,
        'review_status' => 'pending',
    ]);

    // A coach session only authenticates the coach guard; the web guard stays the default.
    $asCoach = function () use ($f) {
        $this->be($f['coach'], 'external_coach');
        Auth::shouldUse('web');

        return $this;
    };

    foreach ([
        ['get', route('external-training-attendances.index')],
        ['get', route('external-training-attendances.show', $attendance)],
        ['get', route('external-training-attendances.photo', $attendance)],
        ['get', route('external-coach-performance-updates.index')],
        ['get', route('external-coaches.index')],
        ['get', route('external-coaching-assignments.index')],
        ['get', route('training-venues.index')],
        ['get', route('audit-logs.index')],
    ] as [$method, $url]) {
        expect($asCoach()->{$method}($url)->status())->toBeIn([302, 401, 403], "{$method} {$url}");
    }

    $asCoach()->patch(route('external-training-attendances.review', $attendance), ['action' => 'accept', 'review_remarks' => 'self-approve'])->assertRedirect();
    $asCoach()->patch(route('external-coach-performance-updates.review', $update), ['action' => 'accept'])->assertRedirect();

    expect($attendance->fresh()->review_status)->toBe('pending')
        ->and($update->fresh()->review_status)->toBe('pending');

    // The coach portal also refuses a signed-in admin.
    auth()->forgetGuards();
    $this->actingAs(User::factory()->create())
        ->get(route('external-coach.dashboard'))
        ->assertRedirect(route('external-coach.login'));
});

it('exposes no way for a coach to edit or delete what was submitted', function (): void {
    $f = securityFixture();
    $attendance = ExternalTrainingAttendance::factory()->create([
        'organization_id' => $f['org']->id,
        'external_coaching_assignment_id' => $f['mine']->id,
        'member_id' => $f['mine']->member_id,
        'external_coach_id' => $f['coach']->id,
        'training_venue_id' => $f['mine']->training_venue_id,
    ]);

    foreach (['put', 'patch', 'delete'] as $verb) {
        foreach (["/external-coach/attendance/{$attendance->id}", '/external-coach/attendance', "/external-coach/performance/{$attendance->id}"] as $url) {
            expect($this->actingAs($f['coach'], 'external_coach')->{$verb}($url)->status())->toBeIn([404, 405]);
        }
    }

    expect(ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)->find($attendance->id))->not->toBeNull();
});

// ─── Sign-in ─────────────────────────────────────────────────────────────────

it('locks out brute-force guessing on the coach sign-in', function (): void {
    $f = securityFixture();
    RateLimiter::clear('external-coach-login:'.strtolower($f['coach']->email).'|127.0.0.1');

    foreach (range(1, 5) as $i) {
        $this->post(route('external-coach.login.store'), ['email' => $f['coach']->email, 'password' => "wrong-{$i}"])
            ->assertSessionHasErrors('email');
    }

    $this->post(route('external-coach.login.store'), ['email' => $f['coach']->email, 'password' => 'password'])
        ->assertStatus(429);

    $this->assertGuest('external_coach');
});

it('does not reveal whether an account is inactive to someone who lacks the password', function (): void {
    $f = securityFixture();
    $inactive = ExternalCoach::factory()->create(['organization_id' => $f['org']->id, 'status' => 'inactive', 'email' => 'gone.coach@example.test']);

    $unknown = $this->post(route('external-coach.login.store'), ['email' => 'nobody@example.test', 'password' => 'x']);
    $guessed = $this->post(route('external-coach.login.store'), ['email' => $inactive->email, 'password' => 'wrong-guess']);

    $unknown->assertSessionHasErrors('email');
    $guessed->assertSessionHasErrors('email');

    expect($guessed->baseResponse->getSession()->get('errors')->get('email'))
        ->toEqual($unknown->baseResponse->getSession()->get('errors')->get('email'));

    // With the right password the owner is told the account is inactive.
    $this->post(route('external-coach.login.store'), ['email' => $inactive->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
});

it('ends an existing session the moment an admin deactivates the coach', function (): void {
    $f = securityFixture();

    $this->actingAs($f['coach'], 'external_coach')->get(route('external-coach.dashboard'))->assertOk();

    $f['coach']->update(['status' => 'inactive']);

    $this->actingAs($f['coach']->fresh(), 'external_coach')
        ->post(route('external-coach.attendance.store'), attendancePost(['external_coaching_assignment_id' => $f['mine']->id]))
        ->assertRedirect(route('external-coach.login'));

    expect(rowCount(ExternalTrainingAttendance::class))->toBe(0);
});

it('never redirects a coach off-site or into the admin area after sign-in', function (): void {
    $f = securityFixture();

    foreach (['https://evil.test/external-coach/dashboard', 'https://evil.test/', '//evil.test/x', url('/members')] as $intended) {
        $this->withSession(['url.intended' => $intended])
            ->post(route('external-coach.login.store'), ['email' => $f['coach']->email, 'password' => 'password'])
            ->assertRedirect(route('external-coach.dashboard'));

        auth('external_coach')->logout();
        RateLimiter::clear('external-coach-login:'.strtolower($f['coach']->email).'|127.0.0.1');
    }
});

it('survives hostile search input on the dashboard', function (): void {
    $f = securityFixture();

    foreach (['%', '_', "' OR 1=1 --", str_repeat('9', 5000), '<script>', '\\'] as $pno) {
        $this->actingAs($f['coach'], 'external_coach')
            ->get(route('external-coach.dashboard', ['pno' => $pno]))
            ->assertSuccessful();
    }
});
