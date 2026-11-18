<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_coaching_assignments', function (Blueprint $table): void {
            $table->boolean('coach_history_access')->default(false)->after('attendance_mode');
        });
    }

    public function down(): void
    {
        Schema::table('external_coaching_assignments', function (Blueprint $table): void {
            $table->dropColumn('coach_history_access');
        });
    }
};
