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
        Schema::create('external_training_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id');
            $table->foreignId('external_coaching_assignment_id');
            $table->foreignId('member_id');
            $table->foreignId('external_coach_id');
            $table->foreignId('training_venue_id');
            $table->date('attendance_date');
            $table->string('attendance_status', 30)->default('present');
            $table->string('review_status', 30)->default('pending');
            $table->foreignId('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_remarks')->nullable();
            $table->string('geo_status', 60)->default('manual_review_required');
            $table->text('flag_reason')->nullable();
            $table->text('coach_remarks')->nullable();
            $table->timestamp('submitted_at');
            $table->decimal('submitted_latitude', 10, 7)->nullable();
            $table->decimal('submitted_longitude', 10, 7)->nullable();
            $table->unsignedInteger('submitted_gps_accuracy')->nullable();
            $table->decimal('distance_from_venue_meters', 10, 2)->nullable();
            $table->string('submitted_photo_path');
            $table->string('submitted_photo_original_name')->nullable();
            $table->string('submitted_photo_mime_type', 100)->nullable();
            $table->unsignedBigInteger('submitted_photo_size_bytes')->nullable();
            $table->timestamp('check_in_at')->nullable();
            $table->decimal('check_in_latitude', 10, 7)->nullable();
            $table->decimal('check_in_longitude', 10, 7)->nullable();
            $table->unsignedInteger('check_in_gps_accuracy')->nullable();
            $table->string('check_in_photo_path')->nullable();
            $table->decimal('check_in_distance_from_venue_meters', 10, 2)->nullable();
            $table->string('check_in_geo_status', 60)->nullable();
            $table->timestamp('check_out_at')->nullable();
            $table->decimal('check_out_latitude', 10, 7)->nullable();
            $table->decimal('check_out_longitude', 10, 7)->nullable();
            $table->unsignedInteger('check_out_gps_accuracy')->nullable();
            $table->string('check_out_photo_path')->nullable();
            $table->decimal('check_out_distance_from_venue_meters', 10, 2)->nullable();
            $table->string('check_out_geo_status', 60)->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->decimal('venue_latitude_snapshot', 10, 7)->nullable();
            $table->decimal('venue_longitude_snapshot', 10, 7)->nullable();
            $table->unsignedInteger('allowed_radius_meters_snapshot')->nullable();
            $table->string('venue_name_snapshot')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('device_info')->nullable();
            $table->string('browser_timezone')->nullable();
            $table->string('submitted_source', 30)->default('external_coach_portal');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['external_coaching_assignment_id', 'member_id', 'attendance_date'], 'external_training_attendance_unique');
            $table->foreign('organization_id', 'eta_org_fk')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('external_coaching_assignment_id', 'eta_assignment_fk')->references('id')->on('external_coaching_assignments')->cascadeOnDelete();
            $table->foreign('member_id', 'eta_member_fk')->references('id')->on('members')->cascadeOnDelete();
            $table->foreign('external_coach_id', 'eta_coach_fk')->references('id')->on('external_coaches')->cascadeOnDelete();
            $table->foreign('training_venue_id', 'eta_venue_fk')->references('id')->on('training_venues')->cascadeOnDelete();
            $table->foreign('reviewed_by', 'eta_reviewer_fk')->references('id')->on('users')->nullOnDelete();
            $table->index(['organization_id', 'attendance_date'], 'eta_org_date_idx');
            $table->index(['external_coach_id', 'attendance_date'], 'eta_coach_date_idx');
            $table->index(['review_status', 'geo_status'], 'eta_review_geo_idx');
            $table->index(['reviewed_by', 'reviewed_at'], 'eta_reviewer_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_training_attendances');
    }
};
