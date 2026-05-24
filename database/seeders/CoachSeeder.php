<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Coach;
use App\Models\Member;
use App\Models\Organization;
use Illuminate\Database\Seeder;

/**
 * Seeds ~20 coach fixtures for local development.
 *
 * Included in the default db:seed flow so developers get realistic
 * coaches data immediately after `php artisan migrate:fresh --seed`.
 */
class CoachSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::first();

        if (! $org) {
            return;
        }

        // 8 standalone coaches (no member link), mix of NIS certified
        Coach::factory()
            ->count(5)
            ->standalone()
            ->create(['organization_id' => $org->id]);

        Coach::factory()
            ->count(3)
            ->standalone()
            ->nisCertified()
            ->create(['organization_id' => $org->id]);

        // 6 coaches linked to existing members (or new member fixtures)
        $members = Member::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->inRandomOrder()
            ->limit(6)
            ->get();

        if ($members->isNotEmpty()) {
            foreach ($members as $member) {
                Coach::factory()
                    ->withMember($member)
                    ->create(['organization_id' => $org->id]);
            }
        } else {
            // Fallback: create member + coach pairs when no members seeded yet
            Coach::factory()
                ->count(6)
                ->withMember()
                ->create(['organization_id' => $org->id]);
        }

        // 4 NIS-certified coaches linked to members
        Coach::factory()
            ->count(4)
            ->nisCertified()
            ->withMember()
            ->create(['organization_id' => $org->id]);
    }
}
