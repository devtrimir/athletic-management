<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('photo_path')->nullable()->after('rank');
            $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])->nullable()->after('photo_path');
            $table->string('caste', 100)->nullable()->after('blood_group');
            $table->date('promotion_date')->nullable()->after('caste');
            $table->string('appointment', 255)->nullable()->after('promotion_date');
            $table->text('home_address')->nullable()->after('appointment');
            $table->enum('recruitment_type', ['DIRECT', 'SPORTS_QUOTA', 'PROMOTED', 'OTHER'])->nullable()->after('home_address');
            $table->string('sport_event', 100)->nullable()->after('recruitment_type');
            $table->text('other_notes')->nullable()->after('sport_event');
            $table->date('team_since')->nullable()->after('other_notes');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn([
                'photo_path',
                'blood_group',
                'caste',
                'promotion_date',
                'appointment',
                'home_address',
                'recruitment_type',
                'sport_event',
                'other_notes',
                'team_since',
            ]);
        });
    }
};
