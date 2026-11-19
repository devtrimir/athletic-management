<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_level_id')->constrained()->restrictOnDelete();
            $table->string('name_en');
            $table->string('name_hi');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'name_en']);
            $table->index(['game_level_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitions');
    }
};
