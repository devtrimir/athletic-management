<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('stores a changed password as a hash, never as plain text', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('user-password.update'), [
        'current_password' => 'password',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertSessionHasNoErrors();

    $stored = DB::table('users')->where('id', $user->id)->value('password');

    expect($stored)->not->toBe('new-password')
        ->and(Hash::info($stored)['algoName'])->toBe('bcrypt')
        ->and(Hash::check('new-password', $stored))->toBeTrue();
});

it('does not hash an already hashed password a second time', function (): void {
    $user = User::factory()->create(['password' => Hash::make('secret-pass')]);

    expect(Hash::check('secret-pass', DB::table('users')->where('id', $user->id)->value('password')))->toBeTrue();
});

it('the data migration hashes plain-text passwords and leaves hashed ones alone', function (): void {
    $org = Organization::factory()->create();
    $plain = User::factory()->create(['organization_id' => $org->id]);
    $hashed = User::factory()->create(['organization_id' => $org->id]);
    DB::table('users')->where('id', $plain->id)->update(['password' => 'plain-text-pass']);
    $before = DB::table('users')->where('id', $hashed->id)->value('password');

    (require database_path('migrations/'.basename(glob(database_path('migrations/*hash_plaintext_user_passwords.php'))[0])))->up();

    $after = DB::table('users')->where('id', $plain->id)->value('password');

    expect(Hash::check('plain-text-pass', $after))->toBeTrue()
        ->and(DB::table('users')->where('id', $hashed->id)->value('password'))->toBe($before);
});
