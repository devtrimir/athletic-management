<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('incharge_achievements')) {
            return;
        }

        Schema::table('incharge_achievements', function (Blueprint $table): void {
            if (! Schema::hasColumn('incharge_achievements', 'period')) {
                $table->string('period', 20)->nullable()->after('title');
            }

            if (! Schema::hasColumn('incharge_achievements', 'level')) {
                $table->string('level', 50)->nullable()->after('period');
            }

            if (! Schema::hasColumn('incharge_achievements', 'competition_details')) {
                $table->text('competition_details')->nullable()->after('level');
            }

            if (! Schema::hasColumn('incharge_achievements', 'event_date')) {
                $table->date('event_date')->nullable()->after('competition_details');
            }

            if (! Schema::hasColumn('incharge_achievements', 'venue')) {
                $table->string('venue', 255)->nullable()->after('event_date');
            }

            if (! Schema::hasColumn('incharge_achievements', 'sport_discipline')) {
                $table->string('sport_discipline', 100)->nullable()->after('venue');
            }

            if (! Schema::hasColumn('incharge_achievements', 'event')) {
                $table->string('event', 100)->nullable()->after('sport_discipline');
            }

            if (! Schema::hasColumn('incharge_achievements', 'discipline')) {
                $table->string('discipline', 255)->nullable()->after('event');
            }

            if (! Schema::hasColumn('incharge_achievements', 'weight_category')) {
                $table->string('weight_category', 100)->nullable()->after('discipline');
            }

            if (! Schema::hasColumn('incharge_achievements', 'gender_class')) {
                $table->string('gender_class', 20)->nullable()->after('weight_category');
            }

            if (! Schema::hasColumn('incharge_achievements', 'medal_type')) {
                $table->string('medal_type', 40)->nullable()->after('gender_class');
            }

            if (! Schema::hasColumn('incharge_achievements', 'position')) {
                $table->unsignedSmallInteger('position')->nullable()->after('medal_type');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('incharge_achievements')) {
            return;
        }

        Schema::table('incharge_achievements', function (Blueprint $table): void {
            $columns = [
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
            ];

            $existingColumns = array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('incharge_achievements', $column),
            );

            if ($existingColumns !== []) {
                $table->dropColumn($existingColumns);
            }
        });
    }
};
