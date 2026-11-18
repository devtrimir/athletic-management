<?php

use App\Models\AuditLog;
use App\Models\ExternalCoach;
use App\Services\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('audit rows capture actor, request context and a shared request id', function () {
    $user = rcUser('external-coaches.view', 'external-coaches.create');
    $this->actingAs($user)
        ->withHeaders(['User-Agent' => 'AuditTest/1.0'])
        ->post(route('external-coaches.store'), [
            'name' => 'Audited Coach',
            'email' => 'audited@example.test',
            'password' => 'password',
            'status' => 'active',
        ])
        ->assertSessionHasNoErrors();

    $logs = AuditLog::query()->where('entity', 'ExternalCoach')->get();

    expect($logs->pluck('action')->all())->toContain('created')
        ->and($logs->every(fn (AuditLog $log) => $log->actor_type === 'user' && $log->actor_id === $user->id && $log->user_id === $user->id))->toBeTrue()
        ->and($logs->every(fn (AuditLog $log) => $log->source === 'web' && $log->http_method === 'POST' && $log->user_agent === 'AuditTest/1.0' && $log->ip_address !== null))->toBeTrue()
        ->and($logs->pluck('request_id')->unique()->count())->toBe(1);
});

test('sync changes are logged only when something was attached or detached', function () {
    $coach = ExternalCoach::factory()->create();
    $logger = app(AuditLogger::class);

    $logger->logSync($coach, 'sports', ['attached' => [], 'detached' => [], 'updated' => []]);
    expect(AuditLog::query()->where('action', 'relation_synced')->count())->toBe(0);

    $logger->logSync($coach, 'sports', ['attached' => [3], 'detached' => [5], 'updated' => []]);
    expect(AuditLog::query()->where('action', 'relation_synced')->first()->diff)
        ->toBe(['relation' => 'sports', 'attached' => [3], 'detached' => [5]]);
});

test('actions outside a user session are attributed to the external coach or the system', function () {
    $coach = ExternalCoach::factory()->create();
    $this->actingAs($coach, 'external_coach');

    app(AuditLogger::class)->log('custom', $coach);
    expect(AuditLog::query()->latest('id')->first())
        ->actor_type->toBe('external_coach')
        ->actor_id->toBe($coach->id)
        ->user_id->toBeNull();

    auth()->guard('external_coach')->logout();
    app(AuditLogger::class)->log('custom', $coach);

    expect(AuditLog::query()->latest('id')->first())
        ->actor_type->toBe('system')
        ->source->toBe('console');
});

test('soft delete, restore and force delete are distinguished', function () {
    $coach = ExternalCoach::factory()->create();

    $coach->delete();
    $coach->restore();
    $coach->forceDelete();

    expect(AuditLog::query()->where('entity', 'ExternalCoach')->where('entity_id', $coach->id)->pluck('action')->all())
        ->toContain('deleted', 'restored', 'force_deleted');
});

test('audit log viewer requires permission, filters and is organization scoped', function () {
    $viewer = rcUser('audit-logs.view');
    $other = rcUser('external-coaches.view');

    AuditLog::create(['organization_id' => $viewer->organization_id, 'entity' => 'Member', 'entity_id' => 7, 'action' => 'created']);
    AuditLog::create(['organization_id' => $viewer->organization_id, 'entity' => 'Sport', 'entity_id' => 8, 'action' => 'updated']);
    AuditLog::create(['organization_id' => $other->organization_id, 'entity' => 'Member', 'entity_id' => 9, 'action' => 'created']);

    $this->actingAs($other)->get(route('audit-logs.index'))->assertForbidden();

    $this->actingAs($viewer)
        ->get(route('audit-logs.index', ['entity' => 'Member']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit-logs/index')
            ->has('logs.data', 1)
            ->where('logs.data.0.entity_id', 7)
            ->where('entities', fn ($entities) => collect($entities)->contains('Member') && collect($entities)->contains('Sport')));
});
