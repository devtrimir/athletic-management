<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE members MODIFY player_category ENUM('GD', 'SKILLED', 'SPORTS_QUOTA') NOT NULL");
        }

        DB::table('members')
            ->where('player_category', 'SKILLED')
            ->update(['player_category' => 'SPORTS_QUOTA']);

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE members MODIFY player_category ENUM('GD', 'SPORTS_QUOTA') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE members MODIFY player_category ENUM('GD', 'SKILLED', 'SPORTS_QUOTA') NOT NULL");
        }

        DB::table('members')
            ->where('player_category', 'SPORTS_QUOTA')
            ->update(['player_category' => 'SKILLED']);

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE members MODIFY player_category ENUM('GD', 'SKILLED') NOT NULL");
        }
    }
};
