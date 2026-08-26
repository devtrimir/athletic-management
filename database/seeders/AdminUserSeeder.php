<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('SEED_ADMIN_EMAIL');
        $password = env('SEED_ADMIN_PASSWORD');
        $name = env('SEED_ADMIN_NAME', 'System Admin');

        if (empty($email) || empty($password)) {
            if (! app()->isLocal()) {
                throw new \RuntimeException(
                    'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in non-local environments.'
                );
            }

            $email ??= 'systemadmin@uppscb.com';
            $password ??= 'G7#kP2!xQ9';
        }

        $org = Organization::firstOrCreate(
            ['code' => 'UPPSCB'],
            ['name' => 'UP Police Sports Control Board'],
        );

        $adminRole = Role::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'admin'],
            ['name_hi' => 'व्यवस्थापक', 'name_en' => 'Administrator', 'is_system' => true],
        );

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'organization_id' => $org->id,
                'locale' => 'hi',
                'email_verified_at' => now(),
            ],
        );

        $user->assignRole($adminRole, $org);
    }
}
