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
        Schema::create('training_venues', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->string('name');
            $table->string('code', 50)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('allowed_radius_meters')->default(200);
            $table->string('photo_path')->nullable();
            $table->enum('status', ['active', 'inactive', 'under_review'])->default('under_review');
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'status']);
            $table->index(['district_id', 'unit_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_venues');
    }
};
