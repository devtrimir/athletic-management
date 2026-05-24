<?php

declare(strict_types=1);

use App\Concerns\HasReportFilters;
use Illuminate\Http\Request;

// Minimal anonymous class so we can test the trait in isolation.
function makeFilterHost(): object
{
    return new class
    {
        use HasReportFilters;

        public function filterRules(): array
        {
            return $this->reportFilterRules();
        }

        public function filters(Request $request): array
        {
            return $this->resolvedFilters($request);
        }
    };
}

test('reportFilterRules returns rules for all four filter keys', function (): void {
    $rules = makeFilterHost()->filterRules();

    expect($rules)->toHaveKeys(['session_id', 'sport_id', 'unit_id', 'tier_id']);

    foreach (['session_id', 'sport_id', 'unit_id', 'tier_id'] as $key) {
        expect($rules[$key])->toContain('nullable', 'integer');
    }
});

test('resolvedFilters returns nulls when no query params present', function (): void {
    $request = Request::create('/reports', 'GET');

    $filters = makeFilterHost()->filters($request);

    expect($filters)->toBe([
        'session_id' => null,
        'sport_id' => null,
        'unit_id' => null,
        'tier_id' => null,
    ]);
});

test('resolvedFilters returns correct integers when params present', function (): void {
    $request = Request::create('/reports', 'GET', [
        'session_id' => '3',
        'sport_id' => '7',
        'unit_id' => '12',
        'tier_id' => '2',
    ]);

    $filters = makeFilterHost()->filters($request);

    expect($filters)->toBe([
        'session_id' => 3,
        'sport_id' => 7,
        'unit_id' => 12,
        'tier_id' => 2,
    ]);
});

test('resolvedFilters coerces zero to null', function (): void {
    $request = Request::create('/reports', 'GET', ['session_id' => '0']);

    $filters = makeFilterHost()->filters($request);

    expect($filters['session_id'])->toBeNull();
});
