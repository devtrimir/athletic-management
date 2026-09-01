<?php

declare(strict_types=1);

use App\Exports\MemberImportTemplateExport;
use App\Models\District;
use App\Models\Import;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\Unit;
use App\Models\User;
use App\Support\Members\MemberImportSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function importUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

/**
 * A data row keyed by column key, returned in schema column order.
 *
 * @param  array<string, string|null>  $overrides
 * @return list<string|null>
 */
function importRow(array $overrides = []): array
{
    $row = array_merge([
        'pno' => null,
        'full_name' => 'टेस्ट खिलाड़ी',
        'father_name' => null,
        'gender' => 'M',
        'dob' => '10.05.1999',
        'rank' => null,
        'mobile' => null,
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
        'home_district' => null,
        'posting_district' => null,
        'unit' => null,
        'joining_date' => null,
        'blood_group' => null,
        'caste' => null,
        'designation' => null,
        'appointment' => null,
        'recruitment_type' => null,
        'sport' => null,
        'sport_event' => null,
        'team_since' => null,
        'other_notes' => null,
    ], $overrides);

    return array_map(
        static fn (array $column): ?string => $row[$column['key']],
        MemberImportSchema::columns(),
    );
}

/**
 * Build a real .xlsx upload from the given data rows.
 *
 * @param  list<list<string|null>>  $rows
 * @param  list<string>|null  $header
 */
function importFile(array $rows, ?array $header = null, string $filename = 'members.xlsx'): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Members');
    $sheet->fromArray($header ?? MemberImportSchema::headings(), null, 'A1');

    $rowNumber = 2;
    foreach ($rows as $row) {
        $sheet->fromArray($row, null, "A{$rowNumber}");
        $rowNumber++;
    }

    $path = tempnam(sys_get_temp_dir(), 'member-import-').'.xlsx';
    (new Xlsx($spreadsheet))->save($path);

    return new UploadedFile($path, $filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------

test('template download requires the imports.run permission', function () {
    $user = importUser();

    $this->actingAs($user)
        ->get(route('members.import.template'))
        ->assertForbidden();
});

test('template download returns an xlsx with the schema headings', function () {
    $user = importUser('imports.run');

    $response = $this->actingAs($user)->get(route('members.import.template'));

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('athlete-import-template-'.now()->format('Y-m-d').'.xlsx');
});

test('template has db-backed dropdowns and date-formatted columns', function () {
    $user = importUser('imports.run');
    $district = District::factory()->create();
    Unit::factory()->create(['organization_id' => $user->organization_id]);
    Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)->get(route('members.import.template'));

    $binary = Excel::raw(new MemberImportTemplateExport($user->organization_id), Maatwebsite\Excel\Excel::XLSX);
    $path = tempnam(sys_get_temp_dir(), 'member-template-').'.xlsx';
    file_put_contents($path, $binary);

    $spreadsheet = IOFactory::load($path);
    $sheet = $spreadsheet->getSheetByName('Members');
    $reference = $spreadsheet->getSheetByName('Reference');

    // Enum dropdown (inline list).
    expect($sheet->getCell('D2')->getDataValidation()->getFormula1())->toBe('"M,F,O"');

    // Category dropdown shows friendly labels, not raw codes.
    expect($sheet->getCell('H2')->getDataValidation()->getFormula1())->toBe('"Ground Duty,Sports Quota"');

    // DB-backed dropdowns via named ranges.
    expect($sheet->getCell('J2')->getDataValidation()->getFormula1())->toBe('DistrictList')
        ->and($sheet->getCell('L2')->getDataValidation()->getFormula1())->toBe('UnitList')
        ->and($sheet->getCell('S2')->getDataValidation()->getFormula1())->toBe('SportList');

    $districtRange = $spreadsheet->getNamedRange('DistrictList');
    expect($districtRange)->not->toBeNull()
        ->and($districtRange->getWorksheet()->getTitle())->toBe('Reference');

    // Reference sheet lists the seeded district.
    expect($reference->getCell('A3')->getValue())->toBe($district->name);

    // Date columns carry a real Excel date format.
    expect($sheet->getStyle('E2')->getNumberFormat()->getFormatCode())->toBe('DD.MM.YYYY')
        ->and($sheet->getStyle('M2')->getNumberFormat()->getFormatCode())->toBe('DD.MM.YYYY')
        ->and($sheet->getStyle('U2')->getNumberFormat()->getFormatCode())->toBe('DD.MM.YYYY');
});

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

test('upload requires authentication, permission, and a spreadsheet file', function () {
    $this->post(route('members.import.store'))->assertRedirect(route('login'));

    $noPermission = importUser();
    $this->actingAs($noPermission)
        ->post(route('members.import.store'), ['file' => importFile([importRow()])])
        ->assertForbidden();

    $user = importUser('imports.run');
    $this->actingAs($user)
        ->post(route('members.import.store'), [
            'file' => UploadedFile::fake()->create('members.txt', 1, 'text/plain'),
        ])
        ->assertSessionHasErrors('file');
});

// ---------------------------------------------------------------------------
// Import behavior
// ---------------------------------------------------------------------------

