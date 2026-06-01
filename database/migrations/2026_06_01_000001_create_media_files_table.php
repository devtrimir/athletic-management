<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            // Polymorphic: Participation | Achievement
            $table->string('mediable_type');
            $table->unsignedBigInteger('mediable_id');

            $table->string('disk', 20)->default('public');
            $table->string('path')->unique();                    // deterministic, globally unique
            $table->string('original_name', 255);
            $table->string('mime_type', 50);                    // image/jpeg | image/png | image/webp
            $table->unsignedInteger('size_bytes');
            $table->string('caption_hi', 500)->nullable();      // optional Hindi caption
            $table->foreignId('uploaded_by')->constrained('users');

            $table->timestamps();

            $table->index(['mediable_type', 'mediable_id'], 'mf_mediable');
            $table->index(['organization_id', 'uploaded_by'], 'mf_org_uploader');
            $table->index(['organization_id', 'created_at'], 'mf_org_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_files');
    }
};
