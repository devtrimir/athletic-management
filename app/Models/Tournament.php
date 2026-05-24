<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Tenanted;
use Database\Factories\TournamentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $session_id
 * @property int $tier_id
 * @property int|null $sport_id
 * @property string $name_hi
 * @property string|null $venue
 * @property Carbon|null $date_from
 * @property Carbon|null $date_to
 * @property string|null $raw_date_text
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read SportSession $session
 * @property-read TournamentTier $tier
 * @property-read Sport|null $sport
 */
#[Fillable([
    'organization_id',
    'session_id',
    'tier_id',
    'sport_id',
    'name_hi',
    'venue',
    'date_from',
    'date_to',
    'raw_date_text',
])]
class Tournament extends Model
{
    /** @use HasFactory<TournamentFactory> */
    use HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @return BelongsTo<TournamentTier, $this> */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(TournamentTier::class, 'tier_id');
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return HasMany<Event, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
