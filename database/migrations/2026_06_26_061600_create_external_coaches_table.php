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
        Schema::create('external_coaches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('email');
            $table->string('password');
            $table->string('photo_path')->nullable();
            $table->enum('gender', ['M', 'F', 'O'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->string('city')->nullable();
            $table->unsignedTinyInteger('experience_years')->nullable();
            $table->text('certification_details')->nullable();
            $table->string('id_proof_path')->nullable();
            $table->string('emergency_contact', 50)->nullable();
            $table->text('remarks')->nullable();
            $table->enum('status', ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'])->default('pending_invite');
            $table->timestamp('last_login_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->rememberToken();
            $table->softDeletes();
            $table->timestamps();

            $table->unique('email');
            $table->unique('phone');
            $table->index(['organization_id', 'status']);
        });

        Schema::create('external_coach_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('external_coach_id')->constrained('external_coaches')->cascadeOnDelete();
            $table->enum('status', ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted']);
            $table->text('reason')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at');
            $table->timestamps();

            $table->index(['external_coach_id', 'recorded_at'], 'ec_status_hist_coach_recorded_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_coach_status_histories');
        Schema::dropIfExists('external_coaches');
    }
};
