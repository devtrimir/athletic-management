<?php

declare(strict_types=1);

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MedalsReportExport implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithStyles, WithTitle
{
    /**
     * @param  array<int, array<int, mixed>>  $rows
     * @param  array<int, string>  $headings
     * @param  array<int, string>  $mergeRanges
     */
    public function __construct(
        private readonly array $rows,
        private readonly array $headings,
        private readonly string $title,
        private readonly array $mergeRanges = [],
    ) {}

    /** @return array<int, array<int, mixed>> */
    public function array(): array
    {
        return $this->rows;
    }

    /** @return array<int, string> */
    public function headings(): array
    {
        return $this->headings;
    }

    public function title(): string
    {
        return mb_substr($this->title, 0, 31);
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $sheet = $event->sheet->getDelegate();

                foreach ($this->mergeRanges as $range) {
                    $sheet->mergeCells($range);
                }

                $sheet->getStyle($sheet->calculateWorksheetDimension())->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER)
                    ->setWrapText(true);
            },
        ];
    }

    /** @return array<int|string, mixed> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }
}
