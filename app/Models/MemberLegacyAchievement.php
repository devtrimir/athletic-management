<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\MemberLegacyAchievementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * Represents an achievement from outside the live tournament pipeline —
 * either before the member joined the police (PRE_RECRUITMENT) or
 * police-era history recorded before this system existed (POST_RECRUITMENT).
 *
 * @property int $id
 * @property int $organization_id
 * @property int $member_id
 * @property int|null $session_id
 * @property string $period PRE_RECRUITMENT|POST_RECRUITMENT
 * @property string $level INTERNATIONAL|NATIONAL|AIPSC|STATE|ZONAL|OTHER
 * @property string $competition_details
 * @property Carbon|null $event_date
 * @property string|null $venue
 * @property int|null $sport_id
 * @property string|null $sport_discipline
 * @property string|null $event
 * @property string|null $discipline
 * @property string|null $weight_category
 * @property string|null $gender_class
 * @property string|null $medal_type
 * @property int|null $position
 * @property int|null $sort_order
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Member $member
 * @property-read SportSession|null $session
 * @property-read Sport|null $sport
 * @property-read Collection<int, AchievementBenefit> $benefits
 */
#[Fillable([
    'organization_id',
    'member_id',
    'session_id',
    'period',
    'level',
    'competition_details',
    'event_date',
    'venue',
    'sport_id',
    'sport_discipline',
    'event',
    'discipline',
    'weight_category',
    'gender_class',
    'medal_type',
    'position',
    'sort_order',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class MemberLegacyAchievement extends Model
{
    /** @use HasFactory<MemberLegacyAchievementFactory> */
    use Auditable, HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'sport_id' => 'integer',
            'position' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /**
     * Benefits received for this achievement (promotions, cash awards, etc.).
     *
     * @return MorphMany<AchievementBenefit, $this>
     */
    public function benefits(): MorphMany
    {
        return $this->morphMany(AchievementBenefit::class, 'benefitable');
    }
}
