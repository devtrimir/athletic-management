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
        Schema::create('coaches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            // Optional link to a member record (when the coach is also a serving constable).
            $table->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();

            $table->string('full_name_hi');
            $table->string('full_name_en')->nullable();
            $table->string('pno', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->boolean('nis_certified')->default(false);

            $table->softDeletes();
            $table->timestamps();

            // MySQL allows multiple NULLs in a UNIQUE index, so this enforces
            // uniqueness only for rows where pno IS NOT NULL — matching the spec.
            $table->unique(['organization_id', 'pno']);
            $table->index('organization_id');
            $table->index('member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaches');
    }
};
