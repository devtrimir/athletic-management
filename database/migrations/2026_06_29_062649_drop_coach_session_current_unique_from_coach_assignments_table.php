<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX = 'coach_assignments_coach_session_current_unique';

    public function up(): void
    {
        if (! Schema::hasTable('coach_assignments') || ! $this->hasIndex()) {
            return;
        }

        $this->dropIndex();
    }

    public function down(): void
    {
        if (! Schema::hasTable('coach_assignments') || $this->hasIndex()) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX.' ON coach_assignments (coach_id, session_id) WHERE is_current = 1'
            );

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX.' ON coach_assignments (coach_id, session_id) WHERE is_current = true'
            );

            return;
        }

        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON coach_assignments (coach_id, session_id, (CASE WHEN is_current = 1 THEN 1 ELSE NULL END))'
        );
    }

    private function dropIndex(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('DROP INDEX '.self::INDEX.' ON coach_assignments');

            return;
        }

        DB::statement('DROP INDEX '.self::INDEX);
    }

    private function hasIndex(): bool
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('coach_assignments')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === self::INDEX);
        }

        if ($driver === 'pgsql') {
            return collect(DB::select(
                'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?',
                ['coach_assignments', self::INDEX],
            ))->isNotEmpty();
        }

        return collect(DB::select('SHOW INDEX FROM coach_assignments WHERE Key_name = ?', [self::INDEX]))->isNotEmpty();
    }
};
