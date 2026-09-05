<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachPlayingAchievementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Standalone playing-career achievement earned by the coach while still a player.
 * These records are completely isolated from medal tallies: they do not link to
 * achievements, participations, or achievement benefits.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $coach_id
 * @property string $title
 * @property string|null $period
 * @property string|null $level
 * @property string|null $competition_details
 * @property Carbon|null $event_date
 * @property string|null $venue
 * @property int $sport_id
 * @property string|null $event
 * @property string|null $discipline
 * @property string|null $weight_category
 * @property string|null $gender_class
 * @property string|null $medal_type
 * @property string|null $event_type
 * @property int|null $source_achievement_id
 * @property int|null $position
 * @property string|null $description
 * @property Carbon|null $achieved_on
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read Achievement|null $sourceAchievement
 * @property-read Organization $organization
 * @property-read Sport $sport
 */
#[Fillable([
    'organization_id',
    'coach_id',
    'title',
    'period',
    'level',
    'competition_details',
    'event_date',
    'venue',
    'sport_id',
    'event',
    'discipline',
    'weight_category',
    'gender_class',
    'medal_type',
    'event_type',
    'source_achievement_id',
    'position',
    'description',
    'achieved_on',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class CoachPlayingAchievement extends Model
{
    /** @use HasFactory<CoachPlayingAchievementFactory> */
    use Auditable, HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'achieved_on' => 'date',
            'event_type' => 'string',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Achievement, $this> */
    public function sourceAchievement(): BelongsTo
    {
        return $this->belongsTo(Achievement::class, 'source_achievement_id');
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }
}
