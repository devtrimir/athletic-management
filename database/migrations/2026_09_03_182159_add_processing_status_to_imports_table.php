<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private const UP_STATUSES = ['UPLOADED', 'PARSING', 'READY_FOR_REVIEW', 'APPLYING', 'PROCESSING', 'COMPLETED', 'FAILED'];

    /** @var list<string> */
    private const DOWN_STATUSES = ['UPLOADED', 'PARSING', 'READY_FOR_REVIEW', 'APPLYING', 'COMPLETED', 'FAILED'];

    public function up(): void
    {
        $this->changeStatusColumn(self::UP_STATUSES);
    }

    public function down(): void
    {
        $this->changeStatusColumn(self::DOWN_STATUSES);
    }

    /**
     * Laravel's Postgres grammar compiles an enum ->change() into
     * "alter column ... type varchar(255) check (...)", which Postgres
     * rejects (check constraints can't be inlined in ALTER TYPE), so the
     * conversion is done with raw statements there.
     *
     * @param  list<string>  $statuses
     */
    private function changeStatusColumn(array $statuses): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('imports', function (Blueprint $table) use ($statuses): void {
                $table->enum('status', $statuses)->default('UPLOADED')->change();
            });

            return;
        }

        $allowed = implode(', ', array_map(static fn (string $status): string => "'{$status}'", $statuses));

        DB::statement('ALTER TABLE imports ALTER COLUMN status DROP DEFAULT');
        DB::statement('ALTER TABLE imports DROP CONSTRAINT IF EXISTS imports_status_check');
        DB::statement('ALTER TABLE imports ALTER COLUMN status TYPE varchar(255)');
        DB::statement("ALTER TABLE imports ADD CONSTRAINT imports_status_check CHECK (status IN ({$allowed}))");
        DB::statement("ALTER TABLE imports ALTER COLUMN status SET DEFAULT 'UPLOADED'");
        DB::statement('ALTER TABLE imports ALTER COLUMN status SET NOT NULL');
    }
};
