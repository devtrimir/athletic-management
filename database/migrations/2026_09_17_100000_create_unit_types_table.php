<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The unit types that existed as a hardcoded enum before this table.
     * Seeded here so existing `units` rows and `database/data/pac_units.csv`
     * keep working unchanged once `units.unit_type` is replaced by an FK.
     *
     * @var list<array{code: string, name: string, name_en: string, sort_order: int}>
     */
    private const DEFAULT_TYPES = [
        ['code' => 'PAC', 'name' => 'पीएसी', 'name_en' => 'PAC', 'sort_order' => 1],
        ['code' => 'GRP', 'name' => 'जीआरपी', 'name_en' => 'GRP', 'sort_order' => 2],
        ['code' => 'DISTRICT', 'name' => 'जनपद', 'name_en' => 'District', 'sort_order' => 3],
        ['code' => 'HQ', 'name' => 'मुख्यालय', 'name_en' => 'HQ', 'sort_order' => 4],
        ['code' => 'OTHER', 'name' => 'अन्य', 'name_en' => 'Other', 'sort_order' => 5],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('unit_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->smallInteger('sort_order')->default(0)->index();
            $table->timestamps();
        });

        $now = now();

        DB::table('unit_types')->insert(array_map(
            fn (array $type): array => [...$type, 'created_at' => $now, 'updated_at' => $now],
            self::DEFAULT_TYPES,
        ));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unit_types');
    }
};
