<?php

declare(strict_types=1);

use App\Exports\ReportExport;
use Illuminate\Support\Collection;

test('report export flattens nested playable sports data into a readable string', function (): void {
    $export = new ReportExport(
        new Collection([
            [
                'full_name_hi' => 'राम कुमार',
                'playable_sports' => [
                    [
                        'name_hi' => 'आर्चरी',
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
