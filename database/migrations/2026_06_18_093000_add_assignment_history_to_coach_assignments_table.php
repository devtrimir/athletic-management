<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('coach_assignments', function (Blueprint $table): void {
            $table->dateTime('assigned_at')->nullable()->after('session_id');
            $table->dateTime('removed_at')->nullable()->after('assigned_at');
            $table->boolean('is_current')->default(false)->after('removed_at');
            $table->text('notes')->nullable()->after('is_current');

            $table->index('is_current');
            $table->index('assigned_at');
            $table->index('removed_at');
        });

        Schema::table('coach_assignments', function (Blueprint $table): void {
            if (Schema::hasIndex('coach_assignments', 'coach_assignments_team_id_coach_id_role_unique')) {
                $table->dropUnique('coach_assignments_team_id_coach_id_role_unique');
            }

            if (Schema::hasIndex('coach_assignments', 'coach_assignments_coach_id_session_id_unique')) {
                $table->dropUnique('coach_assignments_coach_id_session_id_unique');
            }

            $table->unique(
                ['coach_id', 'session_id', 'is_current'],
                'coach_assignments_coach_session_current_unique',
            );

            $table->unique(
                ['team_id', 'coach_id', 'session_id', 'is_current'],
                'coach_assignments_team_coach_session_current_unique',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coach_assignments', function (Blueprint $table): void {
            if (Schema::hasIndex('coach_assignments', 'coach_assignments_coach_session_current_unique')) {
                $table->dropUnique('coach_assignments_coach_session_current_unique');
            }

            if (Schema::hasIndex('coach_assignments', 'coach_assignments_team_coach_session_current_unique')) {
                $table->dropUnique('coach_assignments_team_coach_session_current_unique');
            }

            if (! Schema::hasIndex('coach_assignments', 'coach_assignments_team_id_coach_id_role_unique')) {
                $table->unique([
                    'team_id',
                    'coach_id',
                    'role',
                ], 'coach_assignments_team_id_coach_id_role_unique');
            }

            if (Schema::hasIndex('coach_assignments', 'coach_assignments_coach_id_session_id_unique')) {
                $table->dropUnique('coach_assignments_coach_id_session_id_unique');
            }

            $table->dropColumn(['assigned_at', 'removed_at', 'is_current', 'notes']);
        });
    }
};
