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
        Schema::table('coaches', function (Blueprint $table): void {
            $table->string('display_name')->nullable();
            $table->string('designation')->nullable();
            $table->string('email')->nullable();
            $table->enum('gender', ['M', 'F', 'O'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('coach_status', ['ACTIVE', 'INACTIVE', 'RETIRED'])->default('ACTIVE');
            $table->text('bio')->nullable();
            $table->text('address')->nullable();
            $table->string('photo_path')->nullable();

            $table->index('coach_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coaches', function (Blueprint $table): void {
            $table->dropColumn([
                'display_name',
                'designation',
                'email',
                'gender',
                'date_of_birth',
                'coach_status',
                'bio',
                'address',
                'photo_path',
            ]);
        });
    }
};
