<?php

declare(strict_types=1);

use App\Http\Requests\Members\ChangeStatusRequest;
use Illuminate\Support\Facades\Validator;

function changeStatusRules(): array
{
    return (new ChangeStatusRequest)->rules();
}

test('valid payload passes ChangeStatusRequest', function () {
    $result = Validator::make([
        'status' => 'RESIGNED',
        'effective_on' => '2026-01-15',
    ], changeStatusRules());

    expect($result->passes())->toBeTrue();
});

test('status is required', function () {
    $result = Validator::make(['effective_on' => '2026-01-15'], changeStatusRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('status'))->toBeTrue();
});

test('status must be in enum', function () {
    $result = Validator::make(['status' => 'SUSPENDED', 'effective_on' => '2026-01-15'], changeStatusRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('status'))->toBeTrue();
});

test('effective_on is required', function () {
    $result = Validator::make(['status' => 'ACTIVE'], changeStatusRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('effective_on'))->toBeTrue();
});

test('effective_on must be a date', function () {
    $result = Validator::make(['status' => 'ACTIVE', 'effective_on' => 'not-a-date'], changeStatusRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('effective_on'))->toBeTrue();
});

test('reason_hi is optional', function () {
    $result = Validator::make(['status' => 'RETIRED', 'effective_on' => '2026-06-01'], changeStatusRules());

    expect($result->passes())->toBeTrue();
});

test('reason_hi accepted when provided', function () {
    $result = Validator::make([
        'status' => 'RETIRED',
        'effective_on' => '2026-06-01',
        'reason_hi' => 'सेवानिवृत्ति',
    ], changeStatusRules());

    expect($result->passes())->toBeTrue();
});
