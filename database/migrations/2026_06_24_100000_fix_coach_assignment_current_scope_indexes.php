<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        Schema::table('coach_assignments', function (Blueprint $table): void {
            if (Schema::hasIndex('coach_assignments', 'coach_assignments_coach_session_current_unique')) {
                $table->dropIndex('coach_assignments_coach_session_current_unique');
            }

            if (Schema::hasIndex('coach_assignments', 'coach_assignments_team_coach_session_current_unique')) {
                $table->dropIndex('coach_assignments_team_coach_session_current_unique');
            }
        });

        if ($driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique ON coach_assignments (coach_id, session_id) WHERE is_current = 1');
            DB::statement('CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique ON coach_assignments (team_id, coach_id, session_id) WHERE is_current = 1');
        } elseif ($driver === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique ON coach_assignments (coach_id, session_id) WHERE is_current = true');
            DB::statement('CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique ON coach_assignments (team_id, coach_id, session_id) WHERE is_current = true');
        } else {
            DB::statement('CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique ON coach_assignments (coach_id, session_id, (CASE WHEN is_current = 1 THEN 1 ELSE NULL END))');
            DB::statement('CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique ON coach_assignments (team_id, coach_id, session_id, (CASE WHEN is_current = 1 THEN 1 ELSE NULL END))');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite' || $driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS coach_assignments_coach_session_current_unique');
            DB::statement('DROP INDEX IF EXISTS coach_assignments_team_coach_session_current_unique');
        } else {
            DB::statement('DROP INDEX IF EXISTS coach_assignments_coach_session_current_unique ON coach_assignments');
            DB::statement('DROP INDEX IF EXISTS coach_assignments_team_coach_session_current_unique ON coach_assignments');
        }

        Schema::table('coach_assignments', function (Blueprint $table): void {
            if (! Schema::hasIndex('coach_assignments', 'coach_assignments_coach_session_current_unique')) {
                $table->unique(
                    ['coach_id', 'session_id', 'is_current'],
                    'coach_assignments_coach_session_current_unique',
                );
            }

            if (! Schema::hasIndex('coach_assignments', 'coach_assignments_team_coach_session_current_unique')) {
                $table->unique(
                    ['team_id', 'coach_id', 'session_id', 'is_current'],
                    'coach_assignments_team_coach_session_current_unique',
                );
            }
        });
    }
};
