<?php

declare(strict_types=1);

use App\Jobs\ProcessMemberImportJob;
use App\Models\Import;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

test('upload stores the file, registers a processing import, and dispatches the job', function () {
    Bus::fake();

    $user = rcUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => memberImportUpload([memberImportRow(['pno' => '210712827'])]),
    ])->assertRedirect(route('members.index'));

    $record = Import::withoutGlobalScopes()->sole();
    expect($record->status)->toBe(Import::STATUS_PROCESSING)
        ->and($record->uploaded_by)->toBe($user->id)
        ->and($record->filename)->toBe('members.xlsx');

    Bus::assertDispatched(
        ProcessMemberImportJob::class,
        fn (ProcessMemberImportJob $job): bool => $job->import->is($record)
            && str_starts_with($job->filePath, 'imports/'.$user->organization_id)
            && Storage::exists($job->filePath),
    );

    Storage::deleteDirectory('imports/'.$user->organization_id);
});

test('upload without the imports.run permission does not dispatch the job', function () {
    Bus::fake();

    $user = rcUser();

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => memberImportUpload([memberImportRow()]),
    ])->assertForbidden();

    Bus::assertNotDispatched(ProcessMemberImportJob::class);
});

test('upload flashes a queued notice with the import id', function () {
    $user = rcUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => memberImportUpload([memberImportRow()]),
    ])->assertRedirect(route('members.index'));

    $record = Import::withoutGlobalScopes()->sole();

    expect(session('inertia.flash_data.toast'))->toBe([
        'type' => 'info',
        'message' => 'Import queued. The members table will update automatically when it finishes.',
    ])->and(session('inertia.flash_data.import_id'))->toBe($record->id);
});
