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
        $this->createTeamMembersTable();
        $this->createTeamMemberMovementsTable();
        $this->ensureRosterIndexes();
    }

    public function down(): void
    {
        Schema::dropIfExists('team_member_movements');
        Schema::dropIfExists('team_members');
    }

    private function createTeamMembersTable(): void
    {
        if (Schema::hasTable('team_members')) {
            return;
        }

        Schema::create('team_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->enum('role', ['PLAYER', 'CAPTAIN', 'RESERVE'])->default('PLAYER');
            $table->date('joined_on')->nullable();
            $table->date('left_on')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'member_id', 'session_id']);
            $table->index('member_id');
            $table->index('session_id');
        });
    }

    private function createTeamMemberMovementsTable(): void
    {
        if (! Schema::hasTable('team_members') || Schema::hasTable('team_member_movements')) {
            return;
        }

        Schema::create('team_member_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->foreignId('team_member_id')->nullable()->constrained('team_members')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('action', ['ADDED', 'REMOVED', 'CARRIED_FORWARD', 'SKIPPED']);
            $table->string('role', 20)->nullable();
            $table->date('effective_on')->nullable();
            $table->text('reason')->nullable();
            $table->string('source')->default('manual');
            $table->string('batch_uuid')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'session_id']);
            $table->index(['member_id', 'session_id']);
            $table->index('source');
            $table->index('batch_uuid');
        });
    }

    private function ensureRosterIndexes(): void
    {
        if (! Schema::hasTable('team_members')) {
            return;
        }

        Schema::table('team_members', function (Blueprint $table): void {
            if ($this->hasIndex('team_members', 'team_members_team_id_member_id_unique')) {
                $table->dropUnique('team_members_team_id_member_id_unique');
            }

            if (! $this->hasIndex('team_members', 'team_members_team_id_member_id_session_id_unique')) {
                $table->unique(
                    ['team_id', 'member_id', 'session_id'],
                    'team_members_team_id_member_id_session_id_unique',
                );
            }
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('{$table}')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === $index);
        }

        if ($driver === 'pgsql') {
            return collect(DB::select(
                'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ?',
                [$table],
            ))->contains(fn (object $row): bool => ($row->indexname ?? null) === $index);
        }

        return collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
    }
};
