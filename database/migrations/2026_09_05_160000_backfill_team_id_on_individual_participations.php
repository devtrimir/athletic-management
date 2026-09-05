<?php

declare(strict_types=1);

use App\Models\Participation;
use App\Support\Participations\ParticipationTeamResolver;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Backfill team_id on member participations from the member's active team
     * membership in the participation's session. Idempotent: rows that already
     * have a team_id, or have no resolvable membership, are left untouched.
     */
    public function up(): void
    {
        $resolver = app(ParticipationTeamResolver::class);

        Participation::withoutGlobalScopes()
            ->whereNull('team_id')
            ->whereNotNull('member_id')
            ->with('event:id,sport_id')
            ->chunkById(200, function ($participations) use ($resolver): void {
                /** @var Participation $participation */
                foreach ($participations as $participation) {
                    $teamId = $resolver->resolveTeamId(
                        (int) $participation->member_id,
                        (int) $participation->session_id,
                        (int) ($participation->event?->sport_id ?? 0),
                    );

                    if ($teamId === null) {
                        continue;
                    }

                    Participation::withoutGlobalScopes()
                        ->whereKey($participation->id)
                        ->whereNull('team_id')
                        ->update(['team_id' => $teamId]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-reversible by design: autofilled team ids are indistinguishable
        // from explicitly stored ones after the backfill.
    }
};
