<?php

declare(strict_types=1);

use App\Jobs\ExportReportJob;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth / authorisation
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access export endpoint', function (): void {
    $this->get(route('reports.export', ['key' => 'medal-tally', 'format' => 'xlsx']))
        ->assertRedirectToRoute('login');
});

test('user without reports.view gets 403 on export', function (): void {
    $user = rcUser();

    $this->actingAs($user)
        ->get(route('reports.export', ['key' => 'medal-tally', 'format' => 'xlsx']))
        ->assertForbidden();
});

test('unknown key returns 404 on export', function (): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)
        ->get(route('reports.export', ['key' => 'no-such-report', 'format' => 'xlsx']))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------

test('missing format returns 422', function (): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)
        ->getJson(route('reports.export', ['key' => 'medal-tally']))
        ->assertUnprocessable();
});

test('invalid format returns 422', function (): void {
    $user = rcUser('reports.view');

    $this->actingAs($user)
        ->getJson(route('reports.export', ['key' => 'medal-tally', 'format' => 'csv']))
        ->assertUnprocessable();
});

// ---------------------------------------------------------------------------
// Inline XLSX download (small dataset)
// ---------------------------------------------------------------------------

test('valid xlsx export streams file inline for small dataset', function (): void {
    $user = rcUser('reports.view');

    $response = $this->actingAs($user)
        ->get(route('reports.export', ['key' => 'medal-tally', 'format' => 'xlsx']));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))
        ->toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('Content-Disposition'))
        ->toContain('medal-tally.xlsx');
});

// ---------------------------------------------------------------------------
// Queued path (large dataset)
// ---------------------------------------------------------------------------

test('large dataset dispatches ExportReportJob and returns 202', function (): void {
    Queue::fake();

    $mock = $this->mock(MedalTallyReport::class);
    $mock->shouldReceive('run')
        ->andReturn(collect(range(1, 501))->map(fn ($i) => (object) ['rank' => $i, 'sport' => 'test']));

    $user = rcUser('reports.view');

    $response = $this->actingAs($user)
        ->get(route('reports.export', ['key' => 'medal-tally', 'format' => 'xlsx']));

    $response->assertStatus(202)
        ->assertJsonFragment(['status' => 'queued'])
        ->assertJsonStructure(['status', 'job_id']);

    Queue::assertPushed(ExportReportJob::class, function (ExportReportJob $job): bool {
        return $job->key === 'medal-tally';
    });
});
