<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\ExternalCoachFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string|null $phone
 * @property string $email
 * @property string $status
 * @property string|null $remarks
 * @property Carbon|null $last_login_at
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 */
#[Fillable([
    'organization_id',
    'name',
    'phone',
    'email',
    'password',
    'photo_path',
    'gender',
    'date_of_birth',
    'address',
    'district_id',
    'city',
    'experience_years',
    'certification_details',
    'id_proof_path',
    'emergency_contact',
    'remarks',
    'status',
    'last_login_at',
    'created_by',
    'updated_by',
])]
#[Hidden(['password', 'remember_token'])]
#[ObservedBy([AuditObserver::class])]
class ExternalCoach extends Authenticatable
{
    /** @use HasFactory<ExternalCoachFactory> */
    use Auditable, HasFactory, Notifiable, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'deleted_at' => 'datetime',
        ];
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

    /** @return HasMany<ExternalCoachStatusHistory, $this> */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(ExternalCoachStatusHistory::class);
    }

    /** @return HasMany<ExternalCoachingAssignment, $this> */
    public function externalCoachingAssignments(): HasMany
    {
        return $this->hasMany(ExternalCoachingAssignment::class);
    }

    public function isActiveForLogin(): bool
    {
        return $this->status === 'active' && $this->deleted_at === null;
    }

    public function resolveRouteBinding($value, $field = null): ?Model
    {
        return $this->where($field ?? $this->getRouteKeyName(), $value)
            ->where('organization_id', auth()->user()?->organization_id ?? 0)
            ->first();
    }
}
