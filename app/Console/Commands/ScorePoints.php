<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Points\ScoreTournament;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('points:score')]
#[Description('Score every tournament result under the points version in force on its date (run after setting game levels)')]
class ScorePoints extends Command
{
    public function handle(ScoreTournament $score): int
    {
        $total = 0;

        Tournament::withoutGlobalScope(BelongsToOrganization::class)->chunkById(100, function ($tournaments) use ($score, &$total): void {
            foreach ($tournaments as $tournament) {
                $total += $score($tournament);
            }
        });

        $this->info("Scored {$total} results.");

        return self::SUCCESS;
    }
}
