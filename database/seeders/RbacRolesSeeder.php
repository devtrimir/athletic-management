<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class RbacRolesSeeder extends Seeder
{
    /**
     * Permissions that are admin-only (not granted to any non-system role by default).
     *
     * @var array<int, string>
     */
    private const ADMIN_ONLY = ['users.manage', 'settings.manage', 'reference_data.manage'];

    /**
     * Permissions that are delete actions (not granted to data_entry role).
     *
     * @var array<int, string>
     */
    private const DELETE_CODES = ['members.delete', 'coaches.delete', 'teams.delete', 'tournaments.delete', 'media.delete'];

    /**
     * View-only permissions granted to the viewer role.
     *
     * @var array<int, string>
     */
    private const VIEWER_CODES = ['members.view', 'coaches.view', 'teams.view', 'tournaments.view', 'reports.view'];

    public function run(): void
    {
        // Sync permission catalog first so all codes exist.
        Artisan::call('rbac:sync');

        $org = Organization::where('code', 'UPP')->firstOrFail();

        $allIds = Permission::pluck('id', 'code');

        // ── admin: all permissions ────────────────────────────────────────────
        $adminRole = Role::where('organization_id', $org->id)->where('code', 'admin')->firstOrFail();
        $adminRole->permissions()->sync($allIds->values()->all());

        // ── officer: full domain, no admin-only ───────────────────────────────
        $officerRole = Role::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'officer'],
            ['name_hi' => 'अधिकारी', 'name_en' => 'Officer', 'is_system' => true],
        );
        $officerIds = $allIds->except(self::ADMIN_ONLY)->values()->all();
        $officerRole->permissions()->sync($officerIds);

        // ── data_entry: view/create/update + imports, no delete/admin-only ────
        $dataEntryRole = Role::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'data_entry'],
            ['name_hi' => 'डेटा प्रविष्टि', 'name_en' => 'Data Entry', 'is_system' => true],
        );
        $dataEntryIds = $allIds->except([...self::ADMIN_ONLY, ...self::DELETE_CODES])->values()->all();
        $dataEntryRole->permissions()->sync($dataEntryIds);

        // ── viewer: read-only ─────────────────────────────────────────────────
        $viewerRole = Role::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'viewer'],
            ['name_hi' => 'दर्शक', 'name_en' => 'Viewer', 'is_system' => true],
        );
        $viewerIds = $allIds->only(self::VIEWER_CODES)->values()->all();
        $viewerRole->permissions()->sync($viewerIds);
    }
}
