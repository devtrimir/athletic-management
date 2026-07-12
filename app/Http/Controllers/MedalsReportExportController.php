<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Concerns\HasReportFilters;
use App\Jobs\GenerateMedalsReportExportJob;
use App\Models\ReportExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedalsReportExportController extends Controller
{
    use HasReportFilters;

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $validated = $request->validate($this->reportFilterRules() + [
            'format' => ['required', 'string', Rule::in(['pdf', 'xlsx'])],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*' => ['string', Rule::in(['tally', 'detail'])],
            'orientation' => ['nullable', 'string', Rule::in(['portrait', 'landscape'])],
            'group_by' => ['nullable', 'string', Rule::in(['tier', 'team'])],
        ]);

        $export = ReportExport::query()->create([
            'organization_id' => (int) $request->user()->organization_id,
            'user_id' => (int) $request->user()->id,
            'report_type' => 'medals',
            'format' => $validated['format'],
            'status' => ReportExport::STATUS_PENDING,
            'filters' => $this->resolvedFilters($request),
            'options' => [
                'sections' => array_values(array_unique($validated['sections'])),
                'orientation' => $validated['orientation'] ?? 'landscape',
                'group_by' => $validated['group_by'] ?? 'tier',
            ],
        ]);

        GenerateMedalsReportExportJob::dispatch($export->id);

        return response()->json($this->payload($export), 202);
    }

    public function show(Request $request, ReportExport $export): JsonResponse
    {
        $this->authorizeExport($request, $export);

        return response()->json($this->payload($export->refresh()));
    }

    public function download(Request $request, ReportExport $export): StreamedResponse
    {
        $this->authorizeExport($request, $export);
        abort_unless($export->status === ReportExport::STATUS_COMPLETED, 404);
        abort_unless($export->file_path !== null && Storage::disk('local')->exists($export->file_path), 404);

        return Storage::disk('local')->download($export->file_path, $export->file_name ?? basename($export->file_path));
    }

    private function authorizeExport(Request $request, ReportExport $export): void
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_unless((int) $export->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless((int) $export->user_id === (int) $request->user()->id, 404);
        abort_unless($export->report_type === 'medals', 404);
    }

    /** @return array<string, mixed> */
    private function payload(ReportExport $export): array
    {
        return [
            'id' => $export->id,
            'status' => $export->status,
            'format' => $export->format,
            'file_name' => $export->file_name,
            'error_message' => $export->error_message,
            'download_url' => $export->status === ReportExport::STATUS_COMPLETED
                ? route('reports.medals.exports.download', $export)
                : null,
        ];
    }
}
