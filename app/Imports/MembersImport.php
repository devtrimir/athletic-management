<?php

declare(strict_types=1);

namespace App\Imports;

use App\Models\District;
use App\Models\Member;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\MemberCodeGenerator;
use App\Support\Members\MemberImportSchema;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Imports members from the official template workbook (see
 * MemberImportTemplateExport). Column order is the contract — the first row
 * must match MemberImportSchema::headings() exactly.
 *
 * Reads the "Members" sheet by name (clients' spreadsheet apps sometimes add
 * sheets ahead of it); the controller falls back to the first sheet for CSV
 * uploads and renamed sheets.
 *
 * Valid rows are upserted (PNO match → update, otherwise create); invalid
 * rows are collected with row numbers and human-readable reasons.
 */
class MembersImport implements ToCollection, WithMultipleSheets
{
    /** Maximum number of row errors retained for the error report. */
    private const MAX_STORED_ERRORS = 200;

    private int $created = 0;

    private int $updated = 0;

    private int $skipped = 0;

    private int $failed = 0;

    private bool $sheetProcessed = false;

    /** @var list<array{row: int, name: string, errors: list<string>}> */
    private array $errors = [];

    private ?string $templateError = null;

    /** @var array<string, string>|null */
    private ?array $tierMap = null;

    /** @var array<string, string>|null */
    private ?array $rankMap = null;

    public function __construct(
        private readonly int $organizationId,
        private readonly string $filename,
    ) {}

    /** @return array<string|int, $this> */
    public function sheets(): array
    {
        return ['Members' => $this];
    }

