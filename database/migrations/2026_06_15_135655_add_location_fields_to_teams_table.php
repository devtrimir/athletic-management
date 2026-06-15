<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('location_type', 20)->default('unit')->after('session_id');
            $table->foreignId('district_id')->nullable()->after('location_type')->constrained('districts');
            $table->boolean('is_active')->default(true)->after('in_charge');
        });

        DB::table('teams')->update([
            'location_type' => 'unit',
            'district_id' => DB::raw('(select district_id from units where units.id = teams.unit_id)'),
            'is_active' => true,
        ]);

        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('unit_id')->nullable()->change();
            $table->unsignedBigInteger('location_reference_id')
                ->storedAs("case when `location_type` = 'unit' then `unit_id` else `district_id` end")
                ->after('unit_id');

            $table->dropUnique('teams_unique_org_sport_session_unit_name');

            $table->unique(
                ['organization_id', 'sport_id', 'session_id', 'location_type', 'location_reference_id', 'name'],
                'teams_unique_org_sport_session_location_name'
            );
            $table->index('district_id');
            $table->index('unit_id');
            $table->index('location_type');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        DB::table('teams')
            ->whereNull('unit_id')
            ->update([
                'location_type' => 'unit',
            ]);

        Schema::table('teams', function (Blueprint $table) {
            $table->dropUnique('teams_unique_org_sport_session_location_name');
            $table->dropIndex(['district_id']);
            $table->dropIndex(['unit_id']);
            $table->dropIndex(['location_type']);
            $table->dropIndex(['is_active']);
            $table->dropColumn('location_reference_id');
            $table->unique(
                ['organization_id', 'sport_id', 'session_id', 'unit_id', 'name'],
                'teams_unique_org_sport_session_unit_name'
            );
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('unit_id')->nullable(false)->change();
            $table->dropConstrainedForeignId('district_id');
            $table->dropColumn(['is_active', 'location_type']);
        });
    }
};
