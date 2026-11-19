<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Points\ScoreParticipation;
use App\Models\Participation;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('points:score')]
#[Description('Score every participation under the points version in force on its tournament date')]
class ScorePoints extends Command
{
    public function handle(ScoreParticipation $score): int
    {
        Participation::query()->chunkById(500, fn ($chunk) => $chunk->each(fn (Participation $p) => $score($p)));
        $this->info('Scored.');

        return self::SUCCESS;
    }
}
