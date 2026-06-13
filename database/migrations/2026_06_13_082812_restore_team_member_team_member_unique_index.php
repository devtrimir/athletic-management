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
        Schema::table('team_members', function (Blueprint $table): void {
            if ($this->hasIndex('team_members', 'team_members_member_id_session_id_unique')) {
                $table->dropUnique('team_members_member_id_session_id_unique');
            }

            if (! $this->hasIndex('team_members', 'team_members_team_id_member_id_unique')) {
                $table->unique(['team_id', 'member_id'], 'team_members_team_id_member_id_unique');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table): void {
            if ($this->hasIndex('team_members', 'team_members_team_id_member_id_unique')) {
                $table->dropUnique('team_members_team_id_member_id_unique');
            }

            if (! $this->hasIndex('team_members', 'team_members_member_id_session_id_unique')) {
                $table->unique(['member_id', 'session_id'], 'team_members_member_id_session_id_unique');
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

        return collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
    }
};
