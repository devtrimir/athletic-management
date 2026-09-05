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
        if (Schema::hasTable('coach_special_achievements')) {
            Schema::table('coach_special_achievements', function (Blueprint $table) {
                if (! Schema::hasColumn('coach_special_achievements', 'order_document_path')) {
                    $table->string('order_document_path')->nullable()->after('order_reference');
                }

                if (! Schema::hasColumn('coach_special_achievements', 'order_document_original_name')) {
                    $table->string('order_document_original_name')->nullable()->after('order_document_path');
                }

                if (! Schema::hasColumn('coach_special_achievements', 'order_document_mime_type')) {
                    $table->string('order_document_mime_type', 100)->nullable()->after('order_document_original_name');
                }

                if (! Schema::hasColumn('coach_special_achievements', 'order_document_size_bytes')) {
                    $table->unsignedInteger('order_document_size_bytes')->nullable()->after('order_document_mime_type');
                }
            });

            $this->addIndexesIfMissing();

            return;
        }

        Schema::create('coach_special_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('coach_id')->constrained()->cascadeOnDelete();
            $table->enum('achievement_type', [
                'COMMENDATION_DISC',
                'APPRECIATION_LETTER',
                'HONOUR_CERTIFICATE',
                'SPECIAL_RECOGNITION',
                'OTHER',
            ]);
            $table->string('title', 150);
            $table->date('awarded_on')->nullable();
            $table->string('issuing_authority', 150)->nullable();
            $table->string('order_reference', 100)->nullable();
            $table->string('order_document_path')->nullable();
            $table->string('order_document_original_name')->nullable();
            $table->string('order_document_mime_type', 100)->nullable();
            $table->unsignedInteger('order_document_size_bytes')->nullable();
            $table->string('place', 150)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'coach_id', 'achievement_type'], 'csa_org_coach_type_idx');
            $table->index(['organization_id', 'awarded_on'], 'csa_org_awarded_on_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_special_achievements');
    }

    private function addIndexesIfMissing(): void
    {
        $indexes = collect(DB::select('SHOW INDEX FROM coach_special_achievements'))
            ->pluck('Key_name')
            ->unique()
            ->all();

        Schema::table('coach_special_achievements', function (Blueprint $table) use ($indexes) {
            if (! in_array('csa_org_coach_type_idx', $indexes, true)) {
                $table->index(['organization_id', 'coach_id', 'achievement_type'], 'csa_org_coach_type_idx');
            }

            if (! in_array('csa_org_awarded_on_idx', $indexes, true)) {
                $table->index(['organization_id', 'awarded_on'], 'csa_org_awarded_on_idx');
            }
        });
    }
};
