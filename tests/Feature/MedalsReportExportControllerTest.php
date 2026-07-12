<?php

use App\Jobs\GenerateMedalsReportExportJob;
use App\Models\ReportExport;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

it('allows an authorized user to create a medals export', function (): void {
    Queue::fake();

    $user = rcUser('reports.view');

    $response = $this->actingAs($user)->post(route('reports.medals.exports.store'), [
        'format' => 'pdf',
        'sections' => ['tally', 'detail'],
        'orientation' => 'landscape',
        'group_by' => 'tier',
    ]);

    $response->assertAccepted()
        ->assertJsonPath('status', ReportExport::STATUS_PENDING)
        ->assertJsonPath('format', 'pdf');

    $export = ReportExport::query()->firstOrFail();

    expect($export->organization_id)->toBe($user->organization_id)
        ->and($export->user_id)->toBe($user->id)
        ->and($export->report_type)->toBe('medals')
        ->and($export->options['sections'])->toBe(['tally', 'detail']);

    Queue::assertPushed(GenerateMedalsReportExportJob::class);
});

it('blocks users without report permission from creating medals exports', function (): void {
    Queue::fake();

    $this->actingAs(rcUser())->post(route('reports.medals.exports.store'), [
        'format' => 'xlsx',
        'sections' => ['detail'],
    ])->assertForbidden();

    Queue::assertNothingPushed();
});

it('keeps medals exports scoped to their owner and organization', function (): void {
    $owner = rcUser('reports.view');
    $otherUser = User::factory()->create(['organization_id' => $owner->organization_id]);
    $viewer = rcUser('reports.view');

    $export = ReportExport::factory()->create([
        'organization_id' => $owner->organization_id,
        'user_id' => $otherUser->id,
        'report_type' => 'medals',
    ]);

    $this->actingAs($owner)
        ->get(route('reports.medals.exports.show', $export))
        ->assertNotFound();

    $this->actingAs($viewer)
        ->get(route('reports.medals.exports.show', $export))
        ->assertNotFound();
});

it('downloads a completed medals export from private storage', function (): void {
    Storage::fake('local');

    $user = rcUser('reports.view');
    $path = 'exports/medals/report.pdf';
    Storage::disk('local')->put($path, 'pdf bytes');

    $export = ReportExport::factory()->create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->id,
        'report_type' => 'medals',
        'format' => 'pdf',
        'status' => ReportExport::STATUS_COMPLETED,
        'file_path' => $path,
        'file_name' => 'medal-report.pdf',
    ]);

    $this->actingAs($user)
        ->get(route('reports.medals.exports.download', $export))
        ->assertOk()
        ->assertDownload('medal-report.pdf');
});

it('generates a private pdf medals export file', function (): void {
    Storage::fake('local');

    $user = rcUser('reports.view');
    $export = ReportExport::factory()->create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->id,
        'report_type' => 'medals',
        'format' => 'pdf',
        'status' => ReportExport::STATUS_PENDING,
        'filters' => [],
        'options' => [
            'sections' => ['detail'],
            'orientation' => 'landscape',
            'group_by' => 'tier',
        ],
    ]);

    app()->call([new GenerateMedalsReportExportJob($export->id), 'handle']);

    $export->refresh();

    expect($export->status)->toBe(ReportExport::STATUS_COMPLETED)
        ->and($export->file_path)->toEndWith('.pdf');

    Storage::disk('local')->assertExists($export->file_path);
});

it('generates a private excel medals export file', function (): void {
    Storage::fake('local');

    $user = rcUser('reports.view');
    $export = ReportExport::factory()->create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->id,
        'report_type' => 'medals',
        'format' => 'xlsx',
        'status' => ReportExport::STATUS_PENDING,
        'filters' => [],
        'options' => [
            'sections' => ['tally'],
            'orientation' => 'landscape',
            'group_by' => 'tier',
        ],
    ]);

    app()->call([new GenerateMedalsReportExportJob($export->id), 'handle']);

    $export->refresh();

    expect($export->status)->toBe(ReportExport::STATUS_COMPLETED)
        ->and($export->file_path)->toEndWith('.xlsx');

    Storage::disk('local')->assertExists($export->file_path);
});

it('records failed medals export errors', function (): void {
    $user = rcUser('reports.view');
    $export = ReportExport::factory()->create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->id,
        'report_type' => 'medals',
        'status' => ReportExport::STATUS_PROCESSING,
    ]);

    (new GenerateMedalsReportExportJob($export->id))->failed(new RuntimeException('Export renderer failed.'));

    $export->refresh();

    expect($export->status)->toBe(ReportExport::STATUS_FAILED)
        ->and($export->error_message)->toBe('Export renderer failed.');
});

it('puts medal tally and medal details in one excel workbook when both are selected', function (): void {
    Storage::fake('local');

    $user = rcUser('reports.view');
    $export = ReportExport::factory()->create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->id,
        'report_type' => 'medals',
        'format' => 'xlsx',
        'status' => ReportExport::STATUS_PENDING,
        'filters' => [],
        'options' => [
            'sections' => ['tally', 'detail'],
            'orientation' => 'landscape',
            'group_by' => 'tier',
        ],
    ]);

    app()->call([new GenerateMedalsReportExportJob($export->id), 'handle']);

    $export->refresh();
    $spreadsheet = IOFactory::load(Storage::disk('local')->path($export->file_path));

    expect($export->status)->toBe(ReportExport::STATUS_COMPLETED)
        ->and($spreadsheet->getSheetCount())->toBe(2)
        ->and($spreadsheet->getSheetNames())->toBe(['Medal Tally', 'Medal Details']);
});
