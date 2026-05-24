<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coach_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('coach_id')->constrained('coaches')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->enum('role', ['HEAD', 'ASSISTANT']);
            $table->timestamps();

            $table->unique(['team_id', 'coach_id', 'role']);
            $table->index('coach_id');
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coach_assignments');
    }
};
