<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            $table->string('display_name_en')->nullable()->after('name');
            $table->string('display_name_hi')->nullable()->after('display_name_en');
        });

        DB::table('organizations')->update([
            'display_name_en' => 'UP Police Sports Control Board (UPPSCB)',
            'display_name_hi' => 'उत्तर प्रदेश पुलिस स्पोर्ट्स नियंत्रण बोर्ड (यूपीपीएससीबी)',
        ]);
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            $table->dropColumn(['display_name_en', 'display_name_hi']);
        });
    }
};
