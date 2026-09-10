<?php

declare(strict_types=1);

use App\Exports\ReportExport;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function teamExportUser(string ...$permissions): User
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

test('unauthenticated user is redirected from teams.export', function () {
    $this->get(route('teams.export'))->assertRedirect(route('login'));
});

test('user without teams.view gets 403 on teams.export', function () {
    Excel::fake();

    $this->actingAs(teamExportUser())->get(route('teams.export'))->assertForbidden();
});

test('teams.export returns xlsx download for authorised user', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    Team::factory()->count(3)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export'))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export writes roster details across multiple rows and merges team cells', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
        'name' => 'Team Header Session',
    ]);
    $rosterSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Roster Detail Session',
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'name' => 'Client Excel Team',
    ]);

    $firstMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Player One',
        'pno' => 'PNO001',
        'gender' => 'M',
        'rank' => 'Constable',
        'mobile' => '9000000001',
    ]);
    $secondMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Player Two',
        'pno' => 'PNO002',
        'gender' => 'F',
        'rank' => 'Head Constable',
        'mobile' => '9000000002',
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $firstMember->id,
        'session_id' => $rosterSession->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->captain()->create([
        'team_id' => $team->id,
        'member_id' => $secondMember->id,
        'session_id' => $rosterSession->id,
    ]);

    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Coach One',
        'pno' => 'CPNO001',
        'mobile' => '9111111111',
    ]);

    CoachAssignment::factory()->head()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $rosterSession->id,
    ]);
    CoachAssignment::factory()->assistant()->create([
        'team_id' => $team->id,
        'coach_id' => Coach::factory()->create([
            'organization_id' => $user->organization_id,
            'full_name' => 'Removed Coach',
            'pno' => 'REM001',
        ])->id,
        'session_id' => $rosterSession->id,
        'is_current' => false,
        'removed_at' => now(),
    ]);

    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'full_name' => 'Inspector Meera Singh',
        'pno' => 'INCH001',
        'rank' => 'Inspector',
        'designation' => 'Team Incharge',
        'mobile' => '9222222222',
    ]);

    $this->actingAs($user)
        ->get(route('teams.export', ['filter' => ['session_id' => $rosterSession->id]]))
        ->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        $headings = $export->headings();
        $rows = $export->collection();

        expect($headings)->not->toContain(
            'Member 1 Name',
            'Member 2 Name',
            'Coach 1 Name',
        );
        expect($rows)->toHaveCount(9);
        expect($export->mergeRanges())->toContain(
            'A1:L1',
            'A2:L2',
            'A3:L3',
        );

        $rowsAsString = json_encode($rows->toArray());
        expect($rowsAsString)->not->toContain('Removed Coach');
        expect($rowsAsString)->toContain(
            'Client Excel Team',
            'Inspector Meera Singh',
            'Player One',
            'Player Two',
            'Coach One',
        );

        return true;
    });
});

test('teams.export applies default current session when no filter given', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $otherSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);

    Team::factory()->count(2)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);
    Team::factory()->count(1)->create(['organization_id' => $user->organization_id, 'session_id' => $otherSession->id]);

    $this->actingAs($user)->get(route('teams.export'))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export with ids[] exports only specified teams', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $keep = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);
    Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export', ['ids' => [$keep->id]]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export with session_id filter scopes correctly', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    Team::factory()->count(2)->create(['organization_id' => $user->organization_id, 'session_id' => $session->id]);

    $this->actingAs($user)->get(route('teams.export', ['filter' => ['session_id' => $session->id]]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx');
});

test('teams.export with ids applies filter.session_id to roster rows', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $currentSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'is_current' => true,
        'name' => 'Current Session',
    ]);
    $exportSession = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Archived Session',
    ]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $currentSession->id,
        'name' => 'Roster Session Team',
    ]);

    $memberInCurrent = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Current Session Player',
    ]);
    $memberInExport = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'full_name' => 'Archived Session Player',
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $memberInCurrent->id,
        'session_id' => $currentSession->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $memberInExport->id,
        'session_id' => $exportSession->id,
        'role' => 'PLAYER',
    ]);

    $this->actingAs($user)->get(route('teams.export', [
        'ids' => [$team->id],
        'filter' => ['session_id' => $exportSession->id],
    ]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        $rows = $export->collection();
        $rowsAsString = json_encode($rows->toArray());

        expect($rowsAsString)->toContain('Archived Session Player')
            ->and($rowsAsString)->not->toContain('Current Session Player');

        return true;
    });
});

test('teams.export exports member posting location without selecting dropped designation column', function () {
    Excel::fake();

    $user = teamExportUser('teams.view');
    $org = Organization::findOrFail($user->organization_id);
    $session = SportSession::factory()->create([
        'organization_id' => $org->id,
        'is_current' => true,
    ]);
    $team = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $session->id,
        'name' => 'Posting Test Team',
    ]);

    $district = District::factory()->create(['name' => 'Varanasi']);
    $unit = Unit::factory()->create([
        'organization_id' => $org->id,
        'name' => 'PAC 36 Battalion',
    ]);

    $districtMember = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'District Player',
        'posting_district_id' => $district->id,
        'current_unit_id' => null,
    ]);
    $unitMember = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'Unit Player',
        'posting_district_id' => null,
        'current_unit_id' => $unit->id,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $districtMember->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $unitMember->id,
        'session_id' => $session->id,
        'role' => 'PLAYER',
    ]);

    $this->actingAs($user)->get(route('teams.export', ['ids' => [$team->id]]))->assertOk();

    Excel::assertDownloaded('teams-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        $rowsAsString = json_encode($export->collection()->toArray());

        expect($rowsAsString)->toContain('District Player')
            ->and($rowsAsString)->toContain('Varanasi')
            ->and($rowsAsString)->toContain('Unit Player')
            ->and($rowsAsString)->toContain('PAC 36 Battalion');

        return true;
    });
});
