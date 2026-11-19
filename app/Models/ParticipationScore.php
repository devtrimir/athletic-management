<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Points a player earned from one participation, frozen with the version used.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $participation_id
 * @property int $member_id
 * @property int $point_scheme_id
 * @property int $game_level_id
 * @property string $result
 * @property int $points
 * @property Carbon|null $scored_on
 */
#[Fillable(['organization_id', 'participation_id', 'member_id', 'point_scheme_id', 'game_level_id', 'result', 'points', 'scored_on'])]
class ParticipationScore extends Model
{
    protected function casts(): array
    {
        return ['points' => 'integer', 'scored_on' => 'date:Y-m-d'];
    }
}
