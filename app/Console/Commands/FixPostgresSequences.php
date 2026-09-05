<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('db:fix-sequences {--connection= : The database connection to use} {--schema=public : The PostgreSQL schema to fix}')]
#[Description('Sync all PostgreSQL sequences with the max value of their columns (useful after importing a database dump)')]
class FixPostgresSequences extends Command
{
    public function handle(): int
    {
        $connection = DB::connection($this->option('connection'));

        if ($connection->getDriverName() !== 'pgsql') {
            $this->components->warn('This command only applies to PostgreSQL connections.');

            return self::FAILURE;
        }

        $schema = $this->option('schema');

        $columns = $connection->select(
            <<<'SQL'
            SELECT
                quote_ident(t.table_schema) || '.' || quote_ident(t.table_name) AS qualified_table,
                quote_ident(c.column_name) AS quoted_column,
                c.column_default
            FROM information_schema.tables t
            JOIN information_schema.columns c
                ON c.table_schema = t.table_schema
               AND c.table_name = t.table_name
            WHERE t.table_type = 'BASE TABLE'
              AND t.table_schema = ?
              AND c.column_default LIKE 'nextval%'
            ORDER BY t.table_name, c.column_name
            SQL,
            [$schema]
        );

        if ($columns === []) {
            $this->components->warn("No serial columns found in schema [{$schema}].");

            return self::SUCCESS;
        }

        $fixed = 0;

        foreach ($columns as $column) {
            if (preg_match("/nextval\('([^']+)'::regclass\)/", $column->column_default, $matches) !== 1) {
                continue;
            }

            // The default may reference a schema-qualified sequence; keep only the sequence name.
            $sequenceName = str_contains($matches[1], '.')
                ? substr($matches[1], (int) strrpos($matches[1], '.') + 1)
                : $matches[1];

            $sequence = $connection->selectOne(
                <<<'SQL'
                SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'S'
                  AND c.relname = ?
                ORDER BY (n.nspname = ?) DESC
                LIMIT 1
                SQL,
                [$sequenceName, $schema]
            );

            if ($sequence === null) {
                $this->components->warn("Sequence [{$sequenceName}] not found for {$column->qualified_table}.{$column->quoted_column}; skipped.");

                continue;
            }

            $maxId = $connection->selectOne(
                "SELECT COALESCE(MAX({$column->quoted_column}), 0) AS max_id FROM {$column->qualified_table}"
            )->max_id;

            $connection->selectOne(
                'SELECT setval(?, GREATEST(?, 1), true)',
                [$sequence->qualified_name, $maxId]
            );

            $this->components->twoColumnDetail(
                "{$column->qualified_table}.{$column->quoted_column}",
                "{$sequence->qualified_name} => {$maxId}"
            );

            $fixed++;
        }

        $this->components->info("Synced {$fixed} sequence(s) in schema [{$schema}].");

        return self::SUCCESS;
    }
}
