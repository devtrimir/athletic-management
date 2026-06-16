<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\CoachAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection as SupportCollection;

/**
 * @property int $id
 * @property int $team_id
 * @property int $coach_id
 * @property int $session_id
 * @property string $role
 * @property Carbon|null $assigned_at
 * @property Carbon|null $removed_at
 * @property bool $is_current
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Team $team
 * @property-read Coach $coach
 * @property-read SportSession $session
 */
#[ObservedBy([AuditObserver::class])]
#[Fillable([
    'team_id',
    'coach_id',
    'session_id',
    'role',
    'assigned_at',
    'removed_at',
    'is_current',
    'notes',
])]
class CoachAssignment extends Model
{
    /** @use HasFactory<CoachAssignmentFactory> */
    use Auditable, HasFactory;

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @param  Builder<CoachAssignment>  $query */
    public function scopeCurrent(Builder $query): void
    {
        $query->where('is_current', true);
    }

    /** @param  Builder<CoachAssignment>  $query */
    public function scopeHistorical(Builder $query): void
    {
        $query->where(function (Builder $query): void {
            $query->whereNull('is_current')->orWhere('is_current', false);
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'removed_at' => 'datetime',
            'is_current' => 'boolean',
        ];
    }

    /**
     * Normalize role values coming from UI / API payloads.
     */
    public static function normalizeRole(string $role): string
    {
        $normalized = strtoupper(trim($role));

        return match ($normalized) {
            'CHEAD', 'HEAD COACH' => 'HEAD',
            'ASSIST', 'ASSISTANT COACH' => 'ASSISTANT',
            default => $normalized,
        };
    }

    /**
     * @param  iterable<int>  $coachIds
     * @return SupportCollection<int, int>
     */
    public static function endActiveForCoachSession(int $coachId, int $sessionId): SupportCollection
    {
        $activeAssignments = self::query()
            ->where('coach_id', $coachId)
            ->where('session_id', $sessionId)
            ->where('is_current', true)
            ->get();

        $activeAssignments->each(fn (self $assignment) => $assignment->update([
            'is_current' => false,
            'removed_at' => now(),
            'notes' => __('Replaced by newer assignment'),
        ]));

        return $activeAssignments->pluck('id');
    }
}
