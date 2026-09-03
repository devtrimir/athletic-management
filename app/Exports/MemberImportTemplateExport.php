<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\District;
use App\Models\Sport;
use App\Models\Unit;
use App\Support\Members\MemberImportSchema;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\NamedRange;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MemberImportTemplateExport implements WithMultipleSheets
{
    public function __construct(
        private readonly int $organizationId,
    ) {}

    /** @return array<int, mixed> */
    public function sheets(): array
    {
        $references = $this->referenceLists();

        return [
            new MemberImportTemplateDataSheet($references),
            new MemberImportTemplateReferenceSheet($references),
        ];
    }

    /**
     * @return array{districts: list<string>, units: list<string>, sports: list<string>}
     */
    private function referenceLists(): array
    {
        return [
            'districts' => District::orderBy('name')->pluck('name')->all(),
            'units' => Unit::withoutGlobalScopes()
                ->where('organization_id', $this->organizationId)
                ->orderBy('name')
                ->pluck('name')
                ->all(),
            'sports' => Sport::withoutGlobalScopes()
                ->where('organization_id', $this->organizationId)
                ->orderBy('name')
                ->pluck('name')
                ->all(),
        ];
    }
}

class MemberImportTemplateDataSheet implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithStyles, WithTitle
{
    /** Number of data rows pre-fitted with dropdown validation and date formats. */
    private const VALIDATION_ROWS = 500;

    /**
     * @param  array{districts: list<string>, units: list<string>, sports: list<string>}  $references
     */
    public function __construct(
        private readonly array $references,
    ) {}

    public function title(): string
    {
        return 'Members';
    }

    /** @return array<int, string> */
    public function headings(): array
    {
        return MemberImportSchema::headings();
    }

    /** @return array<int, array<int, string|float|null>> */
    public function array(): array
    {
        return [
            array_map(
                static function (array $column): string|float|null {
                    if ($column['date'] && $column['example'] !== null) {
                        $date = \DateTime::createFromFormat('d.m.Y', $column['example']);

                        return $date instanceof \DateTime ? ExcelDate::dateTimeToExcel($date) : $column['example'];
                    }

                    return $column['example'];
                },
                MemberImportSchema::columns(),
            ),
        ];
    }

    /** @return array<int|string, mixed> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $worksheet = $event->sheet->getDelegate();
                $lastRow = self::VALIDATION_ROWS + 1;

                foreach (MemberImportSchema::columns() as $index => $column) {
                    $letter = Coordinate::stringFromColumnIndex($index + 1);

                    if ($column['date']) {
                        $worksheet
                            ->getStyle("{$letter}2:{$letter}{$lastRow}")
                            ->getNumberFormat()
                            ->setFormatCode('DD.MM.YYYY');
                    }

                    $formula = match (true) {
                        $column['list'] !== null => '"'.implode(',', $column['list']).'"',
                        $column['ref'] !== null && count($this->references[$column['ref']]) > 0 => MemberImportSchema::refRangeName($column['ref']),
                        default => null,
                    };

                    if ($formula === null) {
                        continue;
                    }

                    for ($row = 2; $row <= $lastRow; $row++) {
                        $validation = $worksheet->getCell("{$letter}{$row}")->getDataValidation();
                        $validation->setType(DataValidation::TYPE_LIST);
                        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                        $validation->setAllowBlank(true);
                        $validation->setShowInputMessage(true);
                        // In the OOXML spec this attribute is inverted: "1" HIDES the
                        // in-cell dropdown arrow, so it must be set to true to show it.
                        $validation->setShowDropdown(true);
                        $validation->setFormula1($formula);
                    }
                }
            },
        ];
    }
}

class MemberImportTemplateReferenceSheet implements FromArray, ShouldAutoSize, WithEvents, WithStyles, WithTitle
{
    /** List columns on this sheet (data starts at row 3, below instructions + headings). */
    private const LIST_COLUMNS = ['districts' => 'A', 'units' => 'B', 'sports' => 'C'];

    private const LIST_START_ROW = 3;

    /**
     * @param  array{districts: list<string>, units: list<string>, sports: list<string>}  $references
     */
    public function __construct(
        private readonly array $references,
    ) {}

    public function title(): string
    {
        return 'Reference';
    }

    /** @return array<int, array<int, string|null>> */
    public function array(): array
    {
        $districts = $this->references['districts'];
        $units = $this->references['units'];
        $sports = $this->references['sports'];

        $rows = [
            [
                'Instructions / निर्देश — fill the Members sheet only; do not rename, reorder, or delete its columns. Required columns are marked *. Row 2 is an example — replace or delete it before uploading (it is skipped automatically if left unchanged). Date columns accept real Excel dates (shown as DD.MM.YYYY). District, unit, and sport cells have dropdowns filled from the lists below — pick from the dropdown or copy the exact spelling.',
                null,
                null,
            ],
            ['Home/Posting District / जनपद', 'Unit / इकाई', 'Sport / खेल'],
        ];

        $max = max(count($districts), count($units), count($sports));

        for ($i = 0; $i < $max; $i++) {
            $rows[] = [
                $districts[$i] ?? null,
                $units[$i] ?? null,
                $sports[$i] ?? null,
            ];
        }

        return $rows;
    }

    /** @return array<int|string, mixed> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['italic' => true],
                'alignment' => ['wrapText' => true, 'vertical' => Alignment::VERTICAL_TOP],
            ],
            2 => ['font' => ['bold' => true]],
        ];
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $worksheet = $event->sheet->getDelegate();

                // Named ranges over these lists — Excel inline dropdown lists
                // are capped at 255 chars, so DB-backed dropdowns on the
                // Members sheet reference these named ranges instead.
                foreach (self::LIST_COLUMNS as $ref => $column) {
                    $count = count($this->references[$ref]);

                    if ($count === 0) {
                        continue;
                    }

                    $endRow = self::LIST_START_ROW + $count - 1;
                    $worksheet->getParent()->addNamedRange(new NamedRange(
                        MemberImportSchema::refRangeName($ref),
                        $worksheet,
                        '=$'.$column.'$'.self::LIST_START_ROW.':$'.$column.'$'.$endRow,
                    ));
                }
            },
        ];
    }
}
