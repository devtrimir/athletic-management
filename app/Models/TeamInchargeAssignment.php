<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\TeamInchargeAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'team_id',
    'incharge_id',
    'full_name',
    'pno',
    'rank',
    'designation',
    'mobile',
    'email',
    'assigned_at',
    'removed_at',
    'assigned_by',
    'removed_by',
    'assignment_reason',
    'removal_reason',
    'remarks',
    'is_current',
    'current_team_id',
])]
#[ObservedBy([AuditObserver::class])]
class TeamInchargeAssignment extends Model
{
    /** @use HasFactory<TeamInchargeAssignmentFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'removed_at' => 'datetime',
            'is_current' => 'boolean',
        ];
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<Incharge, $this> */
    public function incharge(): BelongsTo
    {
        return $this->belongsTo(Incharge::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /** @return BelongsTo<User, $this> */
    public function removedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeCurrent(Builder $query): void
    {
        $query->where('is_current', true);
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeHistory(Builder $query): void
    {
        $query->where('is_current', false);
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeForTeam(Builder $query, int $teamId): void
    {
        $query->where('team_id', $teamId);
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeForIncharge(Builder $query, int $inchargeId): void
    {
        $query->where('incharge_id', $inchargeId);
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeByPno(Builder $query, string $pno): void
    {
        $query->where('pno', $pno);
    }

    /** @param Builder<TeamInchargeAssignment> $query */
    public function scopeActiveBetween(Builder $query, string $startDate, string $endDate): void
    {
        $query->where('assigned_at', '<=', $endDate)
            ->where(function (Builder $builder) use ($startDate): void {
                $builder->whereNull('removed_at')
                    ->orWhere('removed_at', '>=', $startDate);
            });
    }
}
