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
        Schema::table('coach_certifications', function (Blueprint $table): void {
            $table->string('attachment_original_name')->nullable()->after('attachment_path');
            $table->string('mime_type')->nullable()->after('attachment_original_name');
            $table->unsignedBigInteger('size_bytes')->nullable()->after('mime_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coach_certifications', function (Blueprint $table): void {
            $table->dropColumn(['attachment_original_name', 'mime_type', 'size_bytes']);
        });
    }
};
