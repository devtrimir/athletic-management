<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('coach_promotions', function (Blueprint $table) {
            $table->enum('record_type', ['promotion', 'reward', 'promotion_reward'])
                ->default('promotion')
                ->after('to_rank');
        });

        Schema::table('member_promotions', function (Blueprint $table) {
            $table->enum('record_type', ['promotion', 'reward', 'promotion_reward'])
                ->default('promotion')
                ->after('to_rank');
        });

        $this->backfill('coach_promotions');
        $this->backfill('member_promotions');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_promotions', function (Blueprint $table) {
            $table->dropColumn('record_type');
        });

        Schema::table('coach_promotions', function (Blueprint $table) {
            $table->dropColumn('record_type');
        });
    }

    /**
     * Derive record_type for existing rows from their promotion/reward fields,
     * mirroring the has-promotion / has-reward logic the app already used.
     */
    private function backfill(string $table): void
    {
        $hasPromotion = 'promotion_date is not null'
            .' or (from_rank is not null and to_rank is not null and from_rank <> to_rank)'
            .' or reason is not null'
            .' or remarks is not null';

        $hasReward = 'cash_reward_amount is not null'
            .' or cash_reward_date is not null'
            .' or cash_reward_reference is not null'
            .' or cash_reward_remarks is not null';

        DB::statement(<<<SQL
            update {$table}
            set record_type = case
                when ({$hasReward}) and ({$hasPromotion}) then 'promotion_reward'
                when ({$hasReward}) then 'reward'
                else 'promotion'
            end
        SQL);
    }
};
