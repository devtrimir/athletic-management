<?php

declare(strict_types=1);

use App\Http\Requests\Members\UpdateMemberRequest;
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
    $this->member = Member::factory()->create(['organization_id' => $this->org->id, 'pno' => null]);

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

function updateRules(User $user, Member $member): array
{
    $request = new UpdateMemberRequest;
    $request->setUserResolver(fn () => $user);
    $request->setRouteResolver(fn () => new class($member)
    {
        public function __construct(private Member $member) {}

        public function parameter(string $key): mixed
        {
            return $this->member;
        }
    });

    return $request->rules();
}

test('empty payload passes UpdateMemberRequest (all fields are sometimes)', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make([], $rules);

    expect($result->passes())->toBeTrue();
});

test('valid partial payload passes', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['full_name' => 'नया नाम'], $rules);

    expect($result->passes())->toBeTrue();
});

test('gender invalid fails', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['gender' => 'Z'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('gender'))->toBeTrue();
});

test('player_level invalid fails', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['player_level' => 'DISTRICT'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('player_level'))->toBeTrue();
});

test('player_level accepts any tier code from the database', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['player_level' => 'STATE'], $rules);

    expect($result->passes())->toBeTrue();
});

test('posting_district_id must exist', function () {
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['posting_district_id' => 99999], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('posting_district_id'))->toBeTrue();
});

test('posting_district_id accepts existing district', function () {
    $district = District::factory()->create();
    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['posting_district_id' => $district->id], $rules);

    expect($result->passes())->toBeTrue();
});

test('duplicate pno in same org fails', function () {
    Member::factory()->create(['organization_id' => $this->org->id, 'pno' => '9999999999']);

    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['pno' => '9999999999'], $rules);

    expect($result->fails())->toBeTrue()
        ->and($result->errors()->has('pno'))->toBeTrue();
});

test('updating own pno passes (ignore self)', function () {
    $this->member->pno = '5555555555';
    $this->member->save();

    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['pno' => '5555555555'], $rules);

    expect($result->passes())->toBeTrue();
});

test('same pno in different org passes', function () {
    $otherOrg = Organization::factory()->create();
    Member::factory()->create(['organization_id' => $otherOrg->id, 'pno' => '7777777777']);

    $rules = updateRules($this->user, $this->member);
    $result = Validator::make(['pno' => '7777777777'], $rules);

    expect($result->passes())->toBeTrue();
});
