<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Rank;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

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

    Rank::create([
        'code' => 'CONSTABLE',
        'name' => 'आरक्षी',
        'name_en' => 'Constable',
        'short_name' => 'Constable',
        'rank_order' => 10,
        'is_active' => true,
    ]);

    Rank::create([
        'code' => 'HC',
        'name' => 'हेड कांस्टेबल',
        'name_en' => 'Head Constable',
        'short_name' => 'HC',
        'rank_order' => 20,
        'is_active' => true,
    ]);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exportListingUser(string $locale = 'hi'): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $org->id,
        'locale' => $locale,
    ]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

function connectToActiveTeam(Member $member): Team
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

    return $team;
}

function makeRankedMember(User $user, array $overrides = []): Member
{
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'rank' => 'Head Constable',
        'initial_rank' => 'Constable',
        'player_category' => 'SPORTS_QUOTA',
        'player_level' => 'NATIONAL',
        ...$overrides,
    ]);
    connectToActiveTeam($member);

    return $member;
}

const LABEL_COLUMNS = ['rank', 'initial_rank', 'player_category', 'player_level'];

// ---------------------------------------------------------------------------
// Print listing / Excel export label localization
// ---------------------------------------------------------------------------

test('print listing rows use hindi labels when locale is hi', function () {
    $user = exportListingUser('hi');
    makeRankedMember($user);

    $this->actingAs($user)
        ->get(route('members.print', ['columns' => LABEL_COLUMNS]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('rows.0.rank', 'हेड कांस्टेबल')
            ->where('rows.0.initial_rank', 'आरक्षी')
            ->where('rows.0.player_category', 'खेल कोटा')
            ->where('rows.0.player_level', 'राष्ट्रीय')
        );
});

test('print listing rows use english labels when locale is en', function () {
    $user = exportListingUser('en');
    makeRankedMember($user);

    $this->actingAs($user)
        ->get(route('members.print', ['columns' => LABEL_COLUMNS]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('rows.0.rank', 'Head Constable')
            ->where('rows.0.initial_rank', 'Constable')
            ->where('rows.0.player_category', 'Sports Quota')
            ->where('rows.0.player_level', 'National')
        );
});

test('print listing falls back to raw rank text when no master row matches', function () {
    $user = exportListingUser('hi');
    makeRankedMember($user, ['rank' => 'Volunteer']);

    $this->actingAs($user)
        ->get(route('members.print', ['columns' => LABEL_COLUMNS]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('rows.0.rank', 'Volunteer')
        );
});

test('print listing maps skilled category to the sports quota label', function () {
    $user = exportListingUser('hi');
    makeRankedMember($user, ['player_category' => 'SKILLED']);

    $this->actingAs($user)
        ->get(route('members.print', ['columns' => ['player_category']]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/print')
            ->where('rows.0.player_category', 'खेल कोटा')
        );
});

test('excel export resolves the same localized rows', function () {
    $user = exportListingUser('en');
    $member = makeRankedMember($user);

    $this->actingAs($user)
        ->get(route('members.export', ['columns' => LABEL_COLUMNS]))
        ->assertOk()
        ->assertHeader('content-disposition');

    $this->actingAs($user)
        ->get(route('members.export.show', $member, ['columns' => LABEL_COLUMNS]))
        ->assertOk()
        ->assertHeader('content-disposition');
});

// ---------------------------------------------------------------------------
// Index payload
// ---------------------------------------------------------------------------

test('index ranks payload includes name_en', function () {
    $user = exportListingUser('hi');
    makeRankedMember($user);

    $this->actingAs($user)
        ->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('ranks.0.code', 'CONSTABLE')
            ->where('ranks.0.name_en', 'Constable')
            ->where('ranks.1.code', 'HC')
            ->where('ranks.1.name_en', 'Head Constable')
        );
});

test('member preview payload includes ranks for label resolution', function () {
    $user = exportListingUser('hi');
    $member = makeRankedMember($user);

    $this->actingAs($user)
        ->getJson(route('v1.members.preview', $member))
        ->assertOk()
        ->assertJsonPath('ranks.0.code', 'CONSTABLE')
        ->assertJsonPath('ranks.0.name_en', 'Constable');
});
