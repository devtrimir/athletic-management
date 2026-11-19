<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * The User model lost its 'hashed' password cast, so passwords set through the
     * settings page, password reset, registration or the admin user edit were saved
     * as plain text (and login then failed on them). Hash any such value now.
     */
    public function up(): void
    {
        DB::table('users')->whereNotNull('password')->orderBy('id')->each(function (object $user): void {
            if (Hash::info($user->password)['algoName'] === 'unknown') {
                DB::table('users')->where('id', $user->id)->update(['password' => Hash::make($user->password)]);
            }
        });
    }

    public function down(): void
    {
        // Hashing cannot be undone.
    }
};
