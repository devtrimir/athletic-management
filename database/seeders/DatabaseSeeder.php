<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            OrganizationSeeder::class,
            DistrictSeeder::class,
            SportSeeder::class,
            ParticipationFormatSeeder::class,
            GenderCategorySeeder::class,
            AgeCategorySeeder::class,
            MeasurementUnitSeeder::class,
            ResultTypeSeeder::class,
            SportEventSeeder::class,
            WeightCategorySeeder::class,
            SportEventVariantSeeder::class,
            SportSessionSeeder::class,
            TournamentTierSeeder::class,
            NisMasterSeeder::class,
            RanksAndDesignationsSeeder::class,
            UnitSeeder::class,
            MemberSeeder::class,
            TeamSeeder::class,
            TeamMemberSeeder::class,
            AdminUserSeeder::class,
            RbacRolesSeeder::class,
            CoachSeeder::class,
            TyagpatraSeeder::class,
            TournamentSeeder::class,
            ParticipationSeeder::class,
            AuditLogSeeder::class,
        ]);
    }
}
