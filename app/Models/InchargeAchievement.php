<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

#[Fillable([
    'organization_id',
    'incharge_id',
    'title',
    'description',
    'period',
    'level',
    'competition_details',
    'event_date',
    'venue',
    'sport_discipline',
    'event',
    'discipline',
    'weight_category',
    'gender_class',
    'medal_type',
    'position',
    'achieved_on',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class InchargeAchievement extends Model
{
    /** @use HasFactory<\Database\Factories\InchargeAchievementFactory> */
    use Auditable, HasFactory, Tenanted;

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'achieved_on' => 'date',
            'position' => 'int',
        ];
    }

    /** @return BelongsTo<Incharge, $this> */
    public function incharge(): BelongsTo
    {
        return $this->belongsTo(Incharge::class);
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
