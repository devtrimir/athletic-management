<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->cascadeOnDelete();
            $table->enum('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT']);
            $table->smallInteger('position')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index('medal_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('achievements');
    }
};
