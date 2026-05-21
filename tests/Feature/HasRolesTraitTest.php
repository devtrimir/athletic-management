<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);
    $this->role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'data_entry',
    ]);
});

test('assignRole persists a user_role row', function (): void {
    $this->user->assignRole($this->role, $this->org);

    expect(UserRole::where([
        'user_id' => $this->user->id,
        'role_id' => $this->role->id,
        'organization_id' => $this->org->id,
    ])->exists())->toBeTrue();
});

test('assignRole is idempotent', function (): void {
    $this->user->assignRole($this->role, $this->org);
    $this->user->assignRole($this->role, $this->org);

    expect(UserRole::where('user_id', $this->user->id)->count())->toBe(1);
});

test('hasRole returns true after assignment', function (): void {
    $this->user->assignRole($this->role, $this->org);

    expect($this->user->hasRole('data_entry', $this->org->id))->toBeTrue();
});

test('hasRole returns false for unassigned role', function (): void {
    expect($this->user->hasRole('admin', $this->org->id))->toBeFalse();
});

test('hasAnyRole returns true when at least one role matches', function (): void {
    $this->user->assignRole($this->role, $this->org);

    expect($this->user->hasAnyRole(['admin', 'data_entry'], $this->org->id))->toBeTrue();
});

test('hasAnyRole returns false when none match', function (): void {
    expect($this->user->hasAnyRole(['admin', 'viewer'], $this->org->id))->toBeFalse();
});

test('revokeRole removes the user_role row', function (): void {
    $this->user->assignRole($this->role, $this->org);
    $this->user->revokeRole($this->role, $this->org);

    expect(UserRole::where('user_id', $this->user->id)->exists())->toBeFalse();
});

test('revokeRole is a no-op when role was not assigned', function (): void {
    // Should not throw
    $this->user->revokeRole($this->role, $this->org);

    expect(true)->toBeTrue();
});

test('roles() returns collection of Role models', function (): void {
    $this->user->assignRole($this->role, $this->org);

    $roles = $this->user->roles($this->org->id);

    expect($roles)->toHaveCount(1)
        ->and($roles->first())->toBeInstanceOf(Role::class)
        ->and($roles->first()->code)->toBe('data_entry');
});
