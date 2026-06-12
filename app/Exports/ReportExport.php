<?php

declare(strict_types=1);

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportExport implements FromCollection, WithHeadings, WithStyles, WithTitle
{
    public function __construct(
        private readonly Collection $rows,
        private readonly array $headings,
        private readonly string $title,
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

    /** @return array<int, string> */
    public function headings(): array
    {
        return $this->headings;
    }

    public function title(): string
    {
        return $this->title;
    }

    /** @return array<int|string, mixed> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
