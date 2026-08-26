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
        $this->modifyMemberStatusEnums(
            [
                'ACTIVE',
                'INACTIVE',
                'RESIGNED',
                'DISMISSED',
                'DECEASED',
                'RETIRED',
                'DOPING_DISQUALIFIED',
            ],
            "ENUM('ACTIVE','INACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED','DOPING_DISQUALIFIED') NOT NULL DEFAULT 'ACTIVE'",
            "ENUM('ACTIVE','INACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED','DOPING_DISQUALIFIED') NOT NULL",
        );
    }

    public function down(): void
    {
        DB::table('members')
            ->where('current_status', 'DOPING_DISQUALIFIED')
            ->update(['current_status' => 'DISMISSED']);
        DB::table('member_status_history')
            ->where('status', 'DOPING_DISQUALIFIED')
            ->update(['status' => 'DISMISSED']);

        $this->modifyMemberStatusEnums(
            [
                'ACTIVE',
                'INACTIVE',
                'RESIGNED',
                'DISMISSED',
                'DECEASED',
                'RETIRED',
            ],
            "ENUM('ACTIVE','INACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED') NOT NULL DEFAULT 'ACTIVE'",
            "ENUM('ACTIVE','INACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED') NOT NULL",
        );
    }

    /**
     * @param  list<string>  $statuses
     */
    private function modifyMemberStatusEnums(array $statuses, string $memberDefinition, string $historyDefinition): void
    {
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE members MODIFY current_status {$memberDefinition}");
            DB::statement("ALTER TABLE member_status_history MODIFY status {$historyDefinition}");

            return;
        }

        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->changeEnumConstraint('members', 'current_status', $statuses, default: 'ACTIVE');
            $this->changeEnumConstraint('member_status_history', 'status', $statuses);

            return;
        }

        Schema::table('members', function (Blueprint $table) use ($statuses): void {
            $table->enum('current_status', $statuses)->default('ACTIVE')->change();
        });
        Schema::table('member_status_history', function (Blueprint $table) use ($statuses): void {
            $table->enum('status', $statuses)->change();
        });
    }

    /**
     * @param  list<string>  $allowedValues
     */
    private function changeEnumConstraint(string $table, string $column, array $allowedValues, ?string $default = null): void
    {
        $constraintName = "{$table}_{$column}_check";
        $values = collect($allowedValues)->map(fn (string $value): string => "'{$value}'")->implode(', ');

        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraintName}");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} TYPE VARCHAR(255)");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} SET NOT NULL");

        if ($default !== null) {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} SET DEFAULT '{$default}'");
        } else {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} DROP DEFAULT");
        }

        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$constraintName} CHECK ({$column} IN ({$values}))");
    }
};
