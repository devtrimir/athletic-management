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
        Schema::create('external_coach_performance_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id');
            $table->foreignId('external_coaching_assignment_id');
            $table->foreignId('member_id');
            $table->foreignId('external_coach_id');
            $table->foreignId('sport_id');
            $table->date('update_date');
            $table->string('performance_level', 30)->nullable();
            $table->unsignedTinyInteger('performance_score')->nullable();
            $table->text('training_summary');
            $table->text('improvement_notes')->nullable();
            $table->text('injury_or_fitness_notes')->nullable();
            $table->text('next_focus')->nullable();
            $table->string('review_status', 30)->default('pending');
            $table->foreignId('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_remarks')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id', 'ecpu_org_fk')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('external_coaching_assignment_id', 'ecpu_assignment_fk')->references('id')->on('external_coaching_assignments')->cascadeOnDelete();
            $table->foreign('member_id', 'ecpu_member_fk')->references('id')->on('members')->cascadeOnDelete();
            $table->foreign('external_coach_id', 'ecpu_coach_fk')->references('id')->on('external_coaches')->cascadeOnDelete();
            $table->foreign('sport_id', 'ecpu_sport_fk')->references('id')->on('sports')->cascadeOnDelete();
            $table->foreign('reviewed_by', 'ecpu_reviewer_fk')->references('id')->on('users')->nullOnDelete();
            $table->index(['organization_id', 'update_date'], 'ecpu_org_date_idx');
            $table->index(['member_id', 'update_date'], 'ecpu_member_date_idx');
            $table->index(['external_coach_id', 'update_date'], 'ecpu_coach_date_idx');
            $table->index(['review_status', 'reviewed_at'], 'ecpu_review_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_coach_performance_updates');
    }
};
