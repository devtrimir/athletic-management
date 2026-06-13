<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: add plain supporting indexes so MySQL FK constraint stays satisfied
        // after the composite unique indexes are dropped.
        Schema::table('team_members', function (Blueprint $table): void {
            $table->index('team_id', 'team_members_team_id_index');
        });

        Schema::table('coach_assignments', function (Blueprint $table): void {
            $table->index('team_id', 'coach_assignments_team_id_index');
        });

        // Step 2: swap the coach unique constraint. Member uniqueness remains
        // (team_id, member_id); member sport/session eligibility is enforced in app logic.
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
            $table->dropIndex('team_members_team_id_index');
        });
    }
};
