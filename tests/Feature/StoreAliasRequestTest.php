<?php

declare(strict_types=1);

use App\Http\Requests\Members\StoreAliasRequest;
use Illuminate\Support\Facades\Validator;

function aliasRules(): array
{
    return (new StoreAliasRequest)->rules();
}

test('valid payload passes StoreAliasRequest', function () {
    $result = Validator::make([
        'alias_hi' => 'राम',
        'source' => 'manual',
    ], aliasRules());

    expect($result->passes())->toBeTrue();
});

test('alias_hi is required', function () {
    $result = Validator::make(['source' => 'manual'], aliasRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('alias_hi'))->toBeTrue();
});

test('source is required', function () {
    $result = Validator::make(['alias_hi' => 'राम'], aliasRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('source'))->toBeTrue();
});

test('source must be in enum', function () {
    $result = Validator::make(['alias_hi' => 'राम', 'source' => 'unknown'], aliasRules());

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('source'))->toBeTrue();
});

test('all valid source values are accepted', function (string $source) {
    $result = Validator::make(['alias_hi' => 'राम', 'source' => $source], aliasRules());

    expect($result->passes())->toBeTrue();
})->with(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual']);
