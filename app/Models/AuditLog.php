<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $user_id
 * @property int|null $organization_id
 * @property string $entity
 * @property int|null $entity_id
 * @property string $action
 * @property array<string, mixed>|null $diff
 * @property Carbon $at
 */
#[Fillable(['user_id', 'organization_id', 'entity', 'entity_id', 'action', 'diff'])]
class AuditLog extends Model
{
    public $timestamps = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'diff' => 'array',
            'at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
