<?php

declare(strict_types=1);

use App\Http\Requests\Members\StoreMemberRequest;
use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\TournamentTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);

    // Mirror production: the tournament tier master is always seeded.
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'AIPSC', 'label_hi' => 'अखिल भारतीय पुलिस खेल', 'label_en' => 'AIPSC', 'weight' => 70],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
        ['code' => 'ZONAL', 'label_hi' => 'क्षेत्रीय', 'label_en' => 'Zonal', 'weight' => 40],
        ['code' => 'OTHER', 'label_hi' => 'अन्य', 'label_en' => 'Other', 'weight' => 10],
    ], uniqueBy: ['code']);
});

function validMemberPayload(): array
{
    return [
        'full_name' => 'राम कुमार',
        'gender' => 'M',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
    ];
}

function memberRules(User $user): array
{
    $request = new StoreMemberRequest;
    $request->setUserResolver(fn () => $user);

    return $request->rules();
}

test('valid payload passes StoreMemberRequest', function () {
    $rules = memberRules($this->user);
    $result = Validator::make(validMemberPayload(), $rules);

    expect($result->passes())->toBeTrue();
});

test('full_name is required', function () {
    $rules = memberRules($this->user);
    $result = Validator::make(['gender' => 'M', 'player_category' => 'GD', 'player_level' => 'ZONAL'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('full_name'))->toBeTrue();
});

test('gender must be in M F O', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'gender' => 'X'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('gender'))->toBeTrue();
});

test('player_category must be in GD sports quota', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'player_category' => 'INVALID'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('player_category'))->toBeTrue();
});

test('player_level must exist in tournament_tiers', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'player_level' => 'INVALID'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('player_level'))->toBeTrue();
});

test('player_level accepts any tier code from the database', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'player_level' => 'STATE'], $rules);

    expect($result->passes())->toBeTrue();
});

test('pno null passes', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'pno' => null], $rules);

    expect($result->passes())->toBeTrue();
});

test('posting_district_id must exist', function () {
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'posting_district_id' => 99999], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('posting_district_id'))->toBeTrue();
});

test('posting_district_id accepts existing district', function () {
    $district = District::factory()->create();
    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'posting_district_id' => $district->id], $rules);

    expect($result->passes())->toBeTrue();
});

test('duplicate pno in same org fails', function () {
    Member::factory()->create([
        'organization_id' => $this->org->id,
        'pno' => '1234567890',
    ]);

    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'pno' => '1234567890'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('pno'))->toBeTrue();
});

test('same pno in different org passes', function () {
    $otherOrg = Organization::factory()->create();
    Member::factory()->create([
        'organization_id' => $otherOrg->id,
        'pno' => '1234567890',
    ]);

    $rules = memberRules($this->user);
    $result = Validator::make([...validMemberPayload(), 'pno' => '1234567890'], $rules);

    expect($result->passes())->toBeTrue();
});
