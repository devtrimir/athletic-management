<?php

namespace App\Concerns;

use App\Models\Scopes\BelongsToOrganization;

/**
 * Auto-applies the BelongsToOrganization global scope to any model
 * that has an `organization_id` column, enforcing per-tenant isolation.
 *
 * ESCAPE HATCH — allowed in background reindex jobs only:
 *   Model::withoutGlobalScope(BelongsToOrganization::class)->get();
 *
 * Never bypass the scope in user-facing controllers or policies.
 */
trait Tenanted
{
    protected static function booted(): void
    {
        static::addGlobalScope(new BelongsToOrganization);
    }
}
