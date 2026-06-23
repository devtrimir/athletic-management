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
        $this->modifyMemberStatusEnums([
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

    public function down(): void
    {
        DB::table('members')->where('current_status', 'INACTIVE')->update(['current_status' => 'RETIRED']);
        DB::table('member_status_history')->where('status', 'INACTIVE')->update(['status' => 'RETIRED']);

        $this->modifyMemberStatusEnums([
            'ACTIVE',
            'RESIGNED',
            'DISMISSED',
            'DECEASED',
            'RETIRED',
        ],
            "ENUM('ACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED') NOT NULL DEFAULT 'ACTIVE'",
            "ENUM('ACTIVE','RESIGNED','DISMISSED','DECEASED','RETIRED') NOT NULL",
        );
    }

    /**
     * @param  list<string>  $statuses
     */
    private function modifyMemberStatusEnums(array $statuses, string $memberDefinition, string $historyDefinition): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            Schema::table('members', function (Blueprint $table) use ($statuses): void {
                $table->enum('current_status', $statuses)->default('ACTIVE')->change();
            });
            Schema::table('member_status_history', function (Blueprint $table) use ($statuses): void {
                $table->enum('status', $statuses)->change();
            });

            return;
        }

        DB::statement("ALTER TABLE members MODIFY current_status {$memberDefinition}");
        DB::statement("ALTER TABLE member_status_history MODIFY status {$historyDefinition}");
    }
};
