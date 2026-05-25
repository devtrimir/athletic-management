<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievement_benefits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            // Polymorphic: points to MemberLegacyAchievement OR Achievement (live)
            $table->string('benefitable_type');
            $table->unsignedBigInteger('benefitable_id');

            $table->enum('benefit_type', [
                'PROMOTION',              // पदोन्नति
                'OUT_OF_TURN_PROMOTION',  // असाधारण पदोन्नति
                'CASH_AWARD',             // नगद पुरस्कार
                'COMMENDATION',           // प्रशंसा पत्र / DGP Disc
                'NONE',                   // कुछ नहीं मिला (explicitly confirmed no benefit)
                'OTHER',                  // अन्य
            ]);

            $table->string('promoted_from_rank', 100)->nullable(); // rank before promotion
            $table->string('promoted_to_rank', 100)->nullable();   // rank after promotion
            $table->decimal('cash_amount', 10, 2)->nullable();     // amount in ₹
            $table->date('benefit_date')->nullable();               // date benefit was conferred
            $table->string('order_reference', 100)->nullable();    // सरकारी आदेश/पत्र संख्या
            $table->text('remarks')->nullable();

            $table->timestamps();

            $table->index(['benefitable_type', 'benefitable_id'], 'ab_benefitable');
            $table->index(['organization_id', 'benefit_type'], 'ab_org_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('achievement_benefits');
    }
};
