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
        Schema::table('incharge_special_achievements', function (Blueprint $table): void {
            if (! Schema::hasColumn('incharge_special_achievements', 'order_document_path')) {
                $table->string('order_document_path')->nullable();
                $table->string('order_document_original_name')->nullable();
                $table->string('order_document_mime_type')->nullable();
                $table->unsignedInteger('order_document_size_bytes')->nullable();
            }
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('incharge_special_achievements')) {
            Schema::table('incharge_special_achievements', function (Blueprint $table): void {
                if (Schema::hasColumn('incharge_special_achievements', 'order_document_size_bytes')) {
                    $table->dropColumn('order_document_size_bytes');
                }

                if (Schema::hasColumn('incharge_special_achievements', 'order_document_mime_type')) {
                    $table->dropColumn('order_document_mime_type');
                }

                if (Schema::hasColumn('incharge_special_achievements', 'order_document_original_name')) {
                    $table->dropColumn('order_document_original_name');
                }

                if (Schema::hasColumn('incharge_special_achievements', 'order_document_path')) {
                    $table->dropColumn('order_document_path');
                }
            });
        }
    }
};
