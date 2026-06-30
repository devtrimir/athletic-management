<?php

declare(strict_types=1);

use App\Http\Requests\Members\ChangeStatusRequest;
use Illuminate\Support\Facades\Validator;

function changeStatusValidator(array $data)
{
    $request = new ChangeStatusRequest;
    $request->merge($data);

    return Validator::make($data, $request->rules(), $request->messages());
}

test('valid payload passes ChangeStatusRequest', function () {
    $result = changeStatusValidator([
        'status' => 'ACTIVE',
        'effective_on' => '2026-01-15',
    ]);

    expect($result->passes())->toBeTrue();
});

test('status is required', function () {
    $result = changeStatusValidator(['effective_on' => '2026-01-15']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('status'))->toBeTrue();
});

test('status must be in enum', function () {
    $result = changeStatusValidator(['status' => 'SUSPENDED', 'effective_on' => '2026-01-15']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('status'))->toBeTrue();
});

test('effective_on is required', function () {
    $result = changeStatusValidator(['status' => 'ACTIVE']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('effective_on'))->toBeTrue();
});

test('effective_on must be a date', function () {
    $result = changeStatusValidator(['status' => 'ACTIVE', 'effective_on' => 'not-a-date']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('effective_on'))->toBeTrue();
});

test('reason is optional', function () {
    $result = changeStatusValidator(['status' => 'RETIRED', 'effective_on' => '2026-06-01']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('reason'))->toBeTrue();
});

test('reason accepted when provided', function () {
    $result = changeStatusValidator([
        'status' => 'RETIRED',
        'effective_on' => '2026-06-01',
        'reason' => 'सेवानिवृत्ति',
    ]);

    expect($result->passes())->toBeTrue();
});

test('reason is required for inactive status', function () {
    $result = changeStatusValidator(['status' => 'INACTIVE', 'effective_on' => '2026-06-01']);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('reason'))->toBeTrue();
});

test('reason remains optional for active status', function () {
    $result = changeStatusValidator(['status' => 'ACTIVE', 'effective_on' => '2026-06-01']);

    expect($result->passes())->toBeTrue();
});
