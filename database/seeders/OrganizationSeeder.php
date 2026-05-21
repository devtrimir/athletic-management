<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        Organization::firstOrCreate(
            ['code' => 'UPP'],
            ['name' => 'UP Police Sports Unit'],
        );
    }
}
