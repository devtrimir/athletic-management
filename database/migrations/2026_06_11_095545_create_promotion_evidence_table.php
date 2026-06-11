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
        Schema::create('promotion_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('member_promotion_id')->constrained('member_promotions')->cascadeOnDelete();
            $table->morphs('evidencable');
            $table->timestamps();

            $table->unique(['member_promotion_id', 'evidencable_type', 'evidencable_id'], 'promotion_evidence_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotion_evidences');
    }
};