    public function collection(Collection $rows): void
    {
        $this->sheetProcessed = true;

        if ($rows->isEmpty()) {
            $this->templateError = __('The uploaded file is empty.');

            return;
        }

        $header = collect($rows->first())
            ->map(static fn (mixed $cell): string => self::normalizeHeaderCell($cell))
            ->all();

        $expected = MemberImportSchema::headings();

        // Compare only the contract columns: pad short rows, ignore stray
        // values in columns beyond the template's last one.
        $header = array_pad(array_slice($header, 0, count($expected)), count($expected), '');

        if ($header !== $expected) {
            $differsAt = [];
            foreach ($expected as $i => $label) {
                if ($header[$i] !== $label) {
                    $differsAt[] = ($i + 1).': got ['.$header[$i].'] expected ['.$label.']';
                }
            }

            Log::warning('Member import template mismatch', [
                'filename' => $this->filename,
                'header_cells' => count(collect($rows->first())->all()),
                'differences' => $differsAt === [] ? ['column count only'] : array_slice($differsAt, 0, 5),
            ]);

            $this->templateError = __('The uploaded file does not match the member import template. Download a fresh template and do not rename, reorder, or delete columns.');

            return;
        }

        $districtMap = $this->nameMap(District::query()->pluck('id', 'name')->all());
        $unitMap = $this->nameMap(
            Unit::withoutGlobalScopes()->where('organization_id', $this->organizationId)->pluck('id', 'name')->all(),
        );
        $sportMap = $this->nameMap(
            Sport::withoutGlobalScopes()->where('organization_id', $this->organizationId)->pluck('id', 'name')->all(),
        );

        $memberPnoMap = Member::withoutGlobalScopes()
            ->where('organization_id', $this->organizationId)
            ->whereNotNull('pno')
            ->pluck('id', 'pno')
            ->all();

        $blockedPnos = collect(['coaches', 'incharges'])
            ->flatMap(
                fn (string $table) => DB::table($table)
                    ->where('organization_id', $this->organizationId)
                    ->whereNotNull('pno')
                    ->pluck('pno'),
            )
            ->flip()
            ->all();

        // ── Validate rows ────────────────────────────────────────────────
        /** @var list<array{row: int, payload: array<string, mixed>, sport_id: int|null, sport_event: string|null}> $valid */
        $valid = [];

        foreach ($rows->slice(1)->values() as $index => $row) {
            $rowNumber = $index + 2; // Excel row number (1-based + header)
            $cells = collect($row)->values();

            if ($cells->every(fn (mixed $cell): bool => trim((string) $cell) === '')) {
                continue;
            }

            // The template ships with one example row at row 2 — never import
            // it. Only that position is skipped: a data row further down that
            // happens to share the example values is real user data.
            if ($rowNumber === 2 && $this->isExampleRow($cells)) {
                continue;
            }

            [$payload, $rowErrors] = $this->validateRow($cells, $districtMap, $unitMap, $sportMap, $blockedPnos);

            if ($rowErrors !== []) {
                $this->failed++;
                $this->recordError($rowNumber, (string) ($payload['full_name'] ?? ''), $rowErrors);

                continue;
            }

            $valid[] = [
                'row' => $rowNumber,
                'payload' => $payload,
                'sport_id' => $payload['_sport_id'],
                'sport_event' => $payload['sport_event'],
            ];
        }

        if ($valid === []) {
            return;
        }

        // ── Dedupe within the file (last occurrence wins) ────────────────
        $byPno = [];
        $byName = [];

        foreach ($valid as $entry) {
            $pno = $entry['payload']['pno'];

            if ($pno !== null) {
                $byPno[$pno] = $entry;
            } else {
                $byName[$entry['payload']['full_name'].'|'.$entry['payload']['player_category']] = $entry;
            }
        }

        $deduped = array_values(array_merge(array_values($byPno), array_values($byName)));

        // ── Split creates vs updates and assign member codes ─────────────
        /** @var list<array{row: int, payload: array<string, mixed>, sport_id: int|null, sport_event: string|null, member_id: int|null}> $entries */
        $entries = [];

        foreach ($deduped as $entry) {
            $pno = $entry['payload']['pno'];

            if ($pno !== null && isset($memberPnoMap[$pno])) {
                $entry['member_id'] = $memberPnoMap[$pno];
            } elseif ($pno === null) {
                $entry['member_id'] = Member::withoutGlobalScopes()
                    ->where('organization_id', $this->organizationId)
                    ->where('full_name', $entry['payload']['full_name'])
                    ->where('player_category', $entry['payload']['player_category'])
                    ->value('id');
            } else {
                $entry['member_id'] = null;
            }

            $entries[] = $entry;
        }

        $newCount = count(array_filter($entries, static fn (array $entry): bool => $entry['member_id'] === null));
        $codes = $newCount > 0
            ? app(MemberCodeGenerator::class)->nextBatch($this->organizationId, $newCount)
            : [];
        $codeIndex = 0;

        // ── Apply ────────────────────────────────────────────────────────
        DB::transaction(function () use ($entries, $codes, &$codeIndex): void {
            foreach ($entries as $entry) {
                $payload = $entry['payload'];
                unset($payload['_sport_id']);

                $payload['source_refs'] = [
                    'source' => 'excel_import',
                    'filename' => $this->filename,
                    'row' => $entry['row'],
                ];

                if ($entry['member_id'] !== null && $payload['pno'] !== null) {
                    $member = Member::withoutGlobalScopes()->findOrFail($entry['member_id']);
                    $member->update(array_filter($payload, static fn (mixed $value): bool => $value !== null));
                    $this->updated++;
                } elseif ($entry['member_id'] !== null) {
                    // No-PNO row matching an existing (name, category) — leave untouched.
                    $member = Member::withoutGlobalScopes()->findOrFail($entry['member_id']);
                    $this->skipped++;
                } else {
                    $member = Member::withoutGlobalScopes()->create(array_merge($payload, [
                        'organization_id' => $this->organizationId,
                        'member_code' => $codes[$codeIndex++],
                    ]));
                    $this->created++;
                }

                if ($entry['sport_id'] !== null) {
                    $member->playableSports()->syncWithoutDetaching([
                        $entry['sport_id'] => ['sport_event' => $entry['sport_event']],
                    ]);
                }
            }
        });
    }

