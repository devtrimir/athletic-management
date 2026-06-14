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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            $table->string('member_code', 30);
            $table->string('pno', 20)->nullable();

            $table->string('full_name');
            $table->string('full_name_normalized')->nullable()->comment('Populated by normalize_devanagari trigger in P2-T04');
            $table->string('father_name')->nullable();
            $table->string('rank', 100)->nullable();

            $table->enum('gender', ['M', 'F', 'O']);
            $table->date('dob')->nullable();
            $table->date('joining_date')->nullable();
            $table->string('mobile', 20)->nullable();

            $table->foreignId('home_district_id')->nullable()->constrained('districts');
            $table->foreignId('current_unit_id')->nullable()->constrained('units');

            $table->enum('player_category', ['GD', 'SKILLED']);
            $table->enum('player_level', ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC']);
            $table->enum('current_status', ['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'])
                ->default('ACTIVE');

            $table->json('source_refs')->nullable()->comment('Legacy workbook source references');

            $table->softDeletes();
            $table->timestamps();

            $table->unique(['organization_id', 'member_code']);
            $table->unique(['organization_id', 'pno']);
            $table->index('organization_id');
            $table->index('mobile');
            $table->index('current_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
