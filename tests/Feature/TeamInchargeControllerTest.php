<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function teamInchargeUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($permissions !== []) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'organization_id' => $org->id,
        ]);

        foreach ($permissions as $code) {
            $permission = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );

            DB::table('role_permission')->insert([
                'role_id' => $role->id,
                'permission_id' => $permission->id,
            ]);
        }
    }

    return $user;
}

test('can assign the first team incharge', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create();

    $this->actingAs($user)
        ->post(route('teams.incharge.store', $team), [
            'full_name' => 'Asha Singh',
            'pno' => '1234567890',
            'rank' => 'Inspector',
            'designation' => 'Team Officer',
            'assignment_reason' => 'Initial assignment',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_incharge_assignments', [
        'team_id' => $team->id,
        'incharge_id' => null,
        'full_name' => 'Asha Singh',
        'pno' => '1234567890',
        'is_current' => true,
    ]);

    expect($team->fresh()->in_charge)->toBe('Asha Singh');
});

test('changing the incharge closes the current row and creates a new one', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create();

    $current = TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'full_name' => 'First Officer',
        'pno' => '1234567890',
        'assigned_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.incharge.update', $team), [
            'full_name' => 'Second Officer',
            'pno' => '2222222222',
            'rank' => 'Deputy SP',
            'removal_reason' => 'Rotation',
            'assignment_reason' => 'Fresh cycle',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_incharge_assignments', [
        'id' => $current->id,
        'is_current' => false,
        'removed_by' => $user->id,
        'removal_reason' => 'Rotation',
    ]);

    $this->assertDatabaseHas('team_incharge_assignments', [
        'team_id' => $team->id,
        'incharge_id' => null,
        'full_name' => 'Second Officer',
        'is_current' => true,
    ]);

    expect($team->fresh()->in_charge)->toBe('Second Officer');
});

test('can remove the current incharge without replacement', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create();

    $assignment = TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'assigned_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.incharge.destroy', $team), [
            'removal_reason' => 'No longer required',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_incharge_assignments', [
        'id' => $assignment->id,
        'is_current' => false,
        'removed_by' => $user->id,
        'removal_reason' => 'No longer required',
    ]);

    expect($team->fresh()->in_charge)->toBeNull();
});

test('cannot assign an incharge to an inactive team', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create([
        'is_active' => false,
    ]);

    $this->actingAs($user)
        ->post(route('teams.incharge.store', $team), [
            'full_name' => 'Inactive Team Officer',
            'pno' => '1234567890',
        ])
        ->assertSessionHasErrors(['team']);
});

test('cannot assign an incharge without pno', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create();

    $this->actingAs($user)
        ->post(route('teams.incharge.store', $team), [
            'full_name' => 'No Pno Officer',
            'pno' => '',
        ])
        ->assertSessionHasErrors(['pno']);
});

test('cannot assign a current incharge to another team until removed', function (): void {
    $user = teamInchargeUser('teams.update');
    $organization = Organization::findOrFail($user->organization_id);
    $firstTeam = Team::factory()->forOrganization($organization)->create();
    $secondTeam = Team::factory()->forOrganization($organization)->create();

    TeamInchargeAssignment::factory()->create([
        'team_id' => $firstTeam->id,
        'incharge_id' => null,
        'full_name' => 'Shared Officer',
        'pno' => '1111111111',
        'assigned_by' => $user->id,
        'current_team_id' => $firstTeam->id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.incharge.store', $secondTeam), [
            'full_name' => 'Shared Officer',
            'pno' => '1111111111',
        ])
        ->assertSessionHasErrors(['pno']);

    $this->assertDatabaseMissing('team_incharge_assignments', [
        'team_id' => $secondTeam->id,
        'full_name' => 'Shared Officer',
        'pno' => '1111111111',
        'is_current' => true,
    ]);
});

test('cannot change a team incharge to someone currently assigned on another team', function (): void {
    $user = teamInchargeUser('teams.update');
    $organization = Organization::findOrFail($user->organization_id);
    $firstTeam = Team::factory()->forOrganization($organization)->create();
    $secondTeam = Team::factory()->forOrganization($organization)->create();

    TeamInchargeAssignment::factory()->create([
        'team_id' => $secondTeam->id,
        'incharge_id' => null,
        'full_name' => 'Current Officer',
        'pno' => '2222222222',
        'assigned_by' => $user->id,
        'current_team_id' => $secondTeam->id,
    ]);

    TeamInchargeAssignment::factory()->create([
        'team_id' => $firstTeam->id,
        'incharge_id' => null,
        'full_name' => 'Busy Officer',
        'pno' => '3333333333',
        'assigned_by' => $user->id,
        'current_team_id' => $firstTeam->id,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.incharge.update', $secondTeam), [
            'full_name' => 'Busy Officer',
            'pno' => '3333333333',
            'removal_reason' => 'Rotation',
        ])
        ->assertSessionHasErrors(['pno']);

    $this->assertDatabaseMissing('team_incharge_assignments', [
        'team_id' => $secondTeam->id,
        'full_name' => 'Busy Officer',
        'pno' => '3333333333',
        'is_current' => true,
    ]);
});

test('cannot change to the same current incharge pno', function (): void {
    $user = teamInchargeUser('teams.update');
    $team = Team::factory()->forOrganization(Organization::findOrFail($user->organization_id))->create();

    TeamInchargeAssignment::factory()->create([
        'team_id' => $team->id,
        'incharge_id' => null,
        'full_name' => 'Current Officer',
        'pno' => '4444444444',
        'assigned_by' => $user->id,
        'current_team_id' => $team->id,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.incharge.update', $team), [
            'full_name' => 'Current Officer',
            'pno' => '4444444444',
            'removal_reason' => 'Rotation',
        ])
        ->assertSessionHasErrors(['pno']);
});