    /**
     * @param  Collection<int, mixed>  $cells
     * @param  array<string, int>  $districtMap
     * @param  array<string, int>  $unitMap
     * @param  array<string, int>  $sportMap
     * @param  array<string, true>  $blockedPnos
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private function validateRow(Collection $cells, array $districtMap, array $unitMap, array $sportMap, array $blockedPnos): array
    {
        $get = fn (string $key): mixed => $cells->get(MemberImportSchema::indexOf($key));
        $str = function (string $key) use ($get): ?string {
            $value = trim((string) $get($key));

            return $value === '' ? null : $value;
        };

        $errors = [];
        $payload = [
            'pno' => null,
            'full_name' => null,
            'father_name' => $str('father_name'),
            'gender' => null,
            'dob' => null,
            'rank' => $this->resolveRank($str('rank')),
            'mobile' => null,
            'player_category' => null,
            'player_level' => null,
            'home_district_id' => null,
            'posting_district_id' => null,
            'current_unit_id' => null,
            'joining_date' => null,
            'blood_group' => null,
            'caste' => $str('caste'),
            'initial_rank' => $this->resolveRank($str('initial_rank')),
            'sport_event' => $str('sport_event'),
            'team_since' => null,
            'home_address' => $str('home_address'),
            '_sport_id' => null,
        ];

        // Full name (required)
        $name = $str('full_name');

        if ($name === null) {
            $errors[] = __('Full name is required.');
        } elseif (mb_strlen($name) > 255) {
            $errors[] = __('Full name is too long (max 255 characters).');
        } else {
            $payload['full_name'] = $name;
        }

        // Gender (required)
        $gender = $this->normalizeEnum($get('gender'), [
            'M' => 'M', 'MALE' => 'M', 'पुरुष' => 'M',
            'F' => 'F', 'FEMALE' => 'F', 'महिला' => 'F',
            'O' => 'O', 'OTHER' => 'O', 'अन्य' => 'O',
        ]);

        if ($gender === null) {
            $errors[] = __('Gender is required and must be one of: M, F, O.');
        } else {
            $payload['gender'] = $gender;
        }

        // Player category (required) — accepts the dropdown labels
        // ("Ground Duty", "Sports Quota") as well as the raw codes.
        $categoryMap = [];

        foreach (MemberImportSchema::PLAYER_CATEGORY_LABELS as $code => $label) {
            $categoryMap[$code] = $code;
            $categoryMap[strtoupper(str_replace(' ', '_', $label))] = $code;
        }

        $category = $this->normalizeEnum($get('player_category'), $categoryMap);

        if ($category === null) {
            $errors[] = __('Category is required and must be one of: :values.', ['values' => implode(', ', MemberImportSchema::PLAYER_CATEGORY_LABELS)]);
        } else {
            $payload['player_category'] = $category;
        }

        // Player level (required) — backed by the tournament_tiers master;
        // accepts the dropdown labels as well as the raw codes.
        $levelMap = $this->tierMap();
        $level = $this->normalizeEnum($get('player_level'), $levelMap);

        if ($level === null) {
            $errors[] = __('Level is required and must be one of: :values.', ['values' => implode(', ', array_unique(array_values($levelMap)))]);
        } else {
            $payload['player_level'] = $level;
        }

        // PNO (optional, digits only, unique across people)
        $pno = preg_replace('/\s+/', '', (string) $get('pno'));

        if ($pno !== '') {
            if (! preg_match('/^\d{8,20}$/', $pno)) {
                $errors[] = __('PNO must be 8–20 digits.');
            } elseif (isset($blockedPnos[$pno])) {
                $errors[] = __('PNO :pno is already used by a coach or team prabhari.', ['pno' => $pno]);
            } else {
                $payload['pno'] = $pno;
            }
        }

        // Dates
        $dob = $this->parseDate($get('dob'));

        if ($dob === false) {
            $errors[] = __('Date of birth must be a valid date (DD.MM.YYYY).');
        } elseif ($dob !== null && $dob >= now()->toDateString()) {
            $errors[] = __('Date of birth must be in the past.');
        } else {
            $payload['dob'] = $dob;
        }

        foreach (['joining_date', 'team_since'] as $dateKey) {
            $parsed = $this->parseDate($get($dateKey));

            if ($parsed === false) {
                $errors[] = __(':column must be a valid date (DD.MM.YYYY).', ['column' => $dateKey === 'joining_date' ? 'Joining date' : 'Team since']);
            } else {
                $payload[$dateKey] = $parsed;
            }
        }

        // Mobile
        $mobile = preg_replace('/\D/', '', (string) $get('mobile'));

        if ($mobile !== '') {
            if (strlen($mobile) !== 10) {
                $errors[] = __('Mobile number must be exactly 10 digits.');
            } else {
                $payload['mobile'] = $mobile;
            }
        }

        // Optional enums
        $bloodGroup = $this->normalizeEnum($get('blood_group'), array_fill_keys(MemberImportSchema::BLOOD_GROUPS, null));

        if ($bloodGroup === null && $str('blood_group') !== null) {
            $errors[] = __('Blood group must be one of: :values.', ['values' => implode(', ', MemberImportSchema::BLOOD_GROUPS)]);
        } else {
            $payload['blood_group'] = $bloodGroup;
        }

        // Name-resolved references
        foreach ([['home_district', 'home_district_id', $districtMap, __('Home district')], ['posting_district', 'posting_district_id', $districtMap, __('Posting district')], ['unit', 'current_unit_id', $unitMap, __('Unit')]] as [$key, $idKey, $map, $label]) {
            $raw = $str($key);

            if ($raw === null) {
                continue;
            }

            $id = $map[mb_strtolower($raw)] ?? null;

            if ($id === null) {
                $errors[] = __(':label ":value" was not found. Copy the exact name from the Reference sheet.', ['label' => $label, 'value' => $raw]);
            } else {
                $payload[$idKey] = $id;
            }
        }

        // A member is posted at a unit OR dedicated to a district — never both.
        if ($payload['posting_district_id'] !== null && $payload['current_unit_id'] !== null) {
            $errors[] = __('Posting district and unit cannot both be filled — a member is posted at a unit or a district, not both.');
        }

        $sport = $str('sport');

        if ($sport !== null) {
            $sportId = $sportMap[mb_strtolower($sport)] ?? null;

            if ($sportId === null) {
                $errors[] = __('Sport ":value" was not found. Copy the exact name from the Reference sheet.', ['value' => $sport]);
            } else {
                $payload['_sport_id'] = $sportId;
            }
        }

        return [$payload, $errors];
    }

    /**
     * Normalize a raw cell value against an enum map. Keys are uppercased
     * with spaces/hyphens converted to underscores; mapped values win over
     * keys (null-valued keys map to themselves).
     *
     * @param  array<string, string|null>  $map
     */
    /**
     * Dropdown-label → code map for player levels, built once per import from
     * the tournament_tiers master (codes stay accepted as-is).
     *
     * @return array<string, string>
     */
    private function tierMap(): array
    {
        if ($this->tierMap !== null) {
            return $this->tierMap;
        }

        $map = [];

        foreach (TournamentTier::orderByDesc('weight')->get(['code', 'label_en']) as $tier) {
            $map[$tier->code] = $tier->code;
            $map[strtoupper(str_replace([' ', '-'], '_', $tier->label_en))] = $tier->code;
        }

        return $this->tierMap = $map;
    }

