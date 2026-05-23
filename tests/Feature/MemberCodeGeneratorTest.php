<?php

declare(strict_types=1);

use App\Services\MemberCodeGenerator;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->orgId = DB::table('organizations')->insertGetId([
        'name' => 'Code Gen Org',
        'code' => 'CGO'.fake()->unique()->numerify('##'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->generator = app(MemberCodeGenerator::class);
});

test('generated code matches UPP-{year}-{6-digit-seq} format', function () {
    $code = $this->generator->next($this->orgId);

    expect($code)->toMatch('/^UPP-\d{4}-\d{6}$/');
});

test('first code for a new org starts at 000001', function () {
    $code = $this->generator->next($this->orgId);

    expect($code)->toBe('UPP-'.now()->year.'-000001');
});

test('sequential calls increment the sequence', function () {
    $codes = [
        $this->generator->next($this->orgId),
        $this->generator->next($this->orgId),
        $this->generator->next($this->orgId),
    ];

    $year = now()->year;
    expect($codes)->toBe([
        "UPP-{$year}-000001",
        "UPP-{$year}-000002",
        "UPP-{$year}-000003",
    ]);
});

test('different organisations have independent sequences', function () {
    $orgB = DB::table('organizations')->insertGetId([
        'name' => 'Org B',
        'code' => 'OGB'.fake()->unique()->numerify('##'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $year = now()->year;

    expect($this->generator->next($this->orgId))->toBe("UPP-{$year}-000001");
    expect($this->generator->next($orgB))->toBe("UPP-{$year}-000001");
    expect($this->generator->next($this->orgId))->toBe("UPP-{$year}-000002");
});

test('different years have independent sequences', function () {
    $year = now()->year;

    expect($this->generator->next($this->orgId, $year))->toBe("UPP-{$year}-000001");
    expect($this->generator->next($this->orgId, $year + 1))->toBe('UPP-'.($year + 1).'-000001');
    expect($this->generator->next($this->orgId, $year))->toBe("UPP-{$year}-000002");
});

// ── nextBatch ────────────────────────────────────────────────────────────────

test('nextBatch returns the requested number of codes', function () {
    $codes = $this->generator->nextBatch($this->orgId, 5);

    expect($codes)->toHaveCount(5);
});

test('nextBatch returns sequential codes starting at 000001', function () {
    $year = now()->year;
    $codes = $this->generator->nextBatch($this->orgId, 3, $year);

    expect($codes)->toBe([
        "UPP-{$year}-000001",
        "UPP-{$year}-000002",
        "UPP-{$year}-000003",
    ]);
});

test('next() after nextBatch continues the sequence without gaps', function () {
    $year = now()->year;
    $this->generator->nextBatch($this->orgId, 5, $year);

    expect($this->generator->next($this->orgId, $year))->toBe("UPP-{$year}-000006");
});
