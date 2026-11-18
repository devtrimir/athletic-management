<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Support\Organisation;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    $this->org = Organization::factory()->create([
        'code' => 'UPP',
        'display_name_en' => 'Sports Board',
        'display_name_hi' => 'खेल बोर्ड',
    ]);

    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);
    $this->admin = User::factory()->create([
        'organization_id' => $this->org->id,
        'locale' => 'en',
        'email_verified_at' => now(),
    ]);
    DB::table('user_role')->insert([
        'user_id' => $this->admin->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);
});

it('returns the admin-maintained name in the active language', function (): void {
    expect(Organisation::name('hi'))->toBe('खेल बोर्ड')
        ->and(Organisation::name('en'))->toBe('Sports Board');
});

it('falls back to English, then to the translation key, when names are blank', function (): void {
    $this->org->update(['display_name_hi' => null]);

    expect(Organisation::name('hi'))->toBe('Sports Board');

    $this->org->update(['display_name_en' => null]);

    expect(Organisation::name('en'))->toBe('UP Police Sports Control Board (UPPSCB)');
});

it('lets an admin edit the name and shares it with every page', function (): void {
    $this->actingAs($this->admin)
        ->get(route('organisation.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/organisation/edit')
            ->where('names.display_name_en', 'Sports Board'));

    $this->actingAs($this->admin)
        ->patch(route('organisation.update'), [
            'display_name_en' => 'New Board',
            'display_name_hi' => 'नया बोर्ड',
        ])
        ->assertRedirect(route('organisation.edit'));

    expect($this->org->fresh()->display_name_hi)->toBe('नया बोर्ड');

    $this->actingAs($this->admin)
        ->get(route('organisation.edit'))
        ->assertInertia(fn ($page) => $page->where('organisation.name', 'New Board'));
});

it('requires both names', function (): void {
    $this->actingAs($this->admin)
        ->patch(route('organisation.update'), ['display_name_en' => '', 'display_name_hi' => ''])
        ->assertSessionHasErrors(['display_name_en', 'display_name_hi']);
});

it('blocks users without reference-data permission', function (): void {
    $user = User::factory()->create(['organization_id' => $this->org->id, 'email_verified_at' => now()]);

    $this->actingAs($user)->get(route('organisation.edit'))->assertForbidden();
    $this->actingAs($user)->patch(route('organisation.update'), [
        'display_name_en' => 'x',
        'display_name_hi' => 'y',
    ])->assertForbidden();
});
