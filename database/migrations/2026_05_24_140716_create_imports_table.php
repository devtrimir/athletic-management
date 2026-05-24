<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('filename');
            $table->string('sha256', 64);
            $table->smallInteger('sheet_count')->unsigned()->nullable();
            $table->enum('status', ['UPLOADED', 'PARSING', 'READY_FOR_REVIEW', 'APPLYING', 'COMPLETED', 'FAILED'])
                ->default('UPLOADED');
            $table->json('mapping_template')->nullable();
            $table->text('error_log')->nullable();
            $table->timestamp('uploaded_at');
            $table->timestamps();

            $table->unique(['organization_id', 'sha256']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imports');
    }
};
