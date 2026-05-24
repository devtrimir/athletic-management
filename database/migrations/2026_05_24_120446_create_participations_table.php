<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members');
            $table->foreignId('team_id')->nullable()->constrained('teams');
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->smallInteger('position')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'member_id']);
            $table->index(['session_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participations');
    }
};
