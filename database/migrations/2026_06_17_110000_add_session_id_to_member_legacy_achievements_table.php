<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->foreignId('session_id')
                ->nullable()
                ->after('member_id')
                ->constrained('sport_sessions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('session_id');
        });
    }
};