test('valid rows are imported with generated codes and playable sport pivot', function () {
    $user = importUser('imports.run');
    $district = District::factory()->create();
    $unit = Unit::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $rows = [
        importRow([
            'pno' => '210712827',
            'full_name' => 'मोहित राठोर',
            'father_name' => 'रमेश राठोर',
            'mobile' => '6397707210',
            'player_level' => 'NATIONAL',
            'home_district' => $district->name,
            'unit' => $unit->name,
            'sport' => $sport->name,
            'sport_event' => '48 kg Sanda',
            'blood_group' => 'B+',
            'recruitment_type' => 'SPORTS_QUOTA',
        ]),
        importRow([
            'full_name' => 'Second Player',
            'gender' => 'F',
            'player_category' => 'SPORTS_QUOTA',
        ]),
    ];

    $response = $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile($rows),
    ]);

    $response->assertRedirect(route('members.index'));

    $members = Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->get();
    expect($members)->toHaveCount(2);

    $first = $members->firstWhere('pno', '210712827');
    expect($first)->not->toBeNull()
        ->and($first->member_code)->toMatch('/^UPP-\d{4}-\d{6}$/')
        ->and($first->full_name)->toBe('मोहित राठोर')
        ->and($first->player_level)->toBe('NATIONAL')
        ->and($first->home_district_id)->toBe($district->id)
        ->and($first->current_unit_id)->toBe($unit->id)
        ->and($first->current_status)->toBe('ACTIVE')
        ->and($first->source_refs['source'])->toBe('excel_import');

    expect($first->playableSports)->toHaveCount(1)
        ->and($first->playableSports->first()->id)->toBe($sport->id)
        ->and($first->playableSports->first()->pivot->sport_event)->toBe('48 kg Sanda');

    $second = $members->firstWhere('full_name', 'Second Player');
    expect($second->pno)->toBeNull()
        ->and($second->gender)->toBe('F');

    $record = Import::withoutGlobalScopes()->first();
    expect($record->status)->toBe(Import::STATUS_COMPLETED)
        ->and($record->error_log)->toBeNull();
});

test('real Excel dates in date-formatted cells are converted on import', function () {
    $user = importUser('imports.run');

    $row = importRow(['full_name' => 'Date Player', 'pno' => '210712827']);
    $row[MemberImportSchema::indexOf('dob')] = Date::dateTimeToExcel(new DateTime('1999-05-10'));
    $row[MemberImportSchema::indexOf('joining_date')] = Date::dateTimeToExcel(new DateTime('2021-12-15'));

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([$row]),
    ]);

    $member = Member::withoutGlobalScopes()->firstOrFail();
    expect($member->dob->toDateString())->toBe('1999-05-10')
        ->and($member->joining_date->toDateString())->toBe('2021-12-15');
});

test('the template example row is never imported as a member', function () {
    $user = importUser('imports.run');

    $exampleRow = array_map(
        static fn (array $column): ?string => $column['example'],
        MemberImportSchema::columns(),
    );

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([$exampleRow, importRow(['full_name' => 'Real Player'])]),
    ]);

    $members = Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->get();
    expect($members)->toHaveCount(1)
        ->and($members->first()->full_name)->toBe('Real Player');
});

test('category dropdown labels resolve to codes on import', function () {
    $user = importUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([
            importRow(['full_name' => 'Label Player GD', 'player_category' => 'Ground Duty']),
            importRow(['full_name' => 'Label Player SQ', 'player_category' => 'Sports Quota', 'pno' => '210712827']),
            importRow(['full_name' => 'Code Player', 'player_category' => 'GD', 'pno' => '210712828']),
        ]),
    ]);

    $members = Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->get();
    expect($members)->toHaveCount(3)
        ->and($members->firstWhere('full_name', 'Label Player GD')->player_category)->toBe('GD')
        ->and($members->firstWhere('full_name', 'Label Player SQ')->player_category)->toBe('SPORTS_QUOTA')
        ->and($members->firstWhere('full_name', 'Code Player')->player_category)->toBe('GD');
});

test('re-uploading the same PNO updates the member instead of duplicating', function () {
    $user = importUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([importRow(['pno' => '210712827', 'full_name' => 'मोहित राठोर'])]),
    ]);

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([importRow(['pno' => '210712827', 'full_name' => 'मोहित राठोर', 'father_name' => 'रमेश राठोर', 'mobile' => '6397707210'])]),
    ]);

    $members = Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->get();
    expect($members)->toHaveCount(1)
        ->and($members->first()->father_name)->toBe('रमेश राठोर')
        ->and($members->first()->mobile)->toBe('6397707210');
});

test('a PNO belonging to a coach is rejected', function () {
    $user = importUser('imports.run');

    DB::table('coaches')->insert([
        'organization_id' => $user->organization_id,
        'pno' => '210712827',
        'full_name' => 'Coach One',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([importRow(['pno' => '210712827'])]),
    ]);

    expect(Member::withoutGlobalScopes()->count())->toBe(0);

    $record = Import::withoutGlobalScopes()->first();
    expect($record->rowErrors())->toHaveCount(1)
        ->and($record->rowErrors()[0]['errors'][0])->toContain('210712827');
});

