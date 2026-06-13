<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participation_awards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('participation_id')->constrained('participations')->cascadeOnDelete();
            $table->enum('award_type', [
                'BEST_PLAYER',
                'BEST_ATHLETE',
                'BEST_GOALKEEPER',
                'MAN_OF_THE_MATCH',
                'COMMENDATION',
                'OTHER',
            ]);
            $table->string('title', 150);
            $table->unsignedSmallInteger('points_override')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'award_type'], 'pa_org_award_type');
            $table->index(['participation_id', 'award_type'], 'pa_participation_award_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participation_awards');
    }
};
