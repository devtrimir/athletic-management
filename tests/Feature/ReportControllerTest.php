<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function rcUser(string ...$permissions): User
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
// Index tests
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access reports index', function (): void {
    $this->get(route('reports.index'))->assertRedirectToRoute('login');
});

test('user without reports.view gets 403 on index', function (): void {
    $user = rcUser();

    $this->actingAs($user)->get(route('reports.index'))->assertForbidden();
});

test('authenticated user with reports.view sees reports gallery', function (): void {
    $user = rcUser('reports.view');

    $response = $this->actingAs($user)->get(route('reports.index'));

    $response->assertOk()->assertInertia(
        fn ($page) => $page
            ->component('reports/index')
            ->has('reports', 8)
            ->where('reports.0.key', 'medal-tally'),
    );
});

// ---------------------------------------------------------------------------
// Show tests
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access reports show', function (): void {
    $this->get(route('reports.show', 'medal-tally'))->assertRedirectToRoute('login');
});

test('user without reports.view gets 403 on show', function (): void {
    $user = rcUser();

    $this->actingAs($user)->get(route('reports.show', 'medal-tally'))->assertForbidden();
});

test('unknown report key returns 404', function (): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)->get(route('reports.show', 'does-not-exist'))->assertNotFound();
});

test('medal-tally report returns 200 with correct structure', function (): void {
    $user = rcUser('reports.view');

    $response = $this->actingAs($user)->get(route('reports.show', 'medal-tally'));

    $response->assertOk()->assertInertia(
        fn ($page) => $page
            ->component('reports/show')
            ->has('report')
            ->where('report.key', 'medal-tally')
            ->has('data')
            ->has('filters')
            ->has('sessions')
            ->has('sports')
            ->has('tiers')
            ->has('units'),
    );
});

test('medals-by-member report returns 200', function (): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)
        ->get(route('reports.show', 'medals-by-member'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('reports/show')->where('report.key', 'medals-by-member'));
});

test('each valid report key returns 200', function (string $key): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)
        ->get(route('reports.show', $key))
        ->assertOk();
})->with([
    'team-roster',
    'resignation-dismissal-log',
    'unit-headcount',
    'player-level-summary',
    'new-joiners',
    'achievement-history',
]);
