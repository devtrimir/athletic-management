<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\MemberImportTemplateExport;
use App\Exports\ReportExport;
use App\Http\Requests\Members\StoreMemberImportRequest;
use App\Imports\MembersFirstSheetImport;
use App\Imports\MembersImport;
use App\Models\Import;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Maatwebsite\Excel\Exceptions\SheetNotFoundException;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberImportController extends Controller
{
    public function template(): BinaryFileResponse
    {
        Gate::authorize('create', Import::class);

        return Excel::download(
            new MemberImportTemplateExport((int) auth()->user()->organization_id),
            'athlete-import-template-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function store(StoreMemberImportRequest $request): RedirectResponse
    {
        $file = $request->file('file');
        $orgId = (int) $request->user()->organization_id;

        $import = new MembersImport($orgId, $file->getClientOriginalName());

        // Workbooks without a "Members" sheet (CSV uploads, renamed sheets)
        // make the reader throw — fall back to reading the first sheet.
        try {
            Excel::import($import, $file);
        } catch (SheetNotFoundException) {
            // Handled by the fallback below.
        }

        if (! $import->sheetProcessed()) {
            $import = new MembersFirstSheetImport($orgId, $file->getClientOriginalName());
            Excel::import($import, $file);
        }

        $record = Import::updateOrCreate(
            ['organization_id' => $orgId, 'sha256' => hash_file('sha256', $file->getRealPath())],
            [
                'uploaded_by' => $request->user()->id,
                'filename' => $file->getClientOriginalName(),
                'sheet_count' => 1,
                'status' => $import->templateError() !== null ? Import::STATUS_FAILED : Import::STATUS_COMPLETED,
                'error_log' => $import->rowErrors() === [] ? null : json_encode($import->rowErrors(), JSON_UNESCAPED_UNICODE),
                'uploaded_at' => now(),
            ],
        );

        if ($import->templateError() !== null) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $import->templateError()]);

            return to_route('members.index');
        }

        Inertia::flash('toast', [
            'type' => $import->failedCount() > 0 ? 'warning' : 'success',
            'message' => __('Import finished: :created created, :updated updated, :skipped skipped, :failed failed.', [
                'created' => $import->createdCount(),
                'updated' => $import->updatedCount(),
                'skipped' => $import->skippedCount(),
                'failed' => $import->failedCount(),
            ]),
        ]);

        return to_route('members.index')->with('import_result', [
            'created' => $import->createdCount(),
            'updated' => $import->updatedCount(),
            'skipped' => $import->skippedCount(),
            'failed' => $import->failedCount(),
            'import_id' => $import->rowErrors() === [] ? null : $record->id,
        ]);
    }

    public function errors(Import $import): BinaryFileResponse
    {
        Gate::authorize('create', Import::class);

        $rows = collect($import->rowErrors())->map(static fn (array $entry): array => [
            'row' => $entry['row'],
            'name' => $entry['name'],
            'errors' => implode('; ', $entry['errors']),
        ]);

        return Excel::download(
            new ReportExport($rows, [__('Row'), __('Name'), __('Errors')], 'Import Errors'),
            "athlete-import-errors-{$import->id}.xlsx",
        );
    }
}
