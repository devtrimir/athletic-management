<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Organization;
use App\Services\MemberCodeGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds 10 000 members for search performance testing (P2-T23).
 *
 * Run explicitly — NOT part of the default db:seed flow:
 *   php artisan db:seed --class=MemberVolumeSeeder
 *
 * Requires at least one organisation in the database. Run the default
 * db:seed first if the DB is empty:
 *   php artisan db:seed && php artisan db:seed --class=MemberVolumeSeeder
 */
class MemberVolumeSeeder extends Seeder
{
    public const COUNT = 10_000;

    private const CHUNK = 500;

    private const RANKS = ['Constable', 'Head Constable', 'SI', 'Inspector'];

    private const CATEGORIES = ['GD', 'SPORTS_QUOTA'];

    private const LEVELS = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'];

    private const GENDERS = ['M', 'F', 'O'];

    public function run(): void
    {
        $org = Organization::firstOrFail();
        $year = now()->year;
        $codes = app(MemberCodeGenerator::class)->nextBatch($org->id, self::COUNT, $year);
        $now = now()->toDateTimeString();

        foreach (array_chunk($codes, self::CHUNK) as $chunk) {
            DB::table('members')->insert(
                array_map(fn (string $code): array => [
                    'organization_id' => $org->id,
                    'member_code' => $code,
                    'pno' => fake()->optional(0.7)->numerify('##########'),
                    'full_name_hi' => fake()->name(),
                    'full_name_en' => fake()->optional(0.6)->name(),
                    'full_name_normalized' => null, // populated by MySQL trigger on real DB
                    'father_name_hi' => fake()->optional(0.8)->name(),
                    'rank' => fake()->optional(0.5)->randomElement(self::RANKS),
                    'gender' => fake()->randomElement(self::GENDERS),
                    'dob' => fake()->optional(0.9)->date('Y-m-d', '-18 years'),
                    'joining_date' => fake()->optional(0.9)->date('Y-m-d'),
                    'mobile' => fake()->optional(0.7)->numerify('##########'),
                    'home_district_id' => null,
                    'current_unit_id' => null,
                    'player_category' => fake()->randomElement(self::CATEGORIES),
                    'player_level' => fake()->randomElement(self::LEVELS),
                    'current_status' => 'ACTIVE',
                    'source_refs' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk)
            );
        }
    }
}
