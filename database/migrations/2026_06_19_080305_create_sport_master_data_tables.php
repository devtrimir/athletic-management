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
            $table->string('code', 50)->nullable()->after('name');
            $table->text('description')->nullable()->after('category');
            $table->boolean('is_active')->default(true)->after('description');
            $table->unsignedSmallInteger('sort_order')->default(0)->after('is_active');

            $table->unique(['organization_id', 'code'], 'sports_organization_id_code_unique');
            $table->index(['organization_id', 'is_active', 'sort_order'], 'sports_org_active_sort_idx');
        });

        Schema::create('participation_formats', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('min_players')->nullable();
            $table->unsignedSmallInteger('max_players')->nullable();
            $table->boolean('is_team_based')->default(false);
            $table->boolean('is_mixed')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('gender_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('age_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->unsignedTinyInteger('min_age')->nullable();
            $table->unsignedTinyInteger('max_age')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('measurement_units', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->string('symbol', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('result_types', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('sport_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 100);
            $table->string('discipline_type', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['sport_id', 'code']);
            $table->index(['sport_id', 'is_active', 'sort_order'], 'sport_events_sport_active_sort_idx');
        });

        Schema::create('weight_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->foreignId('gender_category_id')->nullable()->constrained('gender_categories')->nullOnDelete();
            $table->string('name');
            $table->string('code', 100);
            $table->decimal('min_weight', 6, 2)->nullable();
            $table->decimal('max_weight', 6, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['sport_id', 'gender_category_id', 'code'], 'weight_categories_sport_gender_code_unique');
            $table->index(['sport_id', 'is_active', 'sort_order'], 'weight_categories_sport_active_sort_idx');
        });

        Schema::create('sport_event_variants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->foreignId('sport_event_id')->constrained('sport_events')->cascadeOnDelete();
            $table->foreignId('participation_format_id')->constrained('participation_formats');
            $table->foreignId('gender_category_id')->constrained('gender_categories');
            $table->foreignId('age_category_id')->nullable()->constrained('age_categories')->nullOnDelete();
            $table->foreignId('weight_category_id')->nullable()->constrained('weight_categories')->nullOnDelete();
            $table->foreignId('measurement_unit_id')->nullable()->constrained('measurement_units')->nullOnDelete();
            $table->foreignId('result_type_id')->nullable()->constrained('result_types')->nullOnDelete();
            $table->string('name');
            $table->string('code', 150);
            $table->unsignedSmallInteger('min_participants')->nullable();
            $table->unsignedSmallInteger('max_participants')->nullable();
            $table->unsignedSmallInteger('min_male_participants')->nullable();
            $table->unsignedSmallInteger('max_male_participants')->nullable();
            $table->unsignedSmallInteger('min_female_participants')->nullable();
            $table->unsignedSmallInteger('max_female_participants')->nullable();
            $table->boolean('substitute_allowed')->default(false);
            $table->unsignedSmallInteger('substitute_limit')->nullable();
            $table->boolean('is_team_based')->default(false);
            $table->boolean('is_medal_event')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['sport_id', 'code']);
            $table->index(['sport_event_id', 'gender_category_id'], 'sport_event_variants_event_gender_idx');
            $table->index(['sport_id', 'is_active', 'sort_order'], 'sport_event_variants_sport_active_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sport_event_variants');
        Schema::dropIfExists('weight_categories');
        Schema::dropIfExists('sport_events');
        Schema::dropIfExists('result_types');
        Schema::dropIfExists('measurement_units');
        Schema::dropIfExists('age_categories');
        Schema::dropIfExists('gender_categories');
        Schema::dropIfExists('participation_formats');

        Schema::table('sports', function (Blueprint $table): void {
            $table->dropIndex('sports_org_active_sort_idx');
            $table->dropUnique('sports_organization_id_code_unique');
            $table->dropColumn(['code', 'description', 'is_active', 'sort_order']);
        });
    }
};
