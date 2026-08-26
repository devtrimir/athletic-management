<?php

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\OrganizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(OrganizationSeeder::class);
});

test('admin user is created with correct attributes', function (): void {
    $this->seed(AdminUserSeeder::class);

    $user = User::where('email', 'admin@upp.local')->first();

    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('System Admin')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->organization->code)->toBe('UPP');
});

test('admin role is created with is_system true', function (): void {
    $this->seed(AdminUserSeeder::class);

    $org = Organization::where('code', 'UPP')->firstOrFail();
    $role = Role::where('organization_id', $org->id)->where('code', 'admin')->first();

    expect($role)->not->toBeNull()
        ->and($role->is_system)->toBeTrue();
});

test('admin user has admin role in UPP org', function (): void {
    $this->seed(AdminUserSeeder::class);

    $user = User::where('email', 'admin@upp.local')->firstOrFail();
    $org = Organization::where('code', 'UPP')->firstOrFail();

    expect($user->hasRole('admin', $org->id))->toBeTrue();
});

test('seeder is idempotent', function (): void {
    $this->seed(AdminUserSeeder::class);
    $this->seed(AdminUserSeeder::class);

    $org = Organization::where('code', 'UPP')->firstOrFail();

    expect(User::where('email', 'admin@upp.local')->count())->toBe(1)
        ->and(Role::where('organization_id', $org->id)->where('code', 'admin')->count())->toBe(1);
});

test('seeder throws in non-local env when email is missing', function (): void {
    putenv('SEED_ADMIN_EMAIL');
    putenv('SEED_ADMIN_PASSWORD');
    unset($_ENV['SEED_ADMIN_EMAIL'], $_ENV['SEED_ADMIN_PASSWORD']);
    unset($_SERVER['SEED_ADMIN_EMAIL'], $_SERVER['SEED_ADMIN_PASSWORD']);

    $this->app['env'] = 'production';

    expect(fn () => app(AdminUserSeeder::class)->run())
        ->toThrow(RuntimeException::class);
});
