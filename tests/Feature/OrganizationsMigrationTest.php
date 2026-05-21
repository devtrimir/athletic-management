<?php

use App\Models\Organization;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;

test('organizations table exists with expected columns', function (): void {
    expect(Schema::hasTable('organizations'))->toBeTrue();
    expect(Schema::hasColumns('organizations', ['id', 'name', 'code', 'created_at', 'updated_at']))->toBeTrue();
});

test('factory creates a valid organization record', function (): void {
    $org = Organization::factory()->create();

    expect($org->id)->toBeInt()
        ->and($org->name)->toBeString()->not->toBeEmpty()
        ->and($org->code)->toBeString()->not->toBeEmpty();
});

test('code column enforces unique constraint', function (): void {
    Organization::factory()->create(['code' => 'UPP']);

    expect(fn () => Organization::factory()->create(['code' => 'UPP']))
        ->toThrow(QueryException::class);
});
