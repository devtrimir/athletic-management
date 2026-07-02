<?php

declare(strict_types=1);

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportExport implements FromCollection, ShouldAutoSize, WithColumnWidths, WithEvents, WithHeadings, WithStyles, WithTitle
{
    /**
     * @param  array<int, string>  $headings
     * @param  array<int, array<int, string>>  $headerRows
     * @param  array<int, string>  $mergeRanges
     * @param  array<string, int|float>  $columnWidths
     */
    public function __construct(
        private readonly Collection $rows,
        private readonly array $headings,
        private readonly string $title,
        private readonly array $headerRows = [],
        private readonly array $mergeRanges = [],
        private readonly array $columnWidths = [],
    ) {}

    public function collection(): Collection
    {
        return $this->rows->map(function (mixed $row): array {
            return array_values(array_map([$this, 'flattenCell'], (array) $row));
        });
    }

    private function flattenCell(mixed $value): string|null|int|float|bool
    {
        if (is_null($value) || is_scalar($value)) {
            return $value;
        }

        if ($value instanceof \Stringable) {
            return (string) $value;
        }

        if (is_array($value)) {
            $parts = array_filter(array_map(function (mixed $item): string {
                if (is_scalar($item) || $item === null) {
                    return trim((string) $item);
                }

                if ($item instanceof \Stringable) {
                    return trim((string) $item);
                }

                if (is_array($item)) {
                    return trim(implode(' · ', array_filter(array_map(
                        static fn (mixed $nested): string => is_scalar($nested) || $nested === null ? trim((string) $nested) : '',
                        array_values($item),
                    ))));
                }

                return trim((string) $item);
            }, array_values($value)));

            return implode(' | ', $parts);
        }

        return trim(json_encode($value, JSON_UNESCAPED_UNICODE) ?: '');
    }

    /** @return array<int, array<int, string>>|array<int, string> */
    public function headings(): array
    {
        if ($this->headerRows !== []) {
            return [...$this->headerRows, $this->headings];
        }

        return $this->headings;
    }

    public function title(): string
    {
        return $this->title;
    }

    /**
     * @return array<int, string>
     */
    public function mergeRanges(): array
    {
        return $this->mergeRanges;
    }

    /**
     * @return array<string, int|float>
     */
    public function columnWidths(): array
    {
        return $this->columnWidths;
    }

    /**
     * @return array<class-string, callable>
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $worksheet = $event->sheet->getDelegate();

                foreach ($this->mergeRanges as $range) {
                    $worksheet->mergeCells($range);
                    $worksheet
                        ->getStyle($range)
                        ->getAlignment()
                        ->setVertical(Alignment::VERTICAL_CENTER);
                }
            },
        ];
    }

    /** @return array<int|string, mixed> */
    public function styles(Worksheet $sheet): array
    {
        $styles = [];

        if ($this->headerRows !== []) {
            $styles[1] = [
                'font' => ['bold' => true, 'size' => 14],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ];
            $styles[count($this->headerRows) + 1] = ['font' => ['bold' => true]];

            return $styles;
        }

        return [1 => ['font' => ['bold' => true]]];
    }
}