    /**
     * Name/alias → code map for ranks, built once per import from the ranks
     * master (codes stay accepted as-is). Unknown values pass through
     * unchanged — the forms also allow a custom free-text rank.
     *
     * @return array<string, string>
     */
    private function rankMap(): array
    {
        if ($this->rankMap !== null) {
            return $this->rankMap;
        }

        $map = [];

        foreach (Rank::active()->ordered()->get(['code', 'name', 'name_en', 'short_name', 'aliases']) as $rank) {
            foreach (array_filter([$rank->code, $rank->short_name, $rank->name, $rank->name_en, ...($rank->aliases ?? [])]) as $value) {
                $map[strtoupper(str_replace([' ', '-'], '_', $value))] = $rank->code;
            }
        }

        return $this->rankMap = $map;
    }

    /**
     * Resolve a rank cell to its master code; unmatched non-empty text is
     * kept as-is (custom ranks), empty stays null. Never errors the row.
     */
    private function resolveRank(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return $this->rankMap()[strtoupper(str_replace([' ', '-'], '_', $value))] ?? $value;
    }

    private function normalizeEnum(mixed $raw, array $map): ?string
    {
        $value = trim((string) $raw);

        if ($value === '') {
            return null;
        }

        $key = strtoupper(str_replace([' ', '-'], '_', $value));

        if (! array_key_exists($key, $map)) {
            return null;
        }

        return $map[$key] ?? $key;
    }

