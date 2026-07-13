<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'sport_id',
    'sport_event_id',
    'participation_format_id',
    'gender_category_id',
    'age_category_id',
    'weight_category_id',
    'measurement_unit_id',
    'result_type_id',
    'name',
    'name_en',
    'code',
    'min_participants',
    'max_participants',
    'min_male_participants',
    'max_male_participants',
    'min_female_participants',
    'max_female_participants',
    'substitute_allowed',
    'substitute_limit',
    'is_team_based',
    'is_medal_event',
    'is_active',
    'sort_order',
])]
class SportEventVariant extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'min_participants' => 'integer',
            'max_participants' => 'integer',
            'min_male_participants' => 'integer',
            'max_male_participants' => 'integer',
            'min_female_participants' => 'integer',
            'max_female_participants' => 'integer',
            'substitute_allowed' => 'boolean',
            'substitute_limit' => 'integer',
            'is_team_based' => 'boolean',
            'is_medal_event' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<SportEvent, $this> */
    public function sportEvent(): BelongsTo
    {
        return $this->belongsTo(SportEvent::class);
    }

    /** @return BelongsTo<ParticipationFormat, $this> */
    public function participationFormat(): BelongsTo
    {
        return $this->belongsTo(ParticipationFormat::class);
    }

    /** @return BelongsTo<GenderCategory, $this> */
    public function genderCategory(): BelongsTo
    {
        return $this->belongsTo(GenderCategory::class);
    }

    /** @return BelongsTo<AgeCategory, $this> */
    public function ageCategory(): BelongsTo
    {
        return $this->belongsTo(AgeCategory::class);
    }

    /** @return BelongsTo<WeightCategory, $this> */
    public function weightCategory(): BelongsTo
    {
        return $this->belongsTo(WeightCategory::class);
    }

    /** @return BelongsTo<MeasurementUnit, $this> */
    public function measurementUnit(): BelongsTo
    {
        return $this->belongsTo(MeasurementUnit::class);
    }

    /** @return BelongsTo<ResultType, $this> */
    public function resultType(): BelongsTo
    {
        return $this->belongsTo(ResultType::class);
    }
}
