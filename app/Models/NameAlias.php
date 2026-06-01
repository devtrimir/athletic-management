<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\NameAliasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $member_id
 * @property string $alias_hi
 * @property string|null $alias_normalized
 * @property string $source
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Member $member
 */
#[Fillable(['member_id', 'alias_hi', 'alias_normalized', 'source'])]
#[ObservedBy([AuditObserver::class])]
class NameAlias extends Model
{
    /** @use HasFactory<NameAliasFactory> */
    use Auditable, HasFactory;

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
