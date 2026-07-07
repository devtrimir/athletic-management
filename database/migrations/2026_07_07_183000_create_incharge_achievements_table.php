<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incharge_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incharge_id')->constrained('incharges')->cascadeOnDelete();
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->date('achieved_on')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'incharge_id'], 'iac_org_incharge_idx');
            $table->index(['organization_id', 'achieved_on'], 'iac_org_achieved_on_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incharge_achievements');
    }
};
