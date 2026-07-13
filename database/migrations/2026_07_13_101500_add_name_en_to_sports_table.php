<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sports', function (Blueprint $table): void {
            if (! Schema::hasColumn('sports', 'name_en')) {
                $table->string('name_en')->nullable()->after('name');
                $table->index(['organization_id', 'name_en'], 'sports_organization_id_name_en_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sports', function (Blueprint $table): void {
            if (Schema::hasColumn('sports', 'name_en')) {
                $table->dropIndex('sports_organization_id_name_en_idx');
                $table->dropColumn('name_en');
            }
        });
    }
};
