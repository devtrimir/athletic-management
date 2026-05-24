<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('sport_id')->constrained('sports');
            $table->foreignId('session_id')->constrained('sport_sessions');
            $table->foreignId('unit_id')->constrained('units');
            $table->string('name_hi');
            $table->string('in_charge_hi')->nullable();

            $table->softDeletes();
            $table->timestamps();

            // 5-column unique composite — allows the same team name across different units.
            $table->unique(
                ['organization_id', 'sport_id', 'session_id', 'unit_id', 'name_hi'],
                'teams_unique_org_sport_session_unit_name'
            );
            $table->index('organization_id');
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
