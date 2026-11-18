<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\TrainingVenueFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string|null $code
 * @property string|null $address
 * @property int|null $district_id
 * @property int|null $unit_id
 * @property string|null $city
 * @property string|null $state
 * @property string|null $latitude
 * @property string|null $longitude
 * @property int $allowed_radius_meters
 * @property string $status
 * @property string|null $remarks
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 */
#[Fillable([
    'organization_id',
    'name',
    'code',
    'address',
    'district_id',
    'unit_id',
    'city',
    'state',
    'latitude',
    'longitude',
    'allowed_radius_meters',
    'photo_path',
    'status',
    'remarks',
    'created_by',
    'updated_by',
])]
#[ObservedBy([AuditObserver::class])]
class TrainingVenue extends Model
{
    /** @use HasFactory<TrainingVenueFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allowed_radius_meters' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<TrainingVenue>  $query
     * @param  array{city?: ?string, state?: ?string, coach_id?: ?int, sport_id?: ?int}  $extra
     */
    #[Scope]
    protected function filter(Builder $query, ?string $status, ?string $search, array $extra = []): void
    {
        $query
            ->when($status !== null, fn (Builder $query) => $query->where('status', $status))
            ->when(($extra['city'] ?? null) !== null, fn (Builder $query) => $query->whereRaw('LOWER(city) = ?', [mb_strtolower((string) $extra['city'])]))
            ->when(($extra['state'] ?? null) !== null, fn (Builder $query) => $query->whereRaw('LOWER(state) = ?', [mb_strtolower((string) $extra['state'])]))
            ->when(($extra['coach_id'] ?? null) !== null, fn (Builder $query) => $query->whereHas('externalCoaches', fn (Builder $coaches) => $coaches->whereKey($extra['coach_id'])))
            ->when(($extra['sport_id'] ?? null) !== null, fn (Builder $query) => $query->whereHas('externalCoaches.sports', fn (Builder $sports) => $sports->whereKey($extra['sport_id'])))
            ->when($search !== null, function (Builder $query) use ($search): void {
                $like = '%'.mb_strtolower($search).'%';

                $query->where(function (Builder $builder) use ($like): void {
                    $builder->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$like]);
                });
            });
    }

    /** @return BelongsToMany<ExternalCoach, $this> */
    public function externalCoaches(): BelongsToMany
    {
        return $this->belongsToMany(ExternalCoach::class, 'external_coach_training_venue')->withTimestamps();
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<District, $this> */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
