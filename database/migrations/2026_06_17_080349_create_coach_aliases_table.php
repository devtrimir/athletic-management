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
        Schema::create('coach_aliases', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->cascadeOnDelete();
            $table->string('alias');
            $table->string('alias_normalized')->nullable();
            $table->enum('source', ['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual'])->default('manual');
            $table->timestamps();

            $table->index('coach_id');
            $table->index('alias');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_aliases');
    }
};
