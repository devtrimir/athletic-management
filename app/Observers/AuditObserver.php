<?php

namespace App\Observers;

use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class AuditObserver
{
    /** Fields stripped from every diff — noise or sensitive data. */
    private const EXCLUDED = [
        'created_at',
        'updated_at',
        'deleted_at',
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
    ];

    public function created(Model $model): void
    {
        app(AuditLogger::class)->log(
            'created',
            $model,
            $this->filterAttributes($model->getAttributes()),
        );
    }

    public function updated(Model $model): void
    {
        $dirty = array_keys($model->getDirty());
        $relevant = array_diff($dirty, self::EXCLUDED);

        if (empty($relevant)) {
            return;
        }

        $old = array_intersect_key($model->getOriginal(), array_flip($relevant));
        $new = array_intersect_key($model->getAttributes(), array_flip($relevant));

        app(AuditLogger::class)->log('updated', $model, ['old' => $old, 'new' => $new]);
    }

    public function deleted(Model $model): void
    {
        app(AuditLogger::class)->log(
            'deleted',
            $model,
            $this->filterAttributes($model->getOriginal()),
        );
    }

    /**
     * @param  array<string, mixed> $attributes
     * @return array<string, mixed>
     */
    private function filterAttributes(array $attributes): array
    {
        return array_diff_key($attributes, array_flip(self::EXCLUDED));
    }
}
