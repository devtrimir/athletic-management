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
        // Deduplicate team_members: seeded data had one member in two teams for
        // the same session. Keep the earliest assignment (lowest id).
        if (DB::getDriverName() === 'mysql') {
            DB::statement('
                DELETE tm1 FROM team_members tm1
                INNER JOIN team_members tm2
                    ON  tm1.member_id  = tm2.member_id
                    AND tm1.session_id = tm2.session_id
                    AND tm1.id         > tm2.id
            ');
        } else {
            // SQLite-compatible equivalent
            DB::statement('
                DELETE FROM team_members
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM team_members
                    GROUP BY member_id, session_id
                )
            ');
        }

        // Step 1: add plain supporting indexes so MySQL FK constraint stays satisfied
        // after the composite unique indexes are dropped.
        Schema::table('team_members', function (Blueprint $table): void {
            $table->index('team_id', 'team_members_team_id_index');
        });

        Schema::table('coach_assignments', function (Blueprint $table): void {
            $table->index('team_id', 'coach_assignments_team_id_index');
        });

        // Step 2: swap the unique constraints.
        Schema::table('team_members', function (Blueprint $table): void {
            // Old: prevented re-enrolling in the same team across seasons.
            // New: one team per member per session (cross-team uniqueness).
            $table->dropUnique('team_members_team_id_member_id_unique');
            $table->unique(['member_id', 'session_id'], 'team_members_member_id_session_id_unique');
        });

        Schema::table('coach_assignments', function (Blueprint $table): void {
            // Old: allowed same coach on two teams in same session (only blocked same team+role).
            // New: one team per coach per session (cross-team uniqueness).
            $table->dropUnique('coach_assignments_team_id_coach_id_role_unique');
            $table->unique(['coach_id', 'session_id'], 'coach_assignments_coach_id_session_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('coach_assignments', function (Blueprint $table): void {
            $table->dropUnique('coach_assignments_coach_id_session_id_unique');
            $table->unique(['team_id', 'coach_id', 'role'], 'coach_assignments_team_id_coach_id_role_unique');
            $table->dropIndex('coach_assignments_team_id_index');
        });

        Schema::table('team_members', function (Blueprint $table): void {
            $table->dropUnique('team_members_member_id_session_id_unique');
            $table->unique(['team_id', 'member_id'], 'team_members_team_id_member_id_unique');
            $table->dropIndex('team_members_team_id_index');
        });
    }
};
