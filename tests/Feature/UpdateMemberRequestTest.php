<?php

declare(strict_types=1);

use App\Http\Requests\Members\UpdateMemberRequest;
use App\Models\Member;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);
    $this->member = Member::factory()->create(['organization_id' => $this->org->id, 'pno' => null]);
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
    $result = Validator::make(['full_name_hi' => 'नया नाम'], $rules);

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
