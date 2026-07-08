<?php

declare(strict_types=1);

use App\Exports\ReportExport;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function coachExportUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

// ---------------------------------------------------------------------------
// index (bulk export)
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches.export', function () {
    $this->get(route('coaches.export'))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on coaches.export', function () {
    Excel::fake();

    $this->actingAs(coachExportUser())->get(route('coaches.export'))->assertForbidden();
});

test('coaches.export returns xlsx download for authorised user', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    Coach::factory()->count(3)->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)->get(route('coaches.export'))->assertOk();

    Excel::assertDownloaded('coaches-'.now()->format('Y-m-d').'.xlsx');
});

test('coaches.export defaults to listing columns', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $unit = Unit::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'PAC Lucknow',
    ]);
    $sport = Sport::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Athletics',
    ]);
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => '2026-27',
        'is_current' => true,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'name' => 'Lucknow Team',
        'is_active' => true,
    ]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'unit_id' => $unit->id,
        'full_name' => 'Asha Coach',
        'pno' => '12345',
        'blood_group' => 'O+',
        'gender' => 'F',
        'mobile' => '9999999999',
        'nis_certified' => true,
    ]);
    $coach->sports()->attach($sport->id, ['sport_event' => '100m']);
    $assignment = CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'role' => 'HEAD',
        'is_current' => true,
    ]);
    $assignment->update(['assigned_at' => '2026-01-05 00:00:00']);

    $this->actingAs($user)->get(route('coaches.export'))->assertOk();

    Excel::assertDownloaded('coaches-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        expect($export->headings())->toBe([
            [
                'S.No.',
                'Coach',
                'PNO',
                'Blood Group',
                'Gender',
                'Playable Sport',
                '',
                __('Teams'),
                '',
                '',
                '',
                'Posting',
                'Mobile Number',
                'NIS Certified',
            ],
            [
                '',
                '',
                '',
                '',
                '',
                __('Sport'),
                'Event / Weight',
                __('Team'),
                __('Session'),
                __('Role'),
                'Assigned at',
                '',
                '',
                '',
            ],
        ]);
        expect($export->mergeRanges())->toBe([
            'A1:A2',
            'B1:B2',
            'C1:C2',
            'D1:D2',
            'E1:E2',
            'F1:G1',
            'H1:K1',
            'L1:L2',
            'M1:M2',
            'N1:N2',
        ]);

        expect($export->collection()->first())->toBe([
            1,
            'Asha Coach',
            '12345',
            'O+',
            'Female',
            'Athletics',
            '100m',
            'Lucknow Team',
            '2026-27',
            'HEAD',
            '05-01-2026',
            'PAC Lucknow',
            '9999999999',
            'Yes',
        ]);

        return true;
    });
});

test('coaches.export with ids[] exports only specified coaches', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $keep = Coach::factory()->create(['organization_id' => $user->organization_id]);
    Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)->get(route('coaches.export', ['ids' => [$keep->id]]))->assertOk();

    Excel::assertDownloaded('coaches-'.now()->format('Y-m-d').'.xlsx');
});

test('coaches.export with q filter exports matching coaches', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'राम कुमार']);
    Coach::factory()->create(['organization_id' => $user->organization_id, 'full_name' => 'श्याम लाल']);

    $this->actingAs($user)->get(route('coaches.export', ['filter' => ['q' => 'राम']]))->assertOk();

    Excel::assertDownloaded('coaches-'.now()->format('Y-m-d').'.xlsx');
});

test('coaches.export de-dupes duplicate columns and ids', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $coachOne = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Repeat Coach 1',
        'blood_group' => 'A+',
        'pno' => 'PNO-1',
    ]);
    $coachTwo = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Repeat Coach 2',
        'blood_group' => 'B+',
        'pno' => 'PNO-2',
    ]);

    $this->actingAs($user)->get(route('coaches.export', [
        'ids' => [$coachOne->id, $coachOne->id, $coachTwo->id],
        'columns' => ['coach', 'coach', 'blood_group', 'blood_group'],
    ]))->assertOk();

    Excel::assertDownloaded('coaches-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        expect($export->headings())->toBe([
            'Coach',
            'Blood Group',
        ]);

        expect($export->collection()->count())->toBe(2);
        expect($export->collection()->map(fn (array $row): string => (string) $row[0])->values()->toArray())->toEqualCanonicalizing([
            'Repeat Coach 1',
            'Repeat Coach 2',
        ]);

        return true;
    });
});

// ---------------------------------------------------------------------------
// show (individual export)
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from coaches.export.show', function () {
    $org = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    $this->get(route('coaches.export.show', $coach))->assertRedirect(route('login'));
});

test('user without coaches.view gets 403 on coaches.export.show', function () {
    Excel::fake();

    $user = coachExportUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)->get(route('coaches.export.show', $coach))->assertForbidden();
});

test('coaches.export.show returns xlsx download for authorised user', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)->get(route('coaches.export.show', $coach))->assertOk();

    $expected = 'coach-'.($coach->pno ?? $coach->id).'-'.now()->format('Y-m-d').'.xlsx';
    Excel::assertDownloaded($expected);
});

test('coaches.export.show with linked member includes member_code', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id, 'member_id' => $member->id]);

    $this->actingAs($user)->get(route('coaches.export.show', $coach))->assertOk();

    $expected = 'coach-'.($coach->pno ?? $coach->id).'-'.now()->format('Y-m-d').'.xlsx';
    Excel::assertDownloaded($expected);
});

test('coaches.export.show returns 404 for coach in other org', function () {
    Excel::fake();

    $user = coachExportUser('coaches.view');
    $otherOrg = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)->get(route('coaches.export.show', $coach))->assertNotFound();
});
