<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Competition;
use App\Models\Event;
use App\Models\GameLevel;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationScore;
use App\Models\Permission;
use App\Models\PointScheme;
use App\Models\Role;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use App\Models\User;
use Database\Seeders\PointSchemeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function schemeAdmin(bool $allowed = true): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($allowed) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);
        $perm = Permission::firstOrCreate(['code' => 'reference_data.manage'], ['group' => 'reference_data', 'name_hi' => 'x', 'name_en' => 'x']);
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    // Tenant-scoped queries in the test body need the admin as the current user.
    test()->actingAs($user);

    return $user;
}

/** @return array<string, mixed> the form payload for every level/result at the given points */
function gridPayload(PointScheme $scheme, int $points, array $extra = []): array
{
    $grid = [];

    foreach (GameLevel::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $scheme->organization_id)->pluck('id') as $levelId) {
        foreach (PointScheme::RESULTS as $result) {
            $grid[$levelId][$result] = $points;
        }
    }

    return array_merge(['name' => $scheme->name, 'points' => $grid], $extra);
}

it('lists versions and shows one for an admin only', function (): void {
    $user = schemeAdmin();
    $this->seed(PointSchemeSeeder::class);
    $v1 = PointScheme::firstOrFail();

    $this->actingAs($user)->get(route('point-schemes.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->has('schemes', 1)->where('schemes.0.status', 'active')->where('schemes.0.effective_from', null));
    $this->actingAs($user)->get(route('point-schemes.show', $v1))->assertOk()->assertInertia(fn ($page) => $page
        ->where('canEdit', false)->has('levels', 6));

    $this->actingAs(schemeAdmin(false))->get(route('point-schemes.index'))->assertForbidden();
});

it('starts a draft by copying the latest version', function (): void {
    $user = schemeAdmin();
    $this->seed(PointSchemeSeeder::class);

    $this->actingAs($user)->post(route('point-schemes.store'))->assertRedirect();

    $draft = PointScheme::where('version_number', 2)->firstOrFail();
    $grid = fn (PointScheme $scheme) => $scheme->rows()->get()->mapWithKeys(fn ($row) => [$row->game_level_id.'|'.$row->result => $row->points])->all();

    expect($draft->status)->toBe('draft')->and($draft->rows)->toHaveCount(24)
        ->and($grid($draft))->toBe($grid(PointScheme::where('version_number', 1)->firstOrFail()));
});

it('edits a draft but locks a published version', function (): void {
    $user = schemeAdmin();
    $this->seed(PointSchemeSeeder::class);
    $v1 = PointScheme::where('version_number', 1)->firstOrFail();
    $this->actingAs($user)->post(route('point-schemes.store'));
    $draft = PointScheme::where('version_number', 2)->firstOrFail();

    $this->actingAs($user)->put(route('point-schemes.update', $draft), gridPayload($draft, 5, ['name' => 'Revised']))->assertSessionHasNoErrors();
    expect($draft->fresh()->name)->toBe('Revised')->and($draft->rows()->pluck('points')->unique()->all())->toBe([5]);

    $this->actingAs($user)->put(route('point-schemes.update', $v1), gridPayload($v1, 1))->assertForbidden();
    $this->actingAs($user)->delete(route('point-schemes.destroy', $v1))->assertForbidden();
    expect($v1->rows()->min('points'))->toBe(20);

    $this->actingAs($user)->put(route('point-schemes.update', $draft), array_merge(gridPayload($draft, 5), ['points' => [1 => ['GOLD' => -1]]]))->assertSessionHasErrors();

    $this->actingAs($user)->delete(route('point-schemes.destroy', $draft))->assertRedirect(route('point-schemes.index'));
    expect(PointScheme::find($draft->id))->toBeNull();
});

it('only publishes with a start date that is today or later and after the last version', function (): void {
    $user = schemeAdmin();
    $this->seed(PointSchemeSeeder::class);
    $this->actingAs($user)->post(route('point-schemes.store'));
    $draft = PointScheme::where('version_number', 2)->firstOrFail();

    $this->actingAs($user)->put(route('point-schemes.update', $draft), gridPayload($draft, 9, ['publish' => '1']))->assertSessionHasErrors('effective_from');
    $this->actingAs($user)->put(route('point-schemes.update', $draft), gridPayload($draft, 9, ['publish' => '1', 'effective_from' => now()->subDay()->toDateString()]))->assertSessionHasErrors('effective_from');
    expect($draft->fresh()->status)->toBe('draft');

    $start = now()->addMonth()->toDateString();
    $this->actingAs($user)->put(route('point-schemes.update', $draft), gridPayload($draft, 9, ['publish' => '1', 'effective_from' => $start]))->assertSessionHasNoErrors();

    expect($draft->fresh())->status->toBe('active')->effective_from->toDateString()->toBe($start);

    $this->actingAs($user)->post(route('point-schemes.store'));
    $next = PointScheme::where('version_number', 3)->firstOrFail();
    $this->actingAs($user)->put(route('point-schemes.update', $next), gridPayload($next, 1, ['publish' => '1', 'effective_from' => $start]))->assertSessionHasErrors('effective_from');
});

it('publishing rescores only tournaments from the start date, never earlier results', function (): void {
    $user = schemeAdmin();
    $org = Organization::find($user->organization_id);
    $this->seed(PointSchemeSeeder::class);
    $comp = Competition::withoutGlobalScope(BelongsToOrganization::class)->where('organization_id', $org->id)->where('name_en', 'National Games')->firstOrFail();

    $make = function (string $date) use ($org, $comp) {
        $tournament = Tournament::factory()->forOrganization($org)->create(['competition_id' => $comp->id, 'date_from' => $date]);
        $participation = Participation::factory()->forEvent(Event::factory()->forTournament($tournament)->create())->create();
        Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'GOLD']);

        return $participation;
    };
    $past = $make(now()->subMonth()->toDateString());
    $future = $make(now()->addMonths(2)->toDateString());

    $this->actingAs($user)->post(route('point-schemes.store'));
    $draft = PointScheme::where('version_number', 2)->firstOrFail();
    $this->actingAs($user)->put(route('point-schemes.update', $draft), gridPayload($draft, 77, ['publish' => '1', 'effective_from' => now()->addMonth()->toDateString()]));

    $points = fn (Participation $p) => ParticipationScore::where('participation_id', $p->id)->value('points');
    expect($points($past))->toBe(60)->and($points($future))->toBe(77)
        ->and(ParticipationScore::where('participation_id', $future->id)->value('point_scheme_id'))->toBe($draft->id);
});

it('keeps versions inside the organisation', function (): void {
    $user = schemeAdmin();
    $foreign = PointScheme::factory()->create(['organization_id' => Organization::factory()->create()->id]);

    $this->actingAs($user)->get(route('point-schemes.show', $foreign))->assertNotFound();
    $this->actingAs($user)->post(route('point-schemes.store'), ['source_id' => $foreign->id])->assertNotFound();
});
