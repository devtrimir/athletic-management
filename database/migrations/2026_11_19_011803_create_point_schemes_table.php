<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_schemes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->string('name');
            $table->string('status', 20)->default('draft'); // draft | active | retired
            // Null on the first version means "since the beginning": it covers every
            // tournament dated before a later version takes over.
            $table->date('effective_from')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'version_number']);
            $table->index(['organization_id', 'status', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_schemes');
    }
};
