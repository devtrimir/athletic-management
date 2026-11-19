<?php

declare(strict_types=1);

namespace App\Actions\Points;

use App\Jobs\ScoreTournamentJob;
use App\Models\PointScheme;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Illuminate\Support\Facades\DB;

/**
 * Publishes a draft from a start date. Results already scored keep the version they
 * were scored with; only tournaments dated on or after the start date are rescored.
 */
class PublishPointScheme
{
    public function __invoke(PointScheme $scheme, string $effectiveFrom): void
    {
        DB::transaction(fn () => $scheme->update([
            'effective_from' => $effectiveFrom,
            'status' => PointScheme::STATUS_ACTIVE,
            'published_at' => now(),
        ]));

        Tournament::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $scheme->organization_id)
            ->where(fn ($levelled) => $levelled->whereNotNull('game_level_id')->orWhereNotNull('competition_id'))
            ->whereDate('date_from', '>=', $effectiveFrom)
            ->pluck('id')
            ->each(fn (int $tournamentId) => ScoreTournamentJob::dispatch($tournamentId));
    }
}
