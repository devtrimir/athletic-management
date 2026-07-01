<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->enum('event_type', ['individual', 'team'])->default('individual')->after('provisional_reason');
            $table->unsignedSmallInteger('participants_required')->nullable()->after('event_type');
        });

        Schema::table('participations', function (Blueprint $table): void {
            $table->json('lineup_member_ids')->nullable()->after('team_id');
            $table->foreignId('member_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->dropColumn(['event_type', 'participants_required']);
        });

        Schema::table('participations', function (Blueprint $table): void {
            $table->dropColumn([
                'lineup_member_ids',
            ]);
            $table->foreignId('member_id')->nullable(false)->change();
        });
    }
};
