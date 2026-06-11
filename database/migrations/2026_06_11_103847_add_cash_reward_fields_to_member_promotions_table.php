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
        if (! Schema::hasColumn('member_promotions', 'cash_reward_amount')) {
            Schema::table('member_promotions', function (Blueprint $table): void {
                $table->decimal('cash_reward_amount', 12, 2)->nullable()->after('to_rank');
            });
        }

        if (! Schema::hasColumn('member_promotions', 'cash_reward_date')) {
            Schema::table('member_promotions', function (Blueprint $table): void {
                $table->date('cash_reward_date')->nullable()->after('cash_reward_amount');
            });
        }

        if (! Schema::hasColumn('member_promotions', 'cash_reward_reference')) {
            Schema::table('member_promotions', function (Blueprint $table): void {
                $table->string('cash_reward_reference', 100)->nullable()->after('cash_reward_date');
            });
        }

        if (! Schema::hasColumn('member_promotions', 'cash_reward_remarks')) {
            Schema::table('member_promotions', function (Blueprint $table): void {
                $table->text('cash_reward_remarks')->nullable()->after('cash_reward_reference');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columns = array_values(array_filter([
            Schema::hasColumn('member_promotions', 'cash_reward_amount') ? 'cash_reward_amount' : null,
            Schema::hasColumn('member_promotions', 'cash_reward_date') ? 'cash_reward_date' : null,
            Schema::hasColumn('member_promotions', 'cash_reward_reference') ? 'cash_reward_reference' : null,
            Schema::hasColumn('member_promotions', 'cash_reward_remarks') ? 'cash_reward_remarks' : null,
        ]));

        if ($columns !== []) {
            Schema::table('member_promotions', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        }
    }
};
