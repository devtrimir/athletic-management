<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\Members\MemberImportSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Create an org + user with the given permission codes (for report/controller tests).
 */
function rcUser(string ...$permissions): User
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
 * Build a real member-import .xlsx upload from the given data rows (schema column order).
 *
 * @param  list<list<string|null>>  $rows
 * @param  list<string>|null  $header
 */
function memberImportUpload(array $rows, ?array $header = null): UploadedFile
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

    return new UploadedFile($path, 'members.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
}

/**
 * A member-import data row keyed by column key, returned in schema column order.
 *
 * @param  array<string, string|null>  $overrides
 * @return list<string|null>
 */
function memberImportRow(array $overrides = []): array
{
    // PNO is required; default to a unique one so multi-row fixtures import.
    static $pnoSequence = 210700000;

    $row = array_merge([
        'pno' => (string) ++$pnoSequence,
        'full_name' => 'टेस्ट खिलाड़ी',
        'gender' => 'M',
        'dob' => '10.05.1999',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
    ], $overrides);

    return array_map(
        static fn (array $column): ?string => $row[$column['key']] ?? null,
        MemberImportSchema::columns(),
    );
}
