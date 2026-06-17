<?php

declare(strict_types=1);

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
        $this->modifyCoachStatusEnum(
            "ENUM('ACTIVE','INACTIVE','TRANSFERRED','RETIRED','RESIGNED','DISMISSED','DECEASED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE'",
        );

        Schema::create('coach_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->cascadeOnDelete();
            $table->enum('status', ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED']);
            $table->date('effective_on');
            $table->text('reason')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['coach_id', 'effective_on']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coach_status_histories');
        $this->modifyCoachStatusEnum("ENUM('ACTIVE','INACTIVE','RETIRED') NOT NULL DEFAULT 'ACTIVE'");
    }

    private function modifyCoachStatusEnum(string $definition): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::statement("ALTER TABLE coaches MODIFY coach_status {$definition}");
    }
};
