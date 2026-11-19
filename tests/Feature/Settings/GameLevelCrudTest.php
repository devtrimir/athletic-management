<?php

declare(strict_types=1);

use App\Models\Competition;
use App\Models\GameLevel;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\PointSchemeRow;
use App\Models\Role;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use App\Models\User;
use Database\Seeders\PointSchemeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function levelAdmin(bool $allowed = true): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($allowed) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);
        $perm = Permission::firstOrCreate(['code' => 'reference_data.manage'], ['group' => 'reference_data', 'name_hi' => 'x', 'name_en' => 'x']);
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    return $user;
}

function seededLevel(User $user, string $code): GameLevel
{
    return GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $user->organization_id)->where('code', $code)->firstOrFail();
}

it('lists levels with their competitions for an admin only', function (): void {
    $user = levelAdmin();
    $this->seed(PointSchemeSeeder::class);

    $this->actingAs($user)->get(route('game-levels.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->component('settings/game-levels/index')
        ->has('levels', 6)
        ->has('levels.0.competitions', 1));

    $this->actingAs(levelAdmin(false))->get(route('game-levels.index'))->assertForbidden();
});

it('creates and updates a game level with a generated unique code', function (): void {
    $user = levelAdmin();
    $payload = ['name_en' => 'State Level', 'name_hi' => 'राज्य स्तर', 'sort_order' => 7];

    $this->actingAs($user)->post(route('game-levels.store'), $payload)->assertRedirect(route('game-levels.index'));
    $this->actingAs($user)->post(route('game-levels.store'), $payload);

    $codes = GameLevel::pluck('code')->all();
    expect($codes)->toBe(['STATE_LEVEL', 'STATE_LEVEL_2']);

    $level = GameLevel::first();
    $this->actingAs($user)->put(route('game-levels.update', $level), array_merge($payload, ['is_active' => '0', 'name_en' => 'State']))->assertSessionHasNoErrors();

    expect($level->fresh())->name_en->toBe('State')->is_active->toBeFalse()->code->toBe('STATE_LEVEL');
});

it('validates the names and keeps levels inside the organisation', function (): void {
    $user = levelAdmin();
    $foreign = GameLevel::factory()->create(['organization_id' => Organization::factory()->create()->id]);

    $this->actingAs($user)->post(route('game-levels.store'), ['name_en' => '', 'name_hi' => '', 'sort_order' => -1])
        ->assertSessionHasErrors(['name_en', 'name_hi', 'sort_order']);
    $this->actingAs($user)->put(route('game-levels.update', $foreign), ['name_en' => 'x', 'name_hi' => 'x', 'sort_order' => 1])->assertNotFound();
    $this->actingAs($user)->delete(route('game-levels.destroy', $foreign))->assertNotFound();
});

it('refuses to delete a level that has competitions or points, but deletes an empty one', function (): void {
    $user = levelAdmin();
    $this->seed(PointSchemeSeeder::class);
    $used = seededLevel($user, 'NATIONAL');

    $this->actingAs($user)->delete(route('game-levels.destroy', $used))->assertRedirect(route('game-levels.index'));
    expect(GameLevel::find($used->id))->not->toBeNull();

    Competition::where('game_level_id', $used->id)->delete();
    // No competitions left, but a points version still has rows for it.
    $this->actingAs($user)->delete(route('game-levels.destroy', $used));
    expect(PointSchemeRow::where('game_level_id', $used->id)->exists())->toBeTrue()
        ->and(GameLevel::find($used->id))->not->toBeNull();

    $empty = GameLevel::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($user)->delete(route('game-levels.destroy', $empty));
    expect(GameLevel::find($empty->id))->toBeNull();
});

it('manages competitions: create, unique name, move level, deactivate, delete', function (): void {
    $user = levelAdmin();
    $this->seed(PointSchemeSeeder::class);
    $national = seededLevel($user, 'NATIONAL');
    $world = seededLevel($user, 'WORLD');
    $payload = ['game_level_id' => $national->id, 'name_en' => 'State Games', 'name_hi' => 'राज्य खेल', 'sort_order' => 9];

    $this->actingAs($user)->post(route('competitions.store'), $payload)->assertRedirect(route('game-levels.index'));
    $this->actingAs($user)->post(route('competitions.store'), $payload)->assertSessionHasErrors('name_en');

    $competition = Competition::where('name_en', 'State Games')->firstOrFail();
    $this->actingAs($user)->put(route('competitions.update', $competition), array_merge($payload, ['game_level_id' => $world->id, 'is_active' => '0']))->assertSessionHasNoErrors();
    expect($competition->fresh())->game_level_id->toBe($world->id)->is_active->toBeFalse();

    $this->actingAs($user)->delete(route('competitions.destroy', $competition));
    expect(Competition::find($competition->id))->toBeNull();
});

it('rejects a level from another organisation and protects competitions used by tournaments', function (): void {
    $user = levelAdmin();
    $this->seed(PointSchemeSeeder::class);
    $foreign = GameLevel::factory()->create(['organization_id' => Organization::factory()->create()->id]);

    $this->actingAs($user)->post(route('competitions.store'), ['game_level_id' => $foreign->id, 'name_en' => 'X', 'name_hi' => 'X', 'sort_order' => 1])
        ->assertSessionHasErrors('game_level_id');

    $competition = Competition::where('name_en', 'Asian Games')->firstOrFail();
    Tournament::factory()->forOrganization(Organization::find($user->organization_id))->create(['competition_id' => $competition->id]);

    $this->actingAs($user)->delete(route('competitions.destroy', $competition));
    expect(Competition::find($competition->id))->not->toBeNull();
});