test('invalid rows fail while valid rows in the same file are imported', function () {
    $user = importUser('imports.run');

    $rows = [
        importRow(['full_name' => null]),                                    // missing name
        importRow(['full_name' => 'Bad Gender', 'gender' => 'X']),           // bad enum
        importRow(['full_name' => 'Bad District', 'home_district' => 'अटलांटिस']), // unresolvable
        importRow(['full_name' => 'Bad Mobile', 'mobile' => '12345']),       // short mobile
        importRow(['full_name' => 'Good Player', 'pno' => '210712827']),
    ];

    $response = $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile($rows),
    ]);

    $response->assertRedirect(route('members.index'));

    $members = Member::withoutGlobalScopes()->where('organization_id', $user->organization_id)->get();
    expect($members)->toHaveCount(1)
        ->and($members->first()->full_name)->toBe('Good Player');

    $record = Import::withoutGlobalScopes()->first();
    expect($record->status)->toBe(Import::STATUS_COMPLETED)
        ->and($record->rowErrors())->toHaveCount(4);

    // Error report is downloadable and mentions the failing rows.
    $report = $this->actingAs($user)->get(route('imports.errors', $record));
    $report->assertOk();
    expect($report->headers->get('content-disposition'))->toContain('athlete-import-errors-');
});

test('a file that does not match the template is rejected entirely', function () {
    $user = importUser('imports.run');

    $response = $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([['x', 'y']], header: ['Name', 'Whatever']),
    ]);

    $response->assertRedirect(route('members.index'));
    expect(Member::withoutGlobalScopes()->count())->toBe(0);

    $record = Import::withoutGlobalScopes()->first();
    expect($record->status)->toBe(Import::STATUS_FAILED);
});

test('header comparison tolerates extra trailing columns and nfd unicode', function () {
    $user = importUser('imports.run');

    // A stray note column beyond the template's last column must not matter.
    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile(
            [array_merge(importRow(['full_name' => 'Extra Column Player']), ['client note'])],
            header: array_merge(MemberImportSchema::headings(), ['scribble']),
        ),
    ]);

    expect(Member::withoutGlobalScopes()->where('full_name', 'Extra Column Player')->exists())->toBeTrue();

    // Devanagari headers re-saved in NFD (decomposed) form must still match.
    $nfdHeader = array_map(
        static fn (string $heading): string => Normalizer::normalize($heading, Normalizer::FORM_D) ?: $heading,
        MemberImportSchema::headings(),
    );

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([importRow(['full_name' => 'NFD Player'])], header: $nfdHeader),
    ]);

    expect(Member::withoutGlobalScopes()->where('full_name', 'NFD Player')->exists())->toBeTrue();
});

test('a csv saved from excel with a utf-8 bom imports fine', function () {
    $user = importUser('imports.run');

    $row = importRow(['full_name' => 'CSV Player', 'pno' => '210712827']);
    $csv = "\xEF\xBB\xBF".implode(',', MemberImportSchema::headings())."\n".implode(',', array_map(
        static fn (?string $value): string => $value ?? '',
        $row,
    ))."\n";

    $path = tempnam(sys_get_temp_dir(), 'member-import-').'.csv';
    file_put_contents($path, $csv);

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => new UploadedFile($path, 'members.csv', 'text/csv', null, true),
    ]);

    $member = Member::withoutGlobalScopes()->where('full_name', 'CSV Player')->first();
    expect($member)->not->toBeNull()
        ->and($member->pno)->toBe('210712827');
});

test('sheets added ahead of the members sheet are ignored', function () {
    $user = importUser('imports.run');

    $spreadsheet = new Spreadsheet;
    $spreadsheet->getActiveSheet()->setTitle('Export Summary');
    $spreadsheet->getActiveSheet()->setCellValue('A1', 'junk summary');

    $membersSheet = $spreadsheet->createSheet();
    $membersSheet->setTitle('Members');
    $membersSheet->fromArray(MemberImportSchema::headings(), null, 'A1');
    $membersSheet->fromArray(importRow(['full_name' => 'Sheet Order Player']), null, 'A2');

    $path = tempnam(sys_get_temp_dir(), 'member-import-').'.xlsx';
    (new Xlsx($spreadsheet))->save($path);

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => new UploadedFile($path, 'members.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
    ]);

    expect(Member::withoutGlobalScopes()->where('full_name', 'Sheet Order Player')->exists())->toBeTrue();
});

test('error report is tenanted and requires permission', function () {
    $user = importUser('imports.run');
    $otherUser = importUser('imports.run');

    $this->actingAs($user)->post(route('members.import.store'), [
        'file' => importFile([importRow(['full_name' => null])]),
    ]);

    $record = Import::withoutGlobalScopes()->firstOrFail();

    $this->actingAs($otherUser)->get(route('imports.errors', $record))->assertNotFound();

    $noPermission = User::factory()->create(['organization_id' => $user->organization_id]);
    $this->actingAs($noPermission)->get(route('imports.errors', $record))->assertForbidden();
});
