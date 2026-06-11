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
        Schema::create('member_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->date('promotion_date')->nullable();
            $table->string('from_rank', 100)->nullable();
            $table->string('to_rank', 100);
            $table->decimal('cash_reward_amount', 12, 2)->nullable();
            $table->date('cash_reward_date')->nullable();
            $table->string('cash_reward_reference', 100)->nullable();
            $table->text('cash_reward_remarks')->nullable();
            $table->text('reason')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['member_id', 'promotion_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_promotions');
    }
};
