<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('designations', function (Blueprint $table) {
            $table->id();

            $table->string('code', 50)->unique();

            $table->string('name_en');
            $table->string('short_name', 100)->nullable();
            $table->string('name_hi')->nullable();

            $table->unsignedSmallInteger('designation_order')->index();

            $table->string('mapped_rank_code', 50)->nullable()->index();

            $table->string('designation_type', 100)->nullable()->index();

            $table->boolean('is_active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('mapped_rank_code')
                ->references('code')
                ->on('ranks')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('designations');
    }
};
