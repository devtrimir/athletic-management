<?php

use App\Models\AuditLog;
use App\Models\District;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('creating an auditable model writes a created log', function (): void {
    $district = District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $log = AuditLog::where('entity', 'District')
        ->where('entity_id', $district->id)
        ->where('action', 'created')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->diff)->toHaveKey('code')
        ->and($log->diff['code'])->toBe('LKO');
});

test('updating an auditable model writes an updated log with old and new', function (): void {
    $district = District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $district->update(['name' => 'Lucknow City']);

    $log = AuditLog::where('entity', 'District')
        ->where('entity_id', $district->id)
        ->where('action', 'updated')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->diff)->toHaveKey('old')
        ->and($log->diff)->toHaveKey('new')
        ->and($log->diff['old']['name'])->toBe('Lucknow')
        ->and($log->diff['new']['name'])->toBe('Lucknow City');
});

test('deleting an auditable model writes a deleted log', function (): void {
    $district = District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);
    $id = $district->id;

    $district->delete();

    $log = AuditLog::where('entity', 'District')
        ->where('entity_id', $id)
        ->where('action', 'deleted')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->diff)->toHaveKey('code');
});

test('diff excludes noise fields', function (): void {
    $district = District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $log = AuditLog::where('entity', 'District')->where('action', 'created')->first();

    expect($log->diff)->not->toHaveKey('created_at')
        ->and($log->diff)->not->toHaveKey('updated_at');
});

test('updated log only contains changed fields', function (): void {
    $district = District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $district->update(['name' => 'Lucknow City']);

    $log = AuditLog::where('action', 'updated')->first();

    expect(array_keys($log->diff['old']))->toBe(['name'])
        ->and(array_keys($log->diff['new']))->toBe(['name']);
});

test('cli context writes log with null user_id', function (): void {
    // No Auth::login — simulates CLI/seeder context.
    District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $log = AuditLog::where('action', 'created')->first();

    expect($log->user_id)->toBeNull();
});

test('authenticated user id is stored in audit log', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);

    District::create([
        'name' => 'लखनऊ',
        'name' => 'Lucknow',
        'state' => 'Uttar Pradesh',
        'code' => 'LKO',
    ]);

    $log = AuditLog::where('action', 'created')->first();

    expect($log->user_id)->toBe($user->id);
});
