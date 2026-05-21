<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

test('users table has organization_id and locale columns', function (): void {
    expect(Schema::hasColumns('users', ['organization_id', 'locale']))->toBeTrue();
});

test('factory creates user with default locale hi and null organization_id', function (): void {
    $user = User::factory()->create();

    expect($user->locale)->toBe('hi')
        ->and($user->organization_id)->toBeNull();
});

test('user belongs to organization when organization_id is set', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    expect($user->organization)->toBeInstanceOf(Organization::class)
        ->and($user->organization->id)->toBe($org->id);
});

test('organization_id is nulled when organization is deleted', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $org->delete();

    expect($user->fresh()->organization_id)->toBeNull();
});
