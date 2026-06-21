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
        Schema::create('coach_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('coach_id')->constrained('coaches')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->enum('role', ['HEAD', 'ASSISTANT']);
            $table->dateTime('assigned_at')->nullable();
            $table->dateTime('removed_at')->nullable();
            $table->boolean('is_current')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('coach_id');
            $table->index('session_id');
            $table->index('is_current');
            $table->index('assigned_at');
            $table->index('removed_at');
            $table->index('team_id');
        });

        $this->createCurrentScopeIndexes();
    }

    public function down(): void
    {
        Schema::dropIfExists('coach_assignments');
    }

    private function createCurrentScopeIndexes(): void
    {
        if (! Schema::hasTable('coach_assignments')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if (! $this->hasIndex('coach_assignments', 'coach_assignments_coach_session_current_unique')) {
            if ($driver === 'sqlite') {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique '.
                    'ON coach_assignments (coach_id, session_id) WHERE is_current = 1'
                );
            } elseif ($driver === 'pgsql') {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique '.
                    'ON coach_assignments (coach_id, session_id) WHERE is_current = true'
                );
            } else {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_coach_session_current_unique '.
                    'ON coach_assignments (coach_id, session_id, (CASE WHEN is_current = 1 THEN 1 ELSE NULL END))'
                );
            }
        }

        if (! $this->hasIndex('coach_assignments', 'coach_assignments_team_coach_session_current_unique')) {
            if ($driver === 'sqlite') {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique '.
                    'ON coach_assignments (team_id, coach_id, session_id) WHERE is_current = 1'
                );
            } elseif ($driver === 'pgsql') {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique '.
                    'ON coach_assignments (team_id, coach_id, session_id) WHERE is_current = true'
                );
            } else {
                DB::statement(
                    'CREATE UNIQUE INDEX coach_assignments_team_coach_session_current_unique '.
                    'ON coach_assignments (team_id, coach_id, session_id, (CASE WHEN is_current = 1 THEN 1 ELSE NULL END))'
                );
            }
        }
    }

    private function hasIndex(string $table, string $index): bool
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('{$table}')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === $index);
        }

        if ($driver === 'pgsql') {
            return collect(DB::select(
                'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?',
                [$table, $index],
            ))->isNotEmpty();
        }

        return collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
    }
};
