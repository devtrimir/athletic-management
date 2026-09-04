<?php

declare(strict_types=1);

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
        if (! Schema::hasTable('coaches')) {
            return;
        }

        if (Schema::hasColumn('coaches', 'nis_certified')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->dropColumn('nis_certified');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        if (! Schema::hasColumn('coaches', 'nis_certified')) {
            Schema::table('coaches', function (Blueprint $table): void {
                $table->boolean('nis_certified')->default(false);
            });
        }
    }
};
