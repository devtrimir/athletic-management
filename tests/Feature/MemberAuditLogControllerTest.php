<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function malUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );

    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

test('member audit log endpoint returns paged data and meta', function (): void {
    $user = malUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    AuditLog::create([
        'user_id' => $user->id,
        'organization_id' => $user->organization_id,
        'entity' => 'Member',
        'entity_id' => $member->id,
        'action' => 'updated',
        'diff' => ['rank' => ['old' => 'A', 'new' => 'B']],
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.audit-log.index', $member))
        ->assertOk();

    expect($response->json('data'))->not->toBeEmpty();
    expect($response->json('meta.page'))->toBe(1);
    expect($response->json('meta.has_more'))->toBeFalse();
});

test('member audit log endpoint includes promotion money and promotion evidence changes', function (): void {
    $user = malUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $promotion = MemberPromotion::create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
        'to_rank' => 'CONSTABLE',
        'cash_reward_amount' => '1000.00',
    ]);
    $tournament = Tournament::factory()
        ->forOrganization($member->organization)
        ->create(['name_hi' => 'State Police Games']);
    $event = Event::factory()
        ->forTournament($tournament)
        ->create(['name_hi' => '100m Sprint']);
    $participation = Participation::factory()
        ->forEvent($event)
        ->create(['member_id' => $member->id, 'position' => 1]);
    $achievement = Achievement::factory()
        ->forParticipation($participation)
        ->create(['medal_type' => 'GOLD']);

    AuditLog::create([
        'user_id' => $user->id,
        'organization_id' => $user->organization_id,
        'entity' => 'MemberPromotion',
        'entity_id' => $promotion->id,
        'action' => 'updated',
        'diff' => [
            'old' => ['cash_reward_amount' => '1000.00'],
            'new' => ['cash_reward_amount' => '7500.00'],
        ],
    ]);

    AuditLog::create([
        'user_id' => $user->id,
        'organization_id' => $user->organization_id,
        'entity' => 'PromotionEvidence',
        'entity_id' => 99,
        'action' => 'created',
        'diff' => [
            'member_promotion_id' => $promotion->id,
            'evidencable_type' => 'achievement',
            'evidencable_id' => $achievement->id,
        ],
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('members.audit-log.index', $member))
        ->assertOk();

    $entries = collect($response->json('data'));

    expect($entries->contains(fn (array $entry) => $entry['subject'] === 'Promotion' && collect($entry['changes'])->contains(fn (array $change) => $change['field'] === 'Cash reward amount' && $change['new'] === '7500.00')))->toBeTrue();
    expect($entries->contains(fn (array $entry) => $entry['subject'] === 'Promotion evidence'))->toBeTrue();

    $evidenceEntry = $entries->firstWhere('subject', 'Promotion evidence');
    $evidenceChange = collect($evidenceEntry['changes'])->firstWhere('field', 'Evidence');

    expect($evidenceChange['new'])
        ->toContain('GOLD')
        ->toContain('100m Sprint')
        ->toContain('State Police Games')
        ->not->toBe((string) $achievement->id);
});
