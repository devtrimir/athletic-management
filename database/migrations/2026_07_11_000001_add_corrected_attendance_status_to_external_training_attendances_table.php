<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_training_attendances', function (Blueprint $table): void {
            $table->string('corrected_attendance_status', 30)->nullable()->after('attendance_status');
        });
    }

    public function down(): void
    {
        Schema::table('external_training_attendances', function (Blueprint $table): void {
            $table->dropColumn('corrected_attendance_status');
        });
    }
};
