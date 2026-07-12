<?php

declare(strict_types=1);

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MedalsReportWorkbookExport implements WithMultipleSheets
{
    /** @param array<int, MedalsReportExport> $sheets */
    public function __construct(private readonly array $sheets) {}

    /** @return array<int, MedalsReportExport> */
    public function sheets(): array
    {
        return $this->sheets;
    }
}
