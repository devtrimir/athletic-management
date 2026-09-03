<?php

declare(strict_types=1);

use App\Events\MemberImportFinished;
use App\Jobs\ProcessMemberImportJob;
use App\Models\Import;
use App\Models\Member;
use App\Models\Rank;
use App\Models\TournamentTier;
use Illuminate\Queue\Jobs\SyncJob;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    // Mirror production: the member import resolves player levels and ranks
    // against always-seeded master data.
    TournamentTier::upsert([
        ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
        ['code' => 'NATIONAL', 'label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
        ['code' => 'AIPSC', 'label_hi' => 'अखिल भारतीय पुलिस खेल', 'label_en' => 'AIPSC', 'weight' => 70],
        ['code' => 'STATE', 'label_hi' => 'राज्यस्तरीय', 'label_en' => 'State', 'weight' => 60],
        ['code' => 'ZONAL', 'label_hi' => 'क्षेत्रीय', 'label_en' => 'Zonal', 'weight' => 40],
        ['code' => 'OTHER', 'label_hi' => 'अन्य', 'label_en' => 'Other', 'weight' => 10],
    ], uniqueBy: ['code']);

    Rank::create([
        'code' => 'CONSTABLE',
        'name' => 'आरक्षी / सिपाही',
        'name_en' => 'Police Constable',
        'short_name' => 'Constable',
        'rank_order' => 10,
        'aliases' => ['Sipahi', 'Police Constable', 'आरक्षी', 'सिपाही'],
        'is_active' => true,
    ]);
});

test('the job imports members, completes the record, deletes the file, and broadcasts the result', function () {
    Event::fake([MemberImportFinished::class]);

    $user = rcUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => memberImportUpload([
            memberImportRow(['pno' => '210712827', 'full_name' => 'मोहित राठोर']),
        ]),
    ])->assertRedirect(route('members.index'));

    $record = Import::withoutGlobalScopes()->sole();

    expect($record->status)->toBe(Import::STATUS_COMPLETED)
        ->and($record->error_log)->toBeNull()
        ->and(Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->count())->toBe(1)
        ->and(Storage::allFiles('imports/'.$user->organization_id))->toBeEmpty();

    Event::assertDispatched(
        MemberImportFinished::class,
        function (MemberImportFinished $event) use ($record, $user): bool {
            $payload = $event->broadcastWith();

            return $event->import->is($record)
                && $event->broadcastOn()->name === 'private-organization.'.$user->organization_id
                && $payload['status'] === Import::STATUS_COMPLETED
                && $payload['counts']['created'] === 1
                && $payload['error_count'] === 0;
        },
    );
});

test('a template-mismatched file fails the record and broadcasts the failure', function () {
    Event::fake([MemberImportFinished::class]);

    $user = rcUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => memberImportUpload([['x', 'y']], header: ['Name', 'Whatever']),
    ])->assertRedirect(route('members.index'));

    $record = Import::withoutGlobalScopes()->sole();
    expect($record->status)->toBe(Import::STATUS_FAILED);

    Event::assertDispatched(
        MemberImportFinished::class,
        fn (MemberImportFinished $event): bool => $event->broadcastWith()['status'] === Import::STATUS_FAILED
            && $event->broadcastWith()['template_error'] !== null,
    );
});

test('a crashing job marks the import failed and notifies subscribers', function () {
    Event::fake([MemberImportFinished::class]);

    $user = rcUser('imports.run');

    $record = Import::withoutGlobalScopes()->create([
        'organization_id' => $user->organization_id,
        'uploaded_by' => $user->id,
        'filename' => 'broken.xlsx',
        'sha256' => hash('sha256', 'broken'),
        'sheet_count' => 1,
        'status' => Import::STATUS_PROCESSING,
        'uploaded_at' => now(),
    ]);

    try {
        (new ProcessMemberImportJob($record, 'imports/'.$user->organization_id.'/missing.xlsx'))->handle();
        $this->fail('Expected the job to re-throw the import exception.');
    } catch (Throwable) {
        // Expected: the failure is recorded and broadcast before re-throwing.
    }

    $record->refresh();

    expect($record->status)->toBe(Import::STATUS_FAILED)
        ->and($record->rowErrors())->not->toBeEmpty();

    Event::assertDispatched(
        MemberImportFinished::class,
        fn (MemberImportFinished $event): bool => $event->broadcastWith()['status'] === Import::STATUS_FAILED,
    );
});

test('a crashing job only notifies once across retries', function () {
    Event::fake([MemberImportFinished::class]);

    $user = rcUser('imports.run');

    $record = Import::withoutGlobalScopes()->create([
        'organization_id' => $user->organization_id,
        'uploaded_by' => $user->id,
        'filename' => 'broken.xlsx',
        'sha256' => hash('sha256', 'broken'),
        'sheet_count' => 1,
        'status' => Import::STATUS_PROCESSING,
        'uploaded_at' => now(),
    ]);

    $retry = new class(app(), json_encode(['attempts' => 2]), 'sync', 'sync') extends SyncJob
    {
        public function attempts()
        {
            return 2;
        }
    };

    $job = new ProcessMemberImportJob($record, 'imports/'.$user->organization_id.'/missing.xlsx');
    $job->setJob($retry);

    try {
        $job->handle();
        $this->fail('Expected the job to re-throw the import exception.');
    } catch (Throwable) {
        // Expected.
    }

    Event::assertNotDispatched(MemberImportFinished::class);
});
