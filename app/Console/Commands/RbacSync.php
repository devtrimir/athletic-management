<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
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
     * into the `permissions` table using `code` as the unique key.  Admin roles
     * are then refreshed so they continue to hold every permission.  Safe to run
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

        // Admin roles are implicitly granted every permission by the RBAC service,
        // but the role show page renders checkboxes from the pivot table.  Keep
        // those rows in sync so newly-added permissions appear checked for admin.
        $allPermissionIds = Permission::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $adminRoles = Role::query()->where('code', 'admin')->get();

        foreach ($adminRoles as $adminRole) {
            $adminRole->permissions()->sync($allPermissionIds);
        }

        // Flush the per-user permission caches so stale codes are not served.
        Cache::flush();

        $count = count($rows);
        $this->info("Synced {$count} permission(s) from config/rbac.php.");

        if ($adminRoles->isNotEmpty()) {
            $this->info("Refreshed permissions for {$adminRoles->count()} admin role(s).");
        }

        return self::SUCCESS;
    }
}
