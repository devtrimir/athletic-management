<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->unsignedSmallInteger('position')->nullable()->after('medal_type');
            $table->text('remarks')->nullable()->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->dropColumn(['position', 'remarks']);
        });
    }
};
