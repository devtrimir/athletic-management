<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Policies\CoachPolicy;
use App\Policies\ImportPolicy;
use App\Policies\MemberPolicy;
use App\Policies\ReportPolicy;
use App\Policies\SettingsPolicy;
use App\Policies\TeamPolicy;
use App\Policies\TournamentPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/**
 * Create a user in an org with a role that has a specific permission.
 *
 * @return array{User, Organization}
 */
function userWithPermission(string $permissionCode): array
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $perm = Permission::firstOrCreate(
        ['code' => $permissionCode],
        ['group' => explode('.', $permissionCode)[0], 'name_hi' => $permissionCode, 'name_en' => $permissionCode],
    );
    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);
    DB::table('role_permission')->insert([
        'role_id' => $role->id,
        'permission_id' => $perm->id,
    ]);

    return [$user, $org];
}

/**
 * Create a user in an org with NO permissions.
 */
function userWithoutPermission(): User
{
    $org = Organization::factory()->create();

    return User::factory()->create(['organization_id' => $org->id]);
}

dataset('policy_methods', [
    'MemberPolicy::viewAny' => [fn () => new MemberPolicy,     'viewAny', 'members.view',       []],
    'MemberPolicy::view' => [fn () => new MemberPolicy,     'view',    'members.view',       [new stdClass]],
    'MemberPolicy::create' => [fn () => new MemberPolicy,     'create',  'members.create',     []],
    'MemberPolicy::update' => [fn () => new MemberPolicy,     'update',  'members.update',     [new stdClass]],
    'MemberPolicy::delete' => [fn () => new MemberPolicy,     'delete',  'members.delete',     [new stdClass]],
    'MemberPolicy::restore' => [fn () => new MemberPolicy,     'restore', 'members.restore',    [new stdClass]],
    'CoachPolicy::viewAny' => [fn () => new CoachPolicy,      'viewAny', 'coaches.view',       []],
    'CoachPolicy::view' => [fn () => new CoachPolicy,      'view',    'coaches.view',       [new stdClass]],
    'CoachPolicy::create' => [fn () => new CoachPolicy,      'create',  'coaches.create',     []],
    'CoachPolicy::update' => [fn () => new CoachPolicy,      'update',  'coaches.update',     [new stdClass]],
    'CoachPolicy::delete' => [fn () => new CoachPolicy,      'delete',  'coaches.delete',     [new stdClass]],
    'CoachPolicy::restore' => [fn () => new CoachPolicy,      'restore', 'coaches.restore',    [new stdClass]],
    'TeamPolicy::viewAny' => [fn () => new TeamPolicy,       'viewAny', 'teams.view',         []],
    'TeamPolicy::create' => [fn () => new TeamPolicy,       'create',  'teams.create',       []],
    'TeamPolicy::update' => [fn () => new TeamPolicy,       'update',  'teams.update',       [new stdClass]],
    'TeamPolicy::delete' => [fn () => new TeamPolicy,       'delete',  'teams.delete',       [new stdClass]],
    'TournamentPolicy::viewAny' => [fn () => new TournamentPolicy, 'viewAny', 'tournaments.view',   []],
    'TournamentPolicy::create' => [fn () => new TournamentPolicy, 'create',  'tournaments.create', []],
    'TournamentPolicy::update' => [fn () => new TournamentPolicy, 'update',  'tournaments.update', [new stdClass]],
    'TournamentPolicy::delete' => [fn () => new TournamentPolicy, 'delete',  'tournaments.delete', [new stdClass]],
    'ImportPolicy::create' => [fn () => new ImportPolicy,     'create',  'imports.run',        []],
    'ReportPolicy::viewAny' => [fn () => new ReportPolicy,     'viewAny', 'reports.view',       []],
    'ReportPolicy::view' => [fn () => new ReportPolicy,     'view',    'reports.view',       [new stdClass]],
    'ReportPolicy::export' => [fn () => new ReportPolicy,     'export',  'reports.view',       [new stdClass]],
    'SettingsPolicy::viewAny' => [fn () => new SettingsPolicy,   'viewAny', 'settings.manage',    []],
    'SettingsPolicy::update' => [fn () => new SettingsPolicy,   'update',  'settings.manage',    [new stdClass]],
]);

test(
    'policy method returns true for user with the required permission',
    function (Closure $makePolicy, string $method, string $code, array $extra): void {
        [$user] = userWithPermission($code);
        $policy = $makePolicy();

        expect($policy->$method($user, ...$extra))->toBeTrue();
    },
)->with('policy_methods');

test(
    'policy method returns false for user without the required permission',
    function (Closure $makePolicy, string $method, string $code, array $extra): void {
        $user = userWithoutPermission();
        $policy = $makePolicy();

        expect($policy->$method($user, ...$extra))->toBeFalse();
    },
)->with('policy_methods');
