<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_coach_sport', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('external_coach_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['external_coach_id', 'sport_id']);
        });

        Schema::create('external_coach_training_venue', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('external_coach_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_venue_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['external_coach_id', 'training_venue_id'], 'ec_training_venue_unique');
        });

        Schema::create('external_coach_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('external_coach_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size_bytes');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['external_coach_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_coach_documents');
        Schema::dropIfExists('external_coach_training_venue');
        Schema::dropIfExists('external_coach_sport');
    }
};
