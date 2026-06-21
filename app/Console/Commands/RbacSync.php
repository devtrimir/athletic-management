<?php

namespace App\Console\Commands;

use App\Models\Permission;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

#[Signature('rbac:sync')]
#[Description('Upsert permissions from config/rbac.php into the database')]
class RbacSync extends Command
{
    /**
     * Execute the console command.
     *
     * Reads the permission catalog from config/rbac.php and upserts every entry
     * into the `permissions` table using `code` as the unique key.  Safe to run
     * on every deploy — will not duplicate or delete rows.
     */
    public function handle(): int
    {
        /** @var array<int, array{code: string, group: string, name_hi: string, name_en: string}> $catalog */
        $catalog = config('rbac.permissions', []);

        if (empty($catalog)) {
            $this->warn('No permissions found in config/rbac.php — nothing to sync.');

            return self::SUCCESS;
        }

        $now = Carbon::now();
        $rows = array_map(fn (array $entry) => array_merge($entry, [
            'description' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]), $catalog);

        Permission::upsert(
            $rows,
            uniqueBy: ['code'],
            update: ['group', 'name_hi', 'name_en', 'updated_at'],
        );

        // Flush the per-user permission caches so stale codes are not served.
        Cache::flush();

        $count = count($rows);
        $this->info("Synced {$count} permission(s) from config/rbac.php.");

        return self::SUCCESS;
    }
}
