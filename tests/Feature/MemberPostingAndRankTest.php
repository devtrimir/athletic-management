<?php

declare(strict_types=1);

use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Mirror production: the tournament tier master is always seeded.
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'AIPSC', 'label_hi' => 'अखिल भारतीय पुलिस खेल', 'label_en' => 'AIPSC', 'weight' => 70],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
        ['code' => 'ZONAL', 'label_hi' => 'क्षेत्रीय', 'label_en' => 'Zonal', 'weight' => 40],
        ['code' => 'OTHER', 'label_hi' => 'अन्य', 'label_en' => 'Other', 'weight' => 10],
    ], uniqueBy: ['code']);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function postingUser(string ...$permissions): User
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

/**
 * @return array<string, mixed>
 */
function postingPayload(array $overrides = []): array
{
    return array_merge([
        'full_name' => 'राम कुमार',
        'gender' => 'M',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
    ], $overrides);
}

function connectToActiveTeam(Member $member): void
{
    $session = SportSession::factory()->create(['organization_id' => $member->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $member->organization_id,
        'session_id' => $session->id,
        'is_active' => true,
    ]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);
}

// ---------------------------------------------------------------------------
// Posting XOR (unit vs district)
// ---------------------------------------------------------------------------

test('store rejects a member posted at both a unit and a district', function () {
    $user = postingUser('members.create');
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.store'), postingPayload([
            'current_unit_id' => $unit->id,
            'posting_district_id' => $district->id,
        ]))
        ->assertSessionHasErrors(['current_unit_id', 'posting_district_id']);

    expect(Member::withoutGlobalScopes()->count())->toBe(0);
});

test('store accepts a member posted at a unit only', function () {
    $user = postingUser('members.create');
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('members.store'), postingPayload(['current_unit_id' => $unit->id]))
        ->assertSessionDoesntHaveErrors()
        ->assertRedirect();

    $member = Member::withoutGlobalScopes()->firstOrFail();
    expect($member->current_unit_id)->toBe($unit->id)
        ->and($member->posting_district_id)->toBeNull();
});

test('store accepts a member dedicated to a district only', function () {
    $user = postingUser('members.create');
    $district = District::factory()->create();

    $this->actingAs($user)
        ->post(route('members.store'), postingPayload(['posting_district_id' => $district->id]))
        ->assertSessionDoesntHaveErrors()
        ->assertRedirect();

    $member = Member::withoutGlobalScopes()->firstOrFail();
    expect($member->posting_district_id)->toBe($district->id)
        ->and($member->current_unit_id)->toBeNull();
});

test('update rejects posting a member at both a unit and a district', function () {
    $user = postingUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), postingPayload([
            'current_unit_id' => $unit->id,
            'posting_district_id' => $district->id,
        ]))
        ->assertSessionHasErrors(['current_unit_id', 'posting_district_id']);

    expect($member->refresh()->current_unit_id)->toBeNull()
        ->and($member->posting_district_id)->toBeNull();
});

// ---------------------------------------------------------------------------
// Initial rank
// ---------------------------------------------------------------------------

test('store persists the initial rank', function () {
    $user = postingUser('members.create');

    $this->actingAs($user)
        ->post(route('members.store'), postingPayload(['initial_rank' => 'सिपाही']))
        ->assertSessionDoesntHaveErrors();

    expect(Member::withoutGlobalScopes()->firstOrFail()->initial_rank)->toBe('सिपाही');
});

test('update persists the initial rank', function () {
    $user = postingUser('members.update');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->put(route('members.update', $member), postingPayload(['initial_rank' => 'हेड कांस्टेबल']))
        ->assertSessionDoesntHaveErrors();

    expect($member->refresh()->initial_rank)->toBe('हेड कांस्टेबल');
});

test('store rejects an overlong initial rank', function () {
    $user = postingUser('members.create');

    $this->actingAs($user)
        ->post(route('members.store'), postingPayload(['initial_rank' => str_repeat('ा', 101)]))
        ->assertSessionHasErrors(['initial_rank']);
});

// ---------------------------------------------------------------------------
// Export and print alignment
// ---------------------------------------------------------------------------

test('member export headings use initial rank instead of appointment', function () {
    $user = postingUser('members.view');
    Member::factory()->create(['organization_id' => $user->organization_id]);

    $response = $this->actingAs($user)->get(route('members.export'));
    $response->assertOk();

    $sheet = IOFactory::load($response->getFile()->getPathname())->getActiveSheet();
    $headings = $sheet->rangeToArray('A1:AZ1')[0];

    expect(implode('|', $headings))->toContain('Initial Rank')
        ->and(implode('|', $headings))->not->toContain('Appointment');
});

test('member print renders the listing with letterhead props', function () {
    $user = postingUser('members.view');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'player_category' => 'GD',
    ]);
    connectToActiveTeam($member);

    $this->actingAs($user)
        ->get(route('members.print'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('reportMeta.title', 'Member Listing')
            ->where('headings', fn ($headings) => in_array('Initial Rank', $headings->all(), true)
                && ! in_array('Appointment', $headings->all(), true))
            ->where('rows', fn ($rows) => count($rows) === 1)
        );
});

test('member print respects the member filters', function () {
    $user = postingUser('members.view');
    connectToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'GD']));
    connectToActiveTeam(Member::factory()->create(['organization_id' => $user->organization_id, 'player_category' => 'SPORTS_QUOTA']));

    $this->actingAs($user)
        ->get(route('members.print', ['filter' => ['player_category' => 'GD']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('rows', fn ($rows) => count($rows) === 1)
        );
});

test('member print requires the members.view permission', function () {
    $user = postingUser();

    $this->actingAs($user)
        ->get(route('members.print'))
        ->assertForbidden();
});
