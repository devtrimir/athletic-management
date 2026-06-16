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
        Schema::table('team_member_movements', function (Blueprint $table): void {
            $table->string('source', 40)->default('manual');
            $table->uuid('batch_uuid')->nullable();
            $table->json('metadata')->nullable();
            $table->index(['source', 'batch_uuid']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_member_movements', function (Blueprint $table): void {
            $table->dropIndex(['source', 'batch_uuid']);
            $table->dropColumn(['source', 'batch_uuid', 'metadata']);
        });
    }
};
