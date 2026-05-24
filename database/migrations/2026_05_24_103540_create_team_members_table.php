<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->enum('role', ['PLAYER', 'CAPTAIN', 'RESERVE'])->default('PLAYER');
            $table->date('joined_on')->nullable();
            $table->date('left_on')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'member_id']);
            $table->index('member_id');
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