    /**
     * Parse a date cell: Excel serial number, DD.MM.YYYY, DD/MM/YYYY, or
     * YYYY-MM-DD. Returns the date string, null when empty, false when invalid.
     */
    private function parseDate(mixed $raw): string|null|false
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        if (is_numeric($raw)) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $raw)->format('Y-m-d');
            } catch (\Exception) {
                return false;
            }
        }

        $value = trim((string) $raw);

        foreach (['d.m.Y', 'd/m/Y', 'Y-m-d'] as $format) {
            try {
                $date = Carbon::createFromFormat($format, $value);

                if ($date !== false) {
                    return $date->toDateString();
                }
            } catch (\Exception) {
                // Try the next format.
            }
        }

        return false;
    }

    /**
     * Build a case-insensitive name → id lookup.
     *
     * @param  array<string, int>  $nameToId
     * @return array<string, int>
     */
    private function nameMap(array $nameToId): array
    {
        $map = [];

        foreach ($nameToId as $name => $id) {
            $map[mb_strtolower(trim($name))] = $id;
        }

        return $map;
    }

    /**
     * Normalize a header cell for the template comparison: strips UTF-8 BOM,
     * canonicalizes Unicode (NFC — Devanagari headers can come back NFD after
     * an Excel/LibreOffice round trip), and collapses whitespace including
     * non-breaking spaces.
     */
    private static function normalizeHeaderCell(mixed $cell): string
    {
        $value = (string) $cell;
        $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;

        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value, \Normalizer::FORM_C) ?: $value;
        }

        $value = preg_replace('/[\s\x{00A0}]+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * True when every non-date example value from the template's example row
     * matches the cell contents (date examples are ignored because they are
     * stored as Excel serials).
     *
     * @param  Collection<int, mixed>  $cells
     */
    private function isExampleRow(Collection $cells): bool
    {
        foreach (MemberImportSchema::columns() as $index => $column) {
            if ($column['example'] === null || $column['date']) {
                continue;
            }

            if (trim((string) $cells->get($index)) !== $column['example']) {
                return false;
            }
        }

        return true;
    }

    /** @param  list<string>  $rowErrors */
    private function recordError(int $rowNumber, string $name, array $rowErrors): void
    {
        if (count($this->errors) >= self::MAX_STORED_ERRORS) {
            return;
        }

        $this->errors[] = ['row' => $rowNumber, 'name' => $name, 'errors' => $rowErrors];
    }

    public function sheetProcessed(): bool
    {
        return $this->sheetProcessed;
    }

    public function createdCount(): int
    {
        return $this->created;
    }

    public function updatedCount(): int
    {
        return $this->updated;
    }

    public function skippedCount(): int
    {
        return $this->skipped;
    }

    public function failedCount(): int
    {
        return $this->failed;
    }

    /** @return list<array{row: int, name: string, errors: list<string>}> */
    public function rowErrors(): array
    {
        return $this->errors;
    }

    public function templateError(): ?string
    {
        return $this->templateError;
    }
}
