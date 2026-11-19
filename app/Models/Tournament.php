<?php

declare(strict_types=1);

namespace App\Models;

use App\Actions\Points\ScoreTournament;
use App\Concerns\Tenanted;
use App\Models\Scopes\BelongsToOrganization;
use Database\Factories\TournamentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $session_id
 * @property int $tier_id
 * @property int|null $competition_id
 * @property int|null $sport_id
 * @property string $name
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
 * @property-read Collection<int, Sport> $sports
 */
#[Fillable([
    'organization_id',
    'session_id',
    'tier_id',
    'competition_id',
    'sport_id',
    'name',
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
     * Attaching a competition (or moving the date) rescores the tournament's results.
     * Chains the Tenanted trait's booted(), which this method would otherwise replace.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new BelongsToOrganization);
        static::saved(function (Tournament $tournament): void {
            if ($tournament->wasChanged(['competition_id', 'date_from'])) {
                app(ScoreTournament::class)($tournament);
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_from' => 'date:Y-m-d',
            'date_to' => 'date:Y-m-d',
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

    /** @return BelongsTo<Competition, $this> */
    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsToMany<Sport, $this> */
    public function sports(): BelongsToMany
    {
        return $this->belongsToMany(Sport::class, 'tournament_sport')
            ->withTimestamps();
    }

    /** @return HasMany<Event, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
