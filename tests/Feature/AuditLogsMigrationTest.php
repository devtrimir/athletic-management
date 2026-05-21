<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('audit_logs table has expected columns', function (): void {
    expect(Schema::hasColumns('audit_logs', [
        'id', 'user_id', 'organization_id', 'entity', 'entity_id',
        'action', 'diff', 'at',
    ]))->toBeTrue();
});

test('audit_logs table has no timestamps columns', function (): void {
    expect(Schema::hasColumn('audit_logs', 'created_at'))->toBeFalse()
        ->and(Schema::hasColumn('audit_logs', 'updated_at'))->toBeFalse();
});

test('audit_logs table has composite index on organization_id entity at', function (): void {
    $columns = collect(Schema::getIndexes('audit_logs'))
        ->map(fn (array $idx) => $idx['columns'])
        ->values()
        ->toArray();

    expect($columns)->toContain(['organization_id', 'entity', 'at']);
});
