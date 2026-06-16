<?php

declare(strict_types=1);

use App\Exports\ReportExport;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Sheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

uses(TestCase::class);

test('report export flattens nested playable sports data into a readable string', function (): void {
    $export = new ReportExport(
        new Collection([
            [
                'full_name' => 'राम कुमार',
                'playable_sports' => [
                    [
                        'name' => 'आर्चरी',
                        'role' => 'Batsman',
                        'position' => '3',
                        'notes' => 'Top order',
                    ],
                ],
            ],
        ]),
        ['Name', 'Playable Sports'],
        'Members',
    );

    expect($export->collection()->first())->toBe([
        'राम कुमार',
        'आर्चरी · Batsman · 3 · Top order',
    ]);
});

test('report export applies configured merged cell ranges', function (): void {
    $export = new ReportExport(
        new Collection([
            ['team' => 'A', 'member' => 'One'],
            ['team' => null, 'member' => 'Two'],
        ]),
        ['Team', 'Member'],
        'Teams',
        ['A2:A3'],
    );

    $spreadsheet = new Spreadsheet;
    $sheet = new Sheet($spreadsheet->getActiveSheet());
    $events = $export->registerEvents();

    $events[AfterSheet::class](new AfterSheet($sheet, $export));

    expect($spreadsheet->getActiveSheet()->getMergeCells())->toHaveKey('A2:A3');
});
