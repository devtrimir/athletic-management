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
        Schema::table('incharge_achievements', function (Blueprint $table): void {
            if (! Schema::hasColumn('incharge_achievements', 'sport_id')) {
                $table->foreignId('sport_id')
                    ->nullable()
                    ->after('venue')
                    ->constrained('sports')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('incharge_achievements', 'event_type')) {
                $table->string('event_type', 20)
                    ->nullable()
                    ->after('medal_type');
            }

            if (! Schema::hasColumn('incharge_achievements', 'description')) {
                $table->text('description')->nullable()->after('position');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incharge_achievements', function (Blueprint $table): void {
            $columns = [];

            if (Schema::hasColumn('incharge_achievements', 'sport_id')) {
                $columns[] = 'sport_id';
            }

            if (Schema::hasColumn('incharge_achievements', 'event_type')) {
                $columns[] = 'event_type';
            }

            if (Schema::hasColumn('incharge_achievements', 'description')) {
                $columns[] = 'description';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
