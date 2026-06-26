<?php

declare(strict_types=1);

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
        Schema::create('external_coaching_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('external_coach_id')->constrained('external_coaches')->restrictOnDelete();
            $table->foreignId('training_venue_id')->constrained('training_venues')->restrictOnDelete();
            $table->foreignId('sport_id')->constrained('sports')->restrictOnDelete();
            $table->foreignId('sport_event_id')->nullable()->constrained('sport_events')->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->json('training_days')->nullable();
            $table->time('training_start_time')->nullable();
            $table->time('training_end_time')->nullable();
            $table->enum('attendance_mode', ['single_mark', 'check_in_check_out'])->default('single_mark');
            $table->string('permission_reference_number')->nullable();
            $table->string('permission_document_path')->nullable();
            $table->string('permission_document_original_name')->nullable();
            $table->string('permission_document_mime_type', 100)->nullable();
            $table->unsignedInteger('permission_document_size_bytes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'cancelled', 'rejected', 'expired'])->default('draft');
            $table->text('cancellation_reason')->nullable();
            $table->text('completion_remarks')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['member_id', 'sport_id', 'start_date', 'end_date'], 'external_assignments_member_sport_dates_idx');
            $table->index(['external_coach_id', 'status']);
            $table->index(['training_venue_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_coaching_assignments');
    }
};
