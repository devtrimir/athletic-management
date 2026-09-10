<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX = 'members_organization_id_pno_unique';

    public function up(): void
    {
        if (! Schema::hasTable('members')) {
            return;
        }

        if ($this->hasIndex()) {
            $this->dropIndex();
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite' || $driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX.' ON members (organization_id, pno) WHERE deleted_at IS NULL'
            );

            return;
        }

        // MySQL 8.0+ functional index fallback
        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON members (organization_id, pno, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))'
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('members')) {
            return;
        }

        if ($this->hasIndex()) {
            $this->dropIndex();
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement(
                'ALTER TABLE members ADD UNIQUE KEY '.self::INDEX.' (organization_id, pno)'
            );

            return;
        }

        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON members (organization_id, pno)'
        );
    }

    private function dropIndex(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE members DROP INDEX '.self::INDEX);

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE members DROP CONSTRAINT IF EXISTS '.self::INDEX);
            DB::statement('DROP INDEX IF EXISTS '.self::INDEX);

            return;
        }

        DB::statement('DROP INDEX IF EXISTS '.self::INDEX);
    }

    private function hasIndex(): bool
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('members')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === self::INDEX);
        }

        if ($driver === 'pgsql') {
            $hasPgIndex = collect(DB::select(
                'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?',
                ['members', self::INDEX],
            ))->isNotEmpty();

            $hasPgConstraint = collect(DB::select(
                'SELECT conname FROM pg_constraint WHERE conrelid = ?::regclass AND conname = ?',
                ['members', self::INDEX],
            ))->isNotEmpty();

            return $hasPgIndex || $hasPgConstraint;
        }

        return collect(DB::select('SHOW INDEX FROM members WHERE Key_name = ?', [self::INDEX]))->isNotEmpty();
    }
};
