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
        if (Schema::hasTable('coach_playing_achievements')) {
            Schema::table('coach_playing_achievements', function (Blueprint $table): void {
                foreach ($this->legacyColumns() as $column => $definition) {
                    if (! Schema::hasColumn('coach_playing_achievements', $column)) {
                        $definition($table);
                    }
                }
            });

            return;
        }

        Schema::create('coach_playing_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('coach_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('period', 20)->nullable();
            $table->string('level', 50)->nullable();
            $table->text('competition_details')->nullable();
            $table->date('event_date')->nullable();
            $table->string('venue', 255)->nullable();
            $table->string('sport_discipline', 100)->nullable();
            $table->string('event', 100)->nullable();
            $table->string('discipline', 255)->nullable();
            $table->string('weight_category', 100)->nullable();
            $table->string('gender_class', 20)->nullable();
            $table->string('medal_type', 40)->nullable();
            $table->unsignedSmallInteger('position')->nullable();
            $table->text('description')->nullable();
            $table->date('achieved_on')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'coach_id'], 'cpa_org_coach_idx');
            $table->index(['organization_id', 'achieved_on'], 'cpa_org_achieved_on_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_playing_achievements');
    }

    /**
     * Columns mirroring the standalone incharge achievements donor shape.
     *
     * @return array<string, callable(Blueprint): void>
     */
    private function legacyColumns(): array
    {
        return [
            'period' => fn (Blueprint $table) => $table->string('period', 20)->nullable()->after('title'),
            'level' => fn (Blueprint $table) => $table->string('level', 50)->nullable()->after('period'),
            'competition_details' => fn (Blueprint $table) => $table->text('competition_details')->nullable()->after('level'),
            'event_date' => fn (Blueprint $table) => $table->date('event_date')->nullable()->after('competition_details'),
            'venue' => fn (Blueprint $table) => $table->string('venue', 255)->nullable()->after('event_date'),
            'sport_discipline' => fn (Blueprint $table) => $table->string('sport_discipline', 100)->nullable()->after('venue'),
            'event' => fn (Blueprint $table) => $table->string('event', 100)->nullable()->after('sport_discipline'),
            'discipline' => fn (Blueprint $table) => $table->string('discipline', 255)->nullable()->after('event'),
            'weight_category' => fn (Blueprint $table) => $table->string('weight_category', 100)->nullable()->after('discipline'),
            'gender_class' => fn (Blueprint $table) => $table->string('gender_class', 20)->nullable()->after('weight_category'),
            'medal_type' => fn (Blueprint $table) => $table->string('medal_type', 40)->nullable()->after('gender_class'),
            'position' => fn (Blueprint $table) => $table->unsignedSmallInteger('position')->nullable()->after('medal_type'),
            'description' => fn (Blueprint $table) => $table->text('description')->nullable()->after('position'),
            'achieved_on' => fn (Blueprint $table) => $table->date('achieved_on')->nullable()->after('description'),
        ];
    }
};
