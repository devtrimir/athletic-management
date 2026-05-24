<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->foreignId('tier_id')->constrained('tournament_tiers');
            $table->foreignId('sport_id')->nullable()->constrained('sports');
            $table->string('name_hi');
            $table->string('venue')->nullable();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->string('raw_date_text')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['session_id', 'tier_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
