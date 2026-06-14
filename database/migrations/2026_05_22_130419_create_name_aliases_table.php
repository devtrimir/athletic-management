<?php

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
        Schema::create('name_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('alias');
            $table->string('alias_normalized')->nullable()->comment('Populated by normalize_devanagari trigger in P2-T04');
            $table->enum('source', ['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual']);
            $table->timestamps();

            $table->index('member_id');
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('name_aliases');
    }
};
