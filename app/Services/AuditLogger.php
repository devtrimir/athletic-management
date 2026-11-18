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
            'user_id' => Auth::guard('web')->id(),
            'organization_id' => $model->getAttribute('organization_id'),
            'entity' => class_basename($model),
            'entity_id' => $model->getKey(),
            'action' => $action,
            'diff' => $diff,
        ]);
    }

    /**
     * Record a many-to-many sync (attached/detached ids) against the owning model.
     *
     * @param  array{attached: array<int, mixed>, detached: array<int, mixed>, updated: array<int, mixed>}  $changes  Result of BelongsToMany::sync()
     */
    public function logSync(Model $model, string $relation, array $changes): void
    {
        if ($changes['attached'] === [] && $changes['detached'] === []) {
            return;
        }

        $this->log('relation_synced', $model, [
            'relation' => $relation,
            'attached' => array_values($changes['attached']),
            'detached' => array_values($changes['detached']),
        ]);
    }
}
