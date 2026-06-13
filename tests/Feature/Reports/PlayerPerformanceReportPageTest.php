<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('player performance report detail returns member performance payload', function (): void {
    $user = rcUser('reports.view');
    $org = Organization::findOrFail($user->organization_id);
    $setup = pprSeedParticipation($org, [
        'medal_type' => 'GOLD',
        'award_type' => 'BEST_PLAYER',
    ]);
    $setup['tournament']->update([
        'date_from' => '2026-01-15',
    ]);

    $response = $this->actingAs($user)->get(
        route('reports.member-performance-detail', [
            'key' => 'player-performance-ranking',
            'member' => $setup['member']->id,
            'from_date' => '2020-01-01',
            'to_date' => '2030-12-31',
        ]),
    );

    $response->assertSuccessful()->assertJsonPath('member.id', $setup['member']->id);
    $response->assertJsonPath('performance.summary.overall_points', 25);
    $response->assertJsonCount(1, 'performance.ledger');
});

test('player performance report detail is limited to the signed in organisation', function (): void {
    $user = rcUser('reports.view');
    $otherOrganization = Organization::factory()->create();
    $otherMember = Member::factory()->create([
        'organization_id' => $otherOrganization->id,
    ]);

    $this->actingAs($user)->get(
        route('reports.member-performance-detail', [
            'key' => 'player-performance-ranking',
            'member' => $otherMember->id,
        ]),
    )->assertNotFound();
});

test('player performance report detail rejects other report keys', function (): void {
    $user = rcUser('reports.view');
    $org = Organization::findOrFail($user->organization_id);
    $setup = pprSeedParticipation($org);

    $this->actingAs($user)->get(
        route('reports.member-performance-detail', [
            'key' => 'medal-tally',
            'member' => $setup['member']->id,
        ]),
    )->assertNotFound();
});

test('player performance drilldown returns scoped rows', function (): void {
    $user = rcUser('reports.view');
    $org = Organization::findOrFail($user->organization_id);
    $setup = pprSeedParticipation($org, [
        'medal_type' => 'GOLD',
        'award_type' => 'BEST_PLAYER',
    ]);

    $response = $this->actingAs($user)->get(
        route('reports.player-performance-drilldown', [
            'key' => 'player-performance-ranking',
            'dimension' => 'member',
            'dimension_id' => $setup['member']->id,
            'member_id' => $setup['member']->id,
            'metric' => 'GOLD',
        ]),
    );

    $response->assertSuccessful()
        ->assertJsonPath('summary.count', 1)
        ->assertJsonPath('rows.0.member.id', $setup['member']->id)
        ->assertJsonPath('rows.0.achievement.medal_type', 'GOLD');
});
