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
        Schema::create('sports_calendars', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->unsignedSmallInteger('year');
            $table->string('competition_name');
            $table->text('proposed_month');
            $table->text('proposed_month_annual')->nullable();
            $table->text('proposed_venue');
            $table->boolean('report_arrived')->default(false);
            $table->string('report_pdf_path')->nullable();
            $table->string('report_pdf_original_name')->nullable();
            $table->string('report_pdf_mime_type', 100)->nullable();
            $table->unsignedInteger('report_pdf_size_bytes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['organization_id', 'year', 'competition_name'], 'sc_org_year_comp_idx');
            $table->index(['organization_id', 'year'], 'sc_org_year_idx');
            $table->index(['organization_id', 'report_arrived'], 'sc_org_report_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sports_calendars');
    }
};
