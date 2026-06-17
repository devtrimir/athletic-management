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
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('location_type', 20)->default('unit');
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->string('name');
            $table->string('in_charge')->nullable();
            $table->boolean('is_active')->default(true);

            $table->softDeletes();
            $table->timestamps();

            $table->unique(
                ['organization_id', 'sport_id', 'session_id', 'location_type', 'district_id', 'unit_id', 'name'],
                'teams_unique_org_sport_session_location_name'
            );

            $table->index('organization_id');
            $table->index('session_id');
            $table->index('location_type');
            $table->index('district_id');
            $table->index('unit_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
