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

        if (!Schema::hasColumn('members', 'initial_rank')) {
            Schema::table('members', function (Blueprint $table) {
                $table->string('initial_rank', 100)->nullable()->after('rank');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

        if (Schema::hasColumn('memebers', 'initial_rank')) {
            Schema::table('members', function (Blueprint $table) {
                $table->dropColumn('initial_rank');
            });
        }
    }
};
