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
        Schema::table('districts', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('units', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('ranks', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('designations', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('nis_masters', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('coaches', function (Blueprint $table): void {
            $table->string('full_name_en')->nullable()->after('full_name');
            $table->string('designation_en')->nullable()->after('designation');
            $table->string('display_name_en')->nullable()->after('display_name');
        });

        Schema::table('incharges', function (Blueprint $table): void {
            $table->string('full_name_en')->nullable()->after('full_name');
            $table->string('rank_en')->nullable()->after('rank');
            $table->string('designation_en')->nullable()->after('designation');
        });

        Schema::table('external_coaches', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
            $table->string('city_en')->nullable()->after('city');
        });

        Schema::table('participation_formats', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('gender_categories', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('age_categories', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('measurement_units', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('result_types', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('sport_events', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('weight_categories', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });

        Schema::table('sport_event_variants', function (Blueprint $table): void {
            $table->string('name_en')->nullable()->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('districts', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('units', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('ranks', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('designations', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('nis_masters', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('coaches', function (Blueprint $table): void {
            $table->dropColumn(['full_name_en', 'designation_en', 'display_name_en']);
        });

        Schema::table('incharges', function (Blueprint $table): void {
            $table->dropColumn(['full_name_en', 'rank_en', 'designation_en']);
        });

        Schema::table('external_coaches', function (Blueprint $table): void {
            $table->dropColumn(['name_en', 'city_en']);
        });

        Schema::table('participation_formats', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('gender_categories', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('age_categories', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('measurement_units', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('result_types', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('sport_events', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('weight_categories', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });

        Schema::table('sport_event_variants', function (Blueprint $table): void {
            $table->dropColumn('name_en');
        });
    }
};
