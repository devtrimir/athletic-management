<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incharge_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incharge_id')->constrained('incharges')->cascadeOnDelete();
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

            $table->index(['organization_id', 'incharge_id'], 'iac_org_incharge_idx');
            $table->index(['organization_id', 'achieved_on'], 'iac_org_achieved_on_idx');
            $table->index(['period', 'level'], 'iac_legacy_fields_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incharge_achievements');
    }
};
