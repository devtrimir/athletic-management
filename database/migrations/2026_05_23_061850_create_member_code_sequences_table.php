<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tracks per-(organization, year) sequences used by MemberCodeGenerator
     * to produce UPP-{year}-{6-digit-seq} codes without gaps or duplicates.
     */
    public function up(): void
    {
        Schema::create('member_code_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('last_seq')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_code_sequences');
    }
};
