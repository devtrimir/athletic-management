<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BelongsToOrganization implements Scope
{
    /**
     * Apply the scope to the given Eloquent query builder.
     *
     * Unauthenticated requests receive `organization_id = 0` which matches
     * no real row — preventing data leaks without throwing an exception.
     *
     * ESCAPE HATCH — allowed in background reindex jobs only:
     *   Model::withoutGlobalScope(BelongsToOrganization::class)->get();
     */
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where(
            $model->getTable().'.organization_id',
            auth()->user()?->organization_id ?? 0,
        );
    }
}
