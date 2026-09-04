<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Member;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('factory creates a standalone coach', function () {
    $coach = Coach::factory()->standalone()->create();

    expect($coach->id)->toBeInt()
        ->and($coach->member_id)->toBeNull()
        ->and($coach->full_name)->not->toBeEmpty()
        ->and($coach->organization_id)->toBeInt();
});

test('factory creates a coach linked to a member', function () {
    $org = Organization::factory()->create();
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $coach = Coach::factory()
        ->withMember($member)
        ->create(['organization_id' => $org->id]);

    expect($coach->member_id)->toBe($member->id)
        ->and($coach->full_name)->toBe($member->full_name);
});

test('withMember state creates a new member when none provided', function () {
    $coach = Coach::factory()->withMember()->create();

    expect($coach->member_id)->toBeInt();
    expect(Member::withoutGlobalScopes()->find($coach->member_id))->not->toBeNull();
});

test('coach belongs to organization via tenanted scope', function () {
    $org = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    expect($coach->organization->id)->toBe($org->id);
});

test('coach member relationship returns null for standalone', function () {
    $coach = Coach::factory()->standalone()->create();

    expect($coach->member)->toBeNull();
});
