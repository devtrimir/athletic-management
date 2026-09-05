<?php

declare(strict_types=1);

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function incUser(string ...$permissions): User
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

function incSetup(): array
{
    $user = incUser('tournaments.update');
    $tier = TournamentTier::firstOrCreate(
        ['code' => 'NATIONAL'],
        ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
    );
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'tier_id' => $tier->id,
    ]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);
    $event = Event::factory()->create([
        'tournament_id' => $tournament->id,
        'sport_id' => $sport->id,
        'event_type' => 'individual',
        'participants_required' => 2,
    ]);

    $members = [];
    $teams = [];
    for ($i = 0; $i < 3; $i++) {
        $member = Member::factory()->create(['organization_id' => $user->organization_id]);
        $team = Team::factory()->create([
            'organization_id' => $user->organization_id,
            'sport_id' => $sport->id,
            'session_id' => $session->id,
            'is_active' => true,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $session->id,
            'left_on' => null,
        ]);
        $members[] = $member;
        $teams[] = $team;
    }

    return [$user, $tournament, $event, $members, $teams];
}

test('can add individual participants incrementally when participants_required is set', function () {
    [$user, $tournament, $event, $members, $teams] = incSetup();

    $route = route('tournaments.events.participants.store', [$tournament, $event]);

    // First add one participant.
    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['member_id' => $members[0]->id, 'team_id' => $teams[0]->id],
            ],
        ])
        ->assertRedirect();

    // Then add the second participant.
    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['member_id' => $members[1]->id, 'team_id' => $teams[1]->id],
            ],
        ])
        ->assertRedirect();

    expect(Participation::where('event_id', $event->id)->count())->toBe(2);
});

test('individual participants are not restricted by participants_required count', function () {
    [$user, $tournament, $event, $members, $teams] = incSetup();

    $route = route('tournaments.events.participants.store', [$tournament, $event]);

    // Add two participants even though participants_required is 2.
    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['member_id' => $members[0]->id, 'team_id' => $teams[0]->id],
                ['member_id' => $members[1]->id, 'team_id' => $teams[1]->id],
            ],
        ])
        ->assertRedirect();

    // Adding a third beyond the "required" count is also allowed.
    $this->actingAs($user)
        ->post($route, [
            'participants' => [
                ['member_id' => $members[2]->id, 'team_id' => $teams[2]->id],
            ],
        ])
        ->assertRedirect();

    expect(Participation::where('event_id', $event->id)->count())->toBe(3);
});
