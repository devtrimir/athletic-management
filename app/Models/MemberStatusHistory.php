<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\MemberStatusHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $member_id
 * @property string $status
 * @property Carbon $effective_on
 * @property string|null $reason_hi
 * @property int|null $recorded_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Member $member
 * @property-read User|null $recorder
 */
#[Fillable(['member_id', 'status', 'effective_on', 'reason_hi', 'recorded_by'])]
#[ObservedBy([AuditObserver::class])]
class MemberStatusHistory extends Model
{
    /** @use HasFactory<MemberStatusHistoryFactory> */
    use Auditable, HasFactory;

    protected $table = 'member_status_history';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_on' => 'date',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
