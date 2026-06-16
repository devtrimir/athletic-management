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
            $table->timestamps();

            $table->index(['team_id', 'session_id']);
            $table->index(['member_id', 'session_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_member_movements');

        Schema::table('team_members', function (Blueprint $table): void {
            if ($this->hasIndex('team_members', 'team_members_team_id_member_id_session_id_unique')) {
                $table->dropUnique('team_members_team_id_member_id_session_id_unique');
            }

            if (! $this->hasIndex('team_members', 'team_members_team_id_member_id_unique')) {
                $table->unique(['team_id', 'member_id'], 'team_members_team_id_member_id_unique');
            }
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        if (DB::getDriverName() === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('{$table}')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === $index);
        }

        return collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
    }
};
