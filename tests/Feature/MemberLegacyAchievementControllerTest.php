<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function legacyAchievementUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
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

test('member legacy achievement can be stored for pre or post recruitment history', function (): void {
    $user = legacyAchievementUser('members.manageLegacyAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'start_year' => 2019,
        'end_year' => 2020,
        'name' => '2019-20',
    ]);

    $response = $this->actingAs($user)->post(
        route('members.legacy-achievements.store', $member),
        [
            'period' => 'POST_RECRUITMENT',
            'session_id' => $session->id,
            'level' => 'NATIONAL',
            'competition_details' => 'State Police Games 2019',
            'event_date' => '2019-09-14',
            'venue' => 'Lucknow',
            'sport_discipline' => 'Athletics',
            'event' => '100m Sprint',
            'medal_type' => 'GOLD',
            'position' => 1,
            'remarks' => 'Recorded from legacy register.',
        ],
    );

    $response->assertRedirect(route('members.show', $member));

    $achievement = MemberLegacyAchievement::query()->first();

    expect($achievement)
        ->not->toBeNull()
        ->and($achievement->member_id)->toBe($member->id)
        ->and($achievement->period)->toBe('POST_RECRUITMENT')
        ->and($achievement->session_id)->toBe($session->id)
        ->and($achievement->medal_type)->toBe('GOLD')
        ->and($achievement->position)->toBe(1)
        ->and($achievement->remarks)->toBe('Recorded from legacy register.');
});

test('member legacy achievement store validates required tournament fields', function (): void {
    $user = legacyAchievementUser('members.manageLegacyAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $response = $this->from(route('members.show', $member))
        ->actingAs($user)
        ->post(route('members.legacy-achievements.store', $member), [
            'period' => 'PRE_RECRUITMENT',
            'level' => '',
            'competition_details' => '',
            'medal_type' => 'MERIT',
        ]);

    $response
        ->assertRedirect(route('members.show', $member))
        ->assertSessionHasErrors(['level', 'competition_details']);

    expect(MemberLegacyAchievement::query()->count())->toBe(0);
});

test('member legacy achievement guesses session from event date for post recruitment records', function (): void {
    $user = legacyAchievementUser('members.manageLegacyAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
        'start_year' => 2018,
        'end_year' => 2019,
        'name' => '2018-19',
    ]);

    $this->actingAs($user)->post(route('members.legacy-achievements.store', $member), [
        'period' => 'POST_RECRUITMENT',
        'level' => 'STATE',
        'competition_details' => 'Police Meet',
        'event_date' => '2019-01-20',
        'event' => 'Relay',
        'medal_type' => 'SILVER',
    ])->assertRedirect(route('members.show', $member));

    $achievement = MemberLegacyAchievement::query()->first();

    expect($achievement)
        ->not->toBeNull()
        ->and($achievement->session_id)->toBe($session->id);
});

test('member legacy achievement does not retain session for pre recruitment records', function (): void {
    $user = legacyAchievementUser('members.manageLegacyAchievements');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $session = SportSession::factory()->create([
        'organization_id' => $user->organization_id,
    ]);

    $this->actingAs($user)->post(route('members.legacy-achievements.store', $member), [
        'period' => 'PRE_RECRUITMENT',
        'session_id' => $session->id,
        'level' => 'STATE',
        'competition_details' => 'School Championship',
        'event_date' => '2016-01-20',
        'event' => 'Relay',
    ])->assertRedirect(route('members.show', $member));

    $achievement = MemberLegacyAchievement::query()->first();

    expect($achievement)
        ->not->toBeNull()
        ->and($achievement->session_id)->toBeNull();
});
