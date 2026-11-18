<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $user_id
 * @property int|null $organization_id
 * @property string $entity
 * @property int|null $entity_id
 * @property string $action
 * @property string|null $actor_type 'user', 'external_coach' or 'system'
 * @property int|null $actor_id
 * @property string|null $source 'web' or 'console'
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property string|null $url
 * @property string|null $http_method
 * @property string|null $request_id Groups every row written by one request/job
 * @property array<string, mixed>|null $diff
 * @property Carbon $at
 */
#[Fillable(['user_id', 'actor_type', 'actor_id', 'organization_id', 'entity', 'entity_id', 'action', 'source', 'diff', 'ip_address', 'user_agent', 'url', 'http_method', 'request_id'])]
class AuditLog extends Model
{
    public $timestamps = false;

    /** Guards recognised as actors, in priority order, mapped to the actor_type stored. */
    private const ACTOR_GUARDS = ['web' => 'user', 'external_coach' => 'external_coach'];

    /**
     * Every audit row — whether written by AuditLogger or directly — is stamped with
     * who did it and from where, so callers cannot forget the context.
     */
    protected static function booted(): void
    {
        static::creating(function (AuditLog $log): void {
            // A resolved route means an HTTP request is being handled (also true under test
            // runners, where runningInConsole() is true); queue jobs and commands have none.
            $isHttp = request()->route() !== null;
            $log->source ??= $isHttp ? 'web' : 'console';
            $log->request_id ??= Context::rememberHidden('audit_request_id', fn (): string => (string) Str::uuid());

            if ($log->actor_type === null) {
                foreach (self::ACTOR_GUARDS as $guard => $type) {
                    $id = Auth::guard($guard)->id();

                    if ($id !== null) {
                        $log->actor_type = $type;
                        $log->actor_id = (int) $id;

                        break;
                    }
                }

                $log->actor_type ??= 'system';
            }

            $log->user_id ??= $log->actor_type === 'user' ? $log->actor_id : null;

            if ($isHttp) {
                $request = request();
                $log->ip_address ??= $request->ip();
                $log->user_agent ??= mb_substr((string) $request->userAgent(), 0, 500);
                $log->url ??= mb_substr($request->url(), 0, 2048);
                $log->http_method ??= $request->method();
            }
        });
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @param  array{entity?: ?string, action?: ?string, actor_type?: ?string, source?: ?string, from?: ?string, to?: ?string, q?: ?string}  $filters
     */
    #[Scope]
    protected function filter(Builder $query, array $filters): void
    {
        $query
            ->when($filters['entity'] ?? null, fn (Builder $query, string $value) => $query->where('entity', $value))
            ->when($filters['action'] ?? null, fn (Builder $query, string $value) => $query->where('action', $value))
            ->when($filters['actor_type'] ?? null, fn (Builder $query, string $value) => $query->where('actor_type', $value))
            ->when($filters['source'] ?? null, fn (Builder $query, string $value) => $query->where('source', $value))
            ->when($filters['from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('at', '>=', $value))
            ->when($filters['to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('at', '<=', $value))
            ->when($filters['q'] ?? null, fn (Builder $query, string $value) => $query->where(function (Builder $query) use ($value): void {
                $query->where('request_id', $value)
                    ->orWhere('ip_address', $value)
                    ->when(ctype_digit($value), fn (Builder $query) => $query->orWhere('entity_id', (int) $value));
            }));
    }

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
