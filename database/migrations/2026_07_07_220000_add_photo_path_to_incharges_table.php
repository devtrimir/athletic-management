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
        Schema::table('incharges', function (Blueprint $table): void {
            if (! Schema::hasColumn('incharges', 'photo_path')) {
                $table->string('photo_path')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('incharges') && Schema::hasColumn('incharges', 'photo_path')) {
            Schema::table('incharges', function (Blueprint $table): void {
                $table->dropColumn('photo_path');
            });
        }
    }
};
