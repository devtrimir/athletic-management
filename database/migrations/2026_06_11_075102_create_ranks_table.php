<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ranks', function (Blueprint $table) {
            $table->id();

            $table->string('code', 50)->unique();

            $table->string('name_en');
            $table->string('short_name', 100)->nullable();
            $table->string('name_hi')->nullable();

            $table->unsignedSmallInteger('rank_order')->index();

            $table->string('cadre_type', 50)->nullable()->index();

            $table->boolean('is_gazetted')->default(false)->index();

            $table->json('aliases')->nullable();

            $table->boolean('is_active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ranks');
    }
};
