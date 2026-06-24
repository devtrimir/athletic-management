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
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('sport_event_variant_id')
                ->nullable()
                ->after('sport_id')
                ->constrained('sport_event_variants')
                ->nullOnDelete();
            $table->string('event_source', 20)->default('manual')->after('gender_class');
            $table->text('provisional_reason')->nullable()->after('event_source');

            $table->index(['sport_event_variant_id', 'event_source'], 'events_variant_source_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_variant_source_idx');
            $table->dropConstrainedForeignId('sport_event_variant_id');
            $table->dropColumn(['event_source', 'provisional_reason']);
        });
    }
};
