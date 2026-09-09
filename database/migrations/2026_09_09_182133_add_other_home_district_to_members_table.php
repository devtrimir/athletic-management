<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('members', 'other_home_district')) {
            Schema::table('members', function (Blueprint $table) {
                $table->string('other_home_district', 255)->nullable()->after('home_district_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('members', 'other_home_district')) {
            Schema::table('members', function (Blueprint $table) {
                $table->dropColumn('other_home_district');
            });
        }
    }
};
