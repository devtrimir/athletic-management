<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_legacy_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();

            // PRE_RECRUITMENT = achievements before joining police
            // POST_RECRUITMENT = police-era achievements recorded outside this system
            $table->enum('period', ['PRE_RECRUITMENT', 'POST_RECRUITMENT']);

            // Reuses tournament_tiers codes for consistency; AIPSC only valid for POST_RECRUITMENT
            $table->enum('level', ['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER']);

            $table->text('competition_details');         // प्रतियोगिता का विवरण
            $table->date('event_date')->nullable();       // दिनांक
            $table->string('venue', 255)->nullable();     // स्थान
            $table->string('sport_discipline', 100)->nullable(); // खेल विधा (free text – pre-system)
            $table->string('event', 100)->nullable();     // इवेन्ट / वेट कैटेगरी

            $table->enum('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])->nullable();

            $table->smallInteger('sort_order')->nullable()->comment('Manual display ordering within level');

            $table->timestamps();

            $table->index(['organization_id', 'member_id', 'period', 'level'], 'mla_org_member_period_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_legacy_achievements');
    }
};
