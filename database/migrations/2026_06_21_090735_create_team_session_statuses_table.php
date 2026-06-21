<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_session_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sport_sessions')->cascadeOnDelete();
            $table->string('status', 32)->default('active');
            $table->foreignId('carried_forward_to_session_id')->nullable()->constrained('sport_sessions')->nullOnDelete();
            $table->timestamp('carried_forward_at')->nullable();
            $table->foreignId('carried_forward_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->string('closed_reason')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'session_id']);
            $table->index(['organization_id', 'session_id', 'status']);
            $table->index('status');
        });

        $this->backfillExistingStatuses();
    }

    public function down(): void
    {
        Schema::dropIfExists('team_session_statuses');
    }

    private function backfillExistingStatuses(): void
    {
        $now = now();

        $rows = collect(DB::select(<<<'SQL'
            select distinct t.organization_id, t.id as team_id, t.session_id, t.is_active
            from teams t
            where t.session_id is not null
            union
            select distinct t.organization_id, t.id as team_id, tm.session_id, t.is_active
            from team_members tm
            inner join teams t on t.id = tm.team_id
            where tm.session_id is not null
            union
            select distinct t.organization_id, t.id as team_id, ca.session_id, t.is_active
            from coach_assignments ca
            inner join teams t on t.id = ca.team_id
            where ca.session_id is not null
        SQL));

        $rows
            ->chunk(500)
            ->each(function ($chunk) use ($now): void {
                DB::table('team_session_statuses')->insertOrIgnore(
                    $chunk->map(fn (object $row): array => [
                        'organization_id' => (int) $row->organization_id,
                        'team_id' => (int) $row->team_id,
                        'session_id' => (int) $row->session_id,
                        'status' => ((bool) $row->is_active) ? 'active' : 'inactive',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all()
                );
            });
    }
};
