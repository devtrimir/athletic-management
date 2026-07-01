<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $tournament_id
 * @property int $sport_id
 * @property int|null $sport_event_variant_id
 * @property string $event_type
 * @property int|null $participants_required
 * @property string $name
 * @property string|null $discipline
 * @property string|null $weight_category
 * @property string $gender_class
 * @property string $event_source
 * @property string|null $provisional_reason
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Tournament $tournament
 * @property-read Sport $sport
 * @property-read Collection<int, Participation> $participations
 */
    #[Fillable([
        'tournament_id',
        'sport_id',
        'sport_event_variant_id',
        'event_type',
        'participants_required',
        'name',
        'discipline',
        'weight_category',
        'gender_class',
        'event_source',
        'provisional_reason',
    ])]
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'participants_required' => 'integer',
        ];
    }

    /** @return BelongsTo<Tournament, $this> */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<SportEventVariant, $this> */
    public function sportEventVariant(): BelongsTo
    {
        return $this->belongsTo(SportEventVariant::class);
    }

    /** @return HasMany<Participation, $this> */
    public function participations(): HasMany
    {
        return $this->hasMany(Participation::class);
    }
}
