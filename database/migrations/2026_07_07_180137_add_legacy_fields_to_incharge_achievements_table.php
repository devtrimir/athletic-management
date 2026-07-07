<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incharge_achievements', function (Blueprint $table): void {
            $table->string('period', 20)->nullable()->after('title');
            $table->string('level', 50)->nullable()->after('period');
            $table->text('competition_details')->nullable()->after('level');
            $table->date('event_date')->nullable()->after('competition_details');
            $table->string('venue', 255)->nullable()->after('event_date');
            $table->string('sport_discipline', 100)->nullable()->after('venue');
            $table->string('event', 100)->nullable()->after('sport_discipline');
            $table->string('discipline', 255)->nullable()->after('event');
            $table->string('weight_category', 100)->nullable()->after('discipline');
            $table->string('gender_class', 20)->nullable()->after('weight_category');
            $table->string('medal_type', 40)->nullable()->after('gender_class');
            $table->unsignedSmallInteger('position')->nullable()->after('medal_type');
            $table->index(['period', 'level'], 'iac_legacy_fields_idx');
        });
    }

    public function down(): void
    {
        Schema::table('incharge_achievements', function (Blueprint $table): void {
            $table->dropIndex('iac_legacy_fields_idx');
            $table->dropColumn([
                'period',
                'level',
                'competition_details',
                'event_date',
                'venue',
                'sport_discipline',
                'event',
                'discipline',
                'weight_category',
                'gender_class',
                'medal_type',
                'position',
            ]);
        });
    }
};
