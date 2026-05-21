<?php

namespace App\Models;

use Database\Factories\TournamentTierFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $label_hi
 * @property string $label_en
 * @property int $weight
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['code', 'label_hi', 'label_en', 'weight'])]
class TournamentTier extends Model
{
    /** @use HasFactory<TournamentTierFactory> */
    use HasFactory;
}
