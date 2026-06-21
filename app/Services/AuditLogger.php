<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $diff
     */
    public function log(string $action, Model $model, ?array $diff = null): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'organization_id' => $model->getAttribute('organization_id'),
            'entity' => class_basename($model),
            'entity_id' => $model->getKey(),
            'action' => $action,
            'diff' => $diff,
        ]);
    }
}
