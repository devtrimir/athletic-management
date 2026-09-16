<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX = 'coaches_organization_id_pno_unique';

    public function up(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        if ($this->hasIndex()) {
            $this->dropIndex();
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite' || $driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX.' ON coaches (organization_id, pno) WHERE deleted_at IS NULL'
            );

            return;
        }

        // MySQL 8.0+ functional index fallback
        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON coaches (organization_id, pno, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))'
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        if ($this->hasIndex()) {
            $this->dropIndex();
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement(
                'ALTER TABLE coaches ADD UNIQUE KEY '.self::INDEX.' (organization_id, pno)'
            );

            return;
        }

        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON coaches (organization_id, pno)'
        );
    }

    private function dropIndex(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE coaches DROP INDEX '.self::INDEX);

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE coaches DROP CONSTRAINT IF EXISTS '.self::INDEX);
            DB::statement('DROP INDEX IF EXISTS '.self::INDEX);

            return;
        }

        DB::statement('DROP INDEX IF EXISTS '.self::INDEX);
    }

    private function hasIndex(): bool
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('coaches')"))
                ->contains(fn (object $row): bool => ($row->name ?? null) === self::INDEX);
        }

        if ($driver === 'pgsql') {
            $hasPgIndex = collect(DB::select(
                'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?',
                ['coaches', self::INDEX],
            ))->isNotEmpty();

            $hasPgConstraint = collect(DB::select(
                'SELECT conname FROM pg_constraint WHERE conrelid = ?::regclass AND conname = ?',
                ['coaches', self::INDEX],
            ))->isNotEmpty();

            return $hasPgIndex || $hasPgConstraint;
        }

        return collect(DB::select('SHOW INDEX FROM coaches WHERE Key_name = ?', [self::INDEX]))->isNotEmpty();
    }
};
