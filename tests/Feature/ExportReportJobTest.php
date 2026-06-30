<?php

declare(strict_types=1);

use App\Exports\ReportExport;
use App\Jobs\ExportReportJob;
use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\Unit;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Maatwebsite\Excel\Facades\Excel;

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
        ->toContain('medal-tally-'.now()->format('Y-m-d').'.xlsx');
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

test('resignation dismissal export honours applied filters', function (): void {
    Excel::fake();

    $user = rcUser('reports.view');
    $user->update(['locale' => 'en']);
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);

    $matchingMember = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RESIGNED',
        'current_unit_id' => $unit->id,
        'full_name' => 'Amit Kumar',
        'pno' => 'PNO-1001',
    ]);
    MemberStatusHistory::factory()->create([
        'member_id' => $matchingMember->id,
        'status' => 'RESIGNED',
        'effective_on' => '2024-01-10',
    ]);

    $filteredOutByName = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RESIGNED',
        'current_unit_id' => $unit->id,
        'full_name' => 'Rahul Singh',
        'pno' => 'PNO-2002',
    ]);
    MemberStatusHistory::factory()->create([
        'member_id' => $filteredOutByName->id,
        'status' => 'RESIGNED',
        'effective_on' => '2024-01-10',
    ]);

    $filteredOutByUnit = Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RESIGNED',
        'full_name' => 'Amit Kumar',
        'pno' => 'PNO-3003',
    ]);
    MemberStatusHistory::factory()->create([
        'member_id' => $filteredOutByUnit->id,
        'status' => 'RESIGNED',
        'effective_on' => '2024-01-10',
    ]);

    $this->actingAs($user)
        ->get(route('reports.export', [
            'key' => 'resignation-dismissal-log',
            'format' => 'xlsx',
            'unit_id' => $unit->id,
            'member_name' => 'Amit',
            'pno' => '1001',
        ]))
        ->assertOk();

    Excel::assertDownloaded('resignation-dismissal-log-'.now()->format('Y-m-d').'.xlsx', function (ReportExport $export): bool {
        $rows = $export->collection()->values()->all();
        $headings = $export->headings();

        return $export->title() === 'Resignation / Dismissal Log'
            && count($rows) === 1
            && $headings[0][0] === 'Report: Resignation / Dismissal Log'
            && $headings[1][0] === 'S. No.'
            && ! in_array('id', $headings[1], true)
            && ! in_array('member_code', $headings[1], true)
            && $rows[0][0] === 1
            && $rows[0][1] === 'PNO-1001'
            && $rows[0][2] === 'Amit Kumar'
            && $export->mergeRanges() === ['A1:H1'];
    });
});
