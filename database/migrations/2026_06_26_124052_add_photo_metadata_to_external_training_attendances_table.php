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
        Schema::table('external_training_attendances', function (Blueprint $table) {
            $table->timestamp('submitted_photo_uploaded_at')->nullable()->after('submitted_photo_size_bytes');
            $table->unsignedInteger('submitted_photo_width')->nullable()->after('submitted_photo_uploaded_at');
            $table->unsignedInteger('submitted_photo_height')->nullable()->after('submitted_photo_width');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('external_training_attendances', function (Blueprint $table) {
            $table->dropColumn([
                'submitted_photo_uploaded_at',
                'submitted_photo_width',
                'submitted_photo_height',
            ]);
        });
    }
};
