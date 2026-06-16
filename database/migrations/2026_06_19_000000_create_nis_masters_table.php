<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nis_masters', function (Blueprint $table): void {
            $table->id();
            $table->string('kind', 50);
            $table->string('code', 100);
            $table->string('name');
            $table->string('short_name', 100)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['kind', 'code']);
            $table->index(['kind', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nis_masters');
    }
};
