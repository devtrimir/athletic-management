<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Tenanted;
use Database\Factories\CoachFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $member_id
 * @property string $full_name_hi
 * @property string|null $full_name_en
 * @property string|null $pno
 * @property string|null $mobile
 * @property bool $nis_certified
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Member|null $member
 */
#[Fillable([
    'organization_id',
    'member_id',
    'full_name_hi',
    'full_name_en',
    'pno',
    'mobile',
    'nis_certified',
])]
class Coach extends Model
{
    /** @use HasFactory<CoachFactory> */
    use HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nis_certified' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
