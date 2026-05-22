<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\MemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $member_code
 * @property string|null $pno
 * @property string $full_name_hi
 * @property string|null $full_name_en
 * @property string|null $full_name_normalized
 * @property string|null $father_name_hi
 * @property string|null $rank
 * @property string $gender
 * @property Carbon|null $dob
 * @property Carbon|null $joining_date
 * @property string|null $mobile
 * @property int|null $home_district_id
 * @property int|null $current_unit_id
 * @property string $player_category
 * @property string $player_level
 * @property string $current_status
 * @property array<mixed>|null $source_refs
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read District|null $homeDistrict
 * @property-read Unit|null $currentUnit
 */
#[Fillable([
    'organization_id',
    'member_code',
    'pno',
    'full_name_hi',
    'full_name_en',
    'full_name_normalized',
    'father_name_hi',
    'rank',
    'gender',
    'dob',
    'joining_date',
    'mobile',
    'home_district_id',
    'current_unit_id',
    'player_category',
    'player_level',
    'current_status',
    'source_refs',
])]
#[ObservedBy([AuditObserver::class])]
class Member extends Model
{
    /** @use HasFactory<MemberFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'joining_date' => 'date',
            'source_refs' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function homeDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'home_district_id');
    }

    public function currentUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'current_unit_id');
    }
}
