<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Members\QueueMemberImport;
use App\Exports\MemberImportTemplateExport;
use App\Exports\ReportExport;
use App\Http\Requests\Members\StoreMemberImportRequest;
use App\Models\Import;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
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

    public function store(StoreMemberImportRequest $request, QueueMemberImport $queueMemberImport): RedirectResponse
    {
        /** @var UploadedFile $file */
        $file = $request->file('file');

        $queueMemberImport($request->user(), $file);

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Import queued. The members table will update automatically when it finishes.'),
        ]);

        return to_route('members.index');
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
