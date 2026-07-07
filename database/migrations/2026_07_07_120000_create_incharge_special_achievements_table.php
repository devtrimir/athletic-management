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
        Schema::create('incharge_special_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incharge_id')->constrained()->cascadeOnDelete();
            $table->enum('achievement_type', [
                'COMMENDATION_DISC',
                'APPRECIATION_LETTER',
                'HONOUR_CERTIFICATE',
                'SPECIAL_RECOGNITION',
                'OTHER',
            ]);
            $table->string('title', 150);
            $table->date('awarded_on')->nullable();
            $table->string('issuing_authority', 150)->nullable();
            $table->string('order_reference', 100)->nullable();
            $table->string('place', 150)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'incharge_id', 'achievement_type'], 'isaa_org_incharge_type_idx');
            $table->index(['organization_id', 'awarded_on'], 'isaa_org_awarded_on_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incharge_special_achievements');
    }
};
