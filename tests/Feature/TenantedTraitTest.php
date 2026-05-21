<?php

use App\Concerns\Tenanted;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

// Anonymous Eloquent model backed by a temp table created per-test.
function tenantedModel(): Model
{
    return new class extends Model
    {
        use Tenanted;

        public $timestamps = false;

        protected $table = 'test_tenanted_items';
    };
}

beforeEach(function (): void {
    Schema::create('test_tenanted_items', function (Blueprint $table): void {
        $table->id();
        $table->unsignedBigInteger('organization_id');
        $table->string('name');
    });
});

afterEach(function (): void {
    Schema::dropIfExists('test_tenanted_items');
});

test('tenanted model only returns rows belonging to the authenticated user org', function (): void {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $user = User::factory()->create(['organization_id' => $orgA->id]);

    // Insert one record per org directly (bypass scope via DB facade).
    DB::table('test_tenanted_items')->insert([
        ['organization_id' => $orgA->id, 'name' => 'item-a'],
        ['organization_id' => $orgB->id, 'name' => 'item-b'],
    ]);

    $this->actingAs($user);

    $model = tenantedModel();

    expect($model->newQuery()->pluck('name')->all())->toBe(['item-a']);
});

test('withoutGlobalScope bypasses tenant filter and returns all rows', function (): void {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $user = User::factory()->create(['organization_id' => $orgA->id]);

    DB::table('test_tenanted_items')->insert([
        ['organization_id' => $orgA->id, 'name' => 'item-a'],
        ['organization_id' => $orgB->id, 'name' => 'item-b'],
    ]);

    $this->actingAs($user);

    $model = tenantedModel();

    $names = $model->newQueryWithoutScopes()
        ->withoutGlobalScope(BelongsToOrganization::class)
        ->pluck('name')
        ->sort()
        ->values()
        ->all();

    expect($names)->toBe(['item-a', 'item-b']);
});

test('unauthenticated query returns no rows', function (): void {
    $org = Organization::factory()->create();

    DB::table('test_tenanted_items')->insert([
        ['organization_id' => $org->id, 'name' => 'item-a'],
    ]);

    // No actingAs — guest request.
    $model = tenantedModel();

    expect($model->newQuery()->count())->toBe(0);
});
