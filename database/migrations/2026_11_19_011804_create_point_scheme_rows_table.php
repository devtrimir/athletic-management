<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_scheme_rows', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('point_scheme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_level_id')->constrained()->restrictOnDelete();
            $table->string('result', 20); // GOLD | SILVER | BRONZE | PARTICIPATION
            $table->unsignedSmallInteger('points')->default(0);
            $table->timestamps();

            $table->unique(['point_scheme_id', 'game_level_id', 'result']);
        });

        Schema::table('tournaments', function (Blueprint $table): void {
            $table->foreignId('competition_id')->nullable()->after('tier_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('competition_id');
        });

        Schema::dropIfExists('point_scheme_rows');
    }
};
