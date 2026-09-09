<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\Event;
use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\MemberSpecialAchievement;
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
use App\Models\TrainingVenue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
    ], uniqueBy: ['code']);
});

function deletionTestUser(string ...$permissions): User
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
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert([
                'role_id' => $role->id,
                'permission_id' => $perm->id,
            ]);
        }
    }

    return $user;
}

test('deletion-impact endpoint returns 403 when user lacks members.delete permission', function (): void {
    $user = deletionTestUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('members.deletion-impact', $member))
        ->assertForbidden();
});

test('deletion-impact endpoint returns zero connections for a standalone member', function (): void {
    $user = deletionTestUser('members.delete');
    $member = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.deletion-impact', $member))
        ->assertOk()
        ->json();

    expect($response['can_delete'])->toBeTrue()
        ->and($response['has_connections'])->toBeFalse()
        ->and($response['summary']['active_teams_count'])->toBe(0)
        ->and($response['summary']['past_teams_count'])->toBe(0)
        ->and($response['summary']['linked_coach'])->toBeNull()
        ->and($response['summary']['participations_count'])->toBe(0)
        ->and($response['summary']['medals']['total'])->toBe(0)
        ->and($response['active_teams'])->toBeEmpty();
});

test('deletion-impact endpoint accurately detects active teams, linked coach, medals, and assignments', function (): void {
    $user = deletionTestUser('members.delete');
    $orgId = $user->organization_id;

    $sport = Sport::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $member = Member::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
        'current_status' => 'ACTIVE',
    ]);

    // 1. Active team and past team
    $activeTeam = Team::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
        'name' => 'Volleyball Men Squad A',
    ]);
    TeamMember::factory()->create([
        'team_id' => $activeTeam->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    $pastTeam = Team::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $pastTeam->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => now()->subMonths(3)->toDateString(),
    ]);

    // 2. Linked coach
    $coach = Coach::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
        'full_name' => 'Rajesh Sharma',
        'pno' => '123456789',
    ]);

    // 3. Tournament participation with Gold medal
    $tournament = Tournament::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
    ]);
    $event = Event::factory()->create(['tournament_id' => $tournament->id]);
    $participation = Participation::factory()->create([
        'event_id' => $event->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);
    Achievement::factory()->create([
        'participation_id' => $participation->id,
        'medal_type' => 'GOLD',
    ]);

    // 4. Active external coaching assignment
    $extCoach = ExternalCoach::factory()->create(['organization_id' => $orgId]);
    $venue = TrainingVenue::factory()->create(['organization_id' => $orgId]);
    ExternalCoachingAssignment::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
        'external_coach_id' => $extCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
        'end_date' => now()->addMonths(2)->toDateString(),
    ]);

    // 5. Special achievement
    MemberSpecialAchievement::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
    ]);

    // 6. Promotion
    MemberPromotion::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.deletion-impact', $member))
        ->assertOk()
        ->json();

    expect($response['can_delete'])->toBeTrue()
        ->and($response['has_connections'])->toBeTrue()
        ->and($response['summary']['active_teams_count'])->toBe(1)
        ->and($response['summary']['past_teams_count'])->toBe(1)
        ->and($response['summary']['linked_coach']['id'])->toBe($coach->id)
        ->and($response['summary']['linked_coach']['name'])->toBe('Rajesh Sharma')
        ->and($response['summary']['participations_count'])->toBe(1)
        ->and($response['summary']['medals']['total'])->toBe(1)
        ->and($response['summary']['medals']['gold'])->toBe(1)
        ->and($response['summary']['active_external_coaching_count'])->toBe(1)
        ->and($response['summary']['special_achievements_count'])->toBe(1)
        ->and($response['summary']['promotions_count'])->toBe(1)
        ->and($response['active_teams'][0]['name'])->toBe('Volleyball Men Squad A');
});

test('destroy disengages active team memberships, unlinks coach, cancels active coaching, updates status, and soft-deletes member', function (): void {
    $user = deletionTestUser('members.delete');
    $orgId = $user->organization_id;

    $sport = Sport::factory()->create();
    $session = SportSession::factory()->create(['organization_id' => $orgId]);
    $member = Member::factory()->create([
        'organization_id' => $orgId,
        'sport_id' => $sport->id,
        'current_status' => 'ACTIVE',
    ]);

    // Active team membership
    $team = Team::factory()->create(['organization_id' => $orgId, 'sport_id' => $sport->id]);
    $teamMember = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ]);

    // Linked coach
    $coach = Coach::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
    ]);

    // Active external coaching assignment
    $extCoach = ExternalCoach::factory()->create(['organization_id' => $orgId]);
    $venue = TrainingVenue::factory()->create(['organization_id' => $orgId]);
    $assignment = ExternalCoachingAssignment::factory()->create([
        'organization_id' => $orgId,
        'member_id' => $member->id,
        'external_coach_id' => $extCoach->id,
        'training_venue_id' => $venue->id,
        'sport_id' => $sport->id,
        'status' => 'active',
        'end_date' => now()->addMonth()->toDateString(),
    ]);

    $this->actingAs($user)
        ->delete(route('members.destroy', $member))
        ->assertRedirect(route('members.index'));

    // 1. Assert member is soft-deleted
    $this->assertSoftDeleted('members', ['id' => $member->id]);

    // 2. Assert active team membership marked as departed today
    $teamMember->refresh();
    expect($teamMember->left_on)->not->toBeNull()
        ->and($teamMember->left_on->toDateString())->toBe(now()->toDateString());

    // 3. Assert coach record remains, but member_id is unlinked to null
    $coach->refresh();
    expect($coach->member_id)->toBeNull();

    // 4. Assert external coaching assignment cancelled
    $assignment->refresh();
    expect($assignment->status)->toBe('cancelled')
        ->and($assignment->end_date->toDateString())->toBe(now()->toDateString());

    // 5. Assert status history has inactive transition
    $memberWithTrashed = Member::withTrashed()->find($member->id);
    expect($memberWithTrashed->current_status)->toBe('INACTIVE');

    $this->assertDatabaseHas('member_status_history', [
        'member_id' => $member->id,
        'status' => 'INACTIVE',
        'recorded_by' => $user->id,
    ]);
});
