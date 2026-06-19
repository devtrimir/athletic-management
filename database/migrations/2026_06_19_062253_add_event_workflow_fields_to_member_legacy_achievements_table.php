<?php

declare(strict_types=1);

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
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->foreignId('sport_id')
                ->nullable()
                ->after('venue')
                ->constrained('sports')
                ->nullOnDelete();
            $table->string('discipline', 255)->nullable()->after('event');
            $table->string('weight_category', 100)->nullable()->after('discipline');
            $table->enum('gender_class', ['M', 'F', 'MIXED', 'OPEN'])
                ->nullable()
                ->after('weight_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_legacy_achievements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sport_id');
            $table->dropColumn(['discipline', 'weight_category', 'gender_class']);
        });
    }
};
