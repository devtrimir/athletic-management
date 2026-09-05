<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Support\Participations\ParticipationTeamResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function resolverOrg(): Organization
{
    return Organization::factory()->create();
}

function resolverTeam(Organization $org, Sport $sport, SportSession $session, array $overrides = []): Team
{
    return Team::factory()->create(array_merge([
        'organization_id' => $org->id,
        'sport_id' => $sport->id,
        'session_id' => $session->id,
    ], $overrides));
}

function resolverMembership(Team $team, Member $member, SportSession $session, array $overrides = []): TeamMember
{
    return TeamMember::factory()->create(array_merge([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
        'left_on' => null,
    ], $overrides));
}

test('returns null when member has no active membership in the session', function (): void {
    $org = resolverOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $resolver = app(ParticipationTeamResolver::class);

    expect($resolver->resolveTeamId($member->id, $session->id, $sport->id))->toBeNull()
        ->and($resolver->resolveTeamId($member->id, 0, $sport->id))->toBeNull()
        ->and($resolver->resolveTeamId(0, $session->id, $sport->id))->toBeNull();
});

test('ignores memberships that already ended', function (): void {
    $org = resolverOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $team = resolverTeam($org, $sport, $session);
    resolverMembership($team, $member, $session, ['left_on' => '2025-03-01']);

    expect(app(ParticipationTeamResolver::class)->resolveTeamId($member->id, $session->id, $sport->id))->toBeNull();
});

test('prefers the team whose sport matches the event sport', function (): void {
    $org = resolverOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $eventSport = Sport::factory()->create(['organization_id' => $org->id]);
    $otherSport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $otherTeam = resolverTeam($org, $otherSport, $session);
    $sportTeam = resolverTeam($org, $eventSport, $session);
    resolverMembership($otherTeam, $member, $session, ['joined_on' => '2025-01-01']);
    resolverMembership($sportTeam, $member, $session, ['joined_on' => '2025-06-01']);

    expect(app(ParticipationTeamResolver::class)->resolveTeamId($member->id, $session->id, $eventSport->id))
        ->toBe($sportTeam->id);
});

test('uses the single active membership when no team sport matches', function (): void {
    $org = resolverOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $eventSport = Sport::factory()->create(['organization_id' => $org->id]);
    $otherSport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);
    $team = resolverTeam($org, $otherSport, $session);
    resolverMembership($team, $member, $session);

    expect(app(ParticipationTeamResolver::class)->resolveTeamId($member->id, $session->id, $eventSport->id))
        ->toBe($team->id);
});

test('breaks ties between same-sport teams by earliest joined_on then lowest id', function (): void {
    $org = resolverOrg();
    $session = SportSession::factory()->create(['organization_id' => $org->id]);
    $sport = Sport::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $laterTeam = resolverTeam($org, $sport, $session);
    $earlierTeam = resolverTeam($org, $sport, $session);
    resolverMembership($laterTeam, $member, $session, ['joined_on' => '2025-06-01']);
    resolverMembership($earlierTeam, $member, $session, ['joined_on' => '2025-01-01']);

    $resolver = app(ParticipationTeamResolver::class);

    expect($resolver->resolveTeamId($member->id, $session->id, $sport->id))->toBe($earlierTeam->id);

    // Null joined_on sorts last; the dated membership wins.
    $undatedMember = Member::factory()->create(['organization_id' => $org->id]);
    $datedTeam = resolverTeam($org, $sport, $session);
    $undatedTeam = resolverTeam($org, $sport, $session);
    resolverMembership($undatedTeam, $undatedMember, $session, ['joined_on' => null]);
    resolverMembership($datedTeam, $undatedMember, $session, ['joined_on' => '2025-06-01']);

    expect($resolver->resolveTeamId($undatedMember->id, $session->id, $sport->id))->toBe($datedTeam->id);

    // Equal joined_on falls back to the lowest team_members id.
    $tiedMember = Member::factory()->create(['organization_id' => $org->id]);
    $firstJoinedTeam = resolverTeam($org, $sport, $session);
    $secondJoinedTeam = resolverTeam($org, $sport, $session);
    resolverMembership($firstJoinedTeam, $tiedMember, $session, ['joined_on' => '2025-04-01']);
    resolverMembership($secondJoinedTeam, $tiedMember, $session, ['joined_on' => '2025-04-01']);

    expect($resolver->resolveTeamId($tiedMember->id, $session->id, $sport->id))->toBe($firstJoinedTeam->id);
});
