<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\ExternalCoachPerformanceUpdateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'organization_id',
    'external_coaching_assignment_id',
    'member_id',
    'external_coach_id',
    'sport_id',
    'update_date',
    'performance_level',
    'performance_score',
    'training_summary',
    'improvement_notes',
    'injury_or_fitness_notes',
    'next_focus',
    'review_status',
    'reviewed_by',
    'reviewed_at',
    'review_remarks',
    'ip_address',
    'user_agent',
])]
#[ObservedBy([AuditObserver::class])]
class ExternalCoachPerformanceUpdate extends Model
{
    /** @use HasFactory<ExternalCoachPerformanceUpdateFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'update_date' => 'date',
            'performance_score' => 'integer',
            'reviewed_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<ExternalCoachingAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ExternalCoachingAssignment::class, 'external_coaching_assignment_id');
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<ExternalCoach, $this> */
    public function externalCoach(): BelongsTo
    {
        return $this->belongsTo(ExternalCoach::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
