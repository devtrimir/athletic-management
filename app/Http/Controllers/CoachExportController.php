<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CoachExportController extends Controller
{
    /** @var array<int, string> */
    private const DEFAULT_COLUMNS = [
        'serial_number',
        'coach',
        'pno',
        'blood_group',
        'gender',
        'sports',
        'current_assignments',
        'unit_district',
        'mobile',
        'nis_certified',
    ];

    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'serial_number' => 'S.No.',
        'coach' => 'Coach',
        'pno' => 'PNO',
        'blood_group' => 'Blood Group',
        'gender' => 'Gender',
        'sports' => 'Playable Sport',
        'current_assignments' => 'Current team names',
        'unit_district' => 'Posting',
        'mobile' => 'Mobile Number',
        'nis_certified' => 'NIS Certified',
        'display_name' => 'Display Name',
        'designation' => 'Designation',
        'email' => 'Email',
        'coach_status' => 'Status',
        'certifications' => 'Certifications',
        'assignment_history_count' => 'Assignment History Count',
        'linked_member' => 'Linked Member Code',
    ];

    private const GENDER_LABELS = [
        'M' => 'Male',
        'F' => 'Female',
        'O' => 'Other gender',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Coach::class);

        /** @var array<int, string> $ids */
        $ids = $this->normalizedIds($request->query('ids', []));
        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusScope = $this->statusScopeFromFilters($filters);
        $sportsById = Sport::query()
            ->where('organization_id', $request->user()->organization_id)
            ->pluck('name', 'id')
            ->all();

        if (! empty($ids)) {
            $coaches = Coach::whereIn('id', array_map('intval', $ids))
                ->with([
                    'district:id,name',
                    'unit:id,name',
                    'rankMaster:id,code,name,short_name',
                    'member:id,member_code',
                    'sports' => fn ($q) => $q
                        ->select('sports.id', 'sports.name')
                        ->withPivot([
                            'sport_event',
                            'is_primary',
                            'level_master_id',
                            'level',
                            'effective_from',
                            'effective_to',
                            'notes',
                        ]),
                    'certifications:id,coach_id,name,certificate_type',
                    'currentAssignments:id,coach_id,team_id,session_id,role,assigned_at',
                    'currentAssignments.team:id,name,sport_id,session_id',
                    'currentAssignments.team.sport:id,name',
                    'currentAssignments.session:id,name',
                ])
                ->withCount(['assignmentHistory as assignments_count' => fn ($q) => $q->current()])
                ->orderBy('full_name')
                ->get()
                ->unique('id')
                ->values();
        } else {
            $coaches = QueryBuilder::for($this->filterByStatusScope(Coach::query(), $statusScope))
                ->allowedFilters([
                    AllowedFilter::callback('status_scope', fn (Builder $query, mixed $value): Builder => $this->filterByStatusScope($query, (string) $value)),
                    AllowedFilter::exact('nis_certified'),
                    AllowedFilter::exact('blood_group'),
                    AllowedFilter::exact('district_id'),
                    AllowedFilter::exact('unit_id'),
                    AllowedFilter::exact('coach_status'),
                    AllowedFilter::exact('mobile'),
                    AllowedFilter::callback('has_certification', function (Builder $query, mixed $value): void {
                        $query->when(
                            $value === 'true' || $value === true,
                            fn (Builder $q) => $q->whereHas('certifications'),
                            fn (Builder $q) => $q->whereDoesntHave('certifications')
                        );
                    }),
                    AllowedFilter::callback('certification_name', function (Builder $query, mixed $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $term = '%'.mb_strtolower((string) $value).'%';

                        $query->whereHas('certifications', fn (Builder $q) => $q->whereRaw('LOWER(name) LIKE ?', [$term]));
                    }),
                    AllowedFilter::callback('certification_type', function (Builder $query, mixed $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $query->whereHas('certifications', fn (Builder $q) => $q->where('certificate_type', (string) $value));
                    }),
                    AllowedFilter::callback('sport_id', function (Builder $query, mixed $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $sportId = (int) $value;

                        $query->where(function (Builder $query) use ($sportId): void {
                            $query->whereHas('currentAssignments', fn (Builder $q) => $q->whereHas('team', fn (Builder $teamQuery) => $teamQuery->where('sport_id', $sportId)));
                            $query->orWhereHas('sports', fn (Builder $q) => $q->where('sports.id', $sportId));
                        });
                    }),
                    AllowedFilter::callback('has_active_assignment', function (Builder $query, mixed $value): void {
                        if ($value === 'true' || $value === true) {
                            $query->whereHas('currentAssignments');
                        } elseif ($value === 'false' || $value === false) {
                            $query->whereDoesntHave('currentAssignments');
                        }
                    }),
                    AllowedFilter::callback('q', function (Builder $query, mixed $value): void {
                        $term = '%'.mb_strtolower(trim((string) $value).'%');
                        $query->where(function (Builder $q) use ($term): void {
                            $q->whereRaw('LOWER(full_name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(COALESCE(display_name, \'\')) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(COALESCE(pno, \'\')) LIKE ?', [$term])
                                ->orWhereHas('aliases', fn (Builder $aliasQuery) => $aliasQuery->whereRaw('LOWER(alias) LIKE ?', [$term]));
                        });
                    }),
                ])
                ->allowedSorts(['full_name', 'pno', 'coach_status', 'designation', 'created_at'])
                ->defaultSort('full_name')
                ->with([
                    'district:id,name',
                    'unit:id,name',
                    'rankMaster:id,code,name,short_name',
                    'currentAssignments' => fn ($q) => $q
                        ->select(['id', 'team_id', 'coach_id', 'session_id', 'role', 'assigned_at'])
                        ->with([
                            'team:id,name,sport_id,session_id',
                            'team.sport:id,name',
                            'session:id,name',
                        ])
                        ->latest('assigned_at'),
                    'member:id,member_code',
                    'certifications:id,coach_id,name,certificate_type',
                    'sports' => fn ($q) => $q
                        ->select('sports.id', 'sports.name')
                        ->withPivot([
                            'is_primary',
                            'level_master_id',
                            'level',
                            'sport_event',
                            'effective_from',
                            'effective_to',
                            'notes',
                        ]),
                ])
                ->withCount(['assignmentHistory as assignments_count' => fn ($q) => $q->current()])
                ->get()
                ->unique('id')
                ->values();
        }

        $layout = $this->coachListingExportRows($coaches, $sportsById);
        $headingRow = 2;
        $lastColumn = 'J';
        $mergeRanges = array_merge([
            'A1:A2',
            'B1:B2',
            'C1:C2',
            'D1:J1',
        ], $layout['mergeRanges']);

        return Excel::download(
            new ReportExport(
                $layout['rows'],
                ['', '', '', __('Rank'), __('Name'), __('PNO'), __('Mobile'), __('Role'), __('Posting'), __('NIS')],
                'Coaches',
                headerRows: [[__('S.No.'), __('Sport'), __('Team'), __('Coaches in team'), '', '', '', '', '', '']],
                mergeRanges: $mergeRanges,
                columnWidths: [
                    'A' => 6,
                    'B' => 14,
                    'C' => 28,
                    'D' => 16,
                    'E' => 28,
                    'F' => 15,
                    'G' => 15,
                    'H' => 14,
                    'I' => 18,
                    'J' => 8,
                ],
                afterSheet: fn (AfterSheet $event) => $this->styleCoachExportSheet(
                    $event,
                    $headingRow,
                    $lastColumn,
                ),
            ),
            'coaches-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function show(Coach $coach, Request $request): BinaryFileResponse
    {
        Gate::authorize('view', $coach);

        $coach->load([
            'member:id,member_code',
            'district:id,name',
            'unit:id,name',
            'certifications:id,coach_id,name,certificate_type',
            'sports' => fn ($q) => $q
                ->select('sports.id', 'sports.name')
                ->withPivot([
                    'is_primary',
                    'level_master_id',
                    'level',
                    'sport_event',
                    'effective_from',
                    'effective_to',
                    'notes',
                ]),
            'currentAssignments:id,coach_id,team_id,session_id,role,assigned_at',
            'currentAssignments.team:id,name,session_id',
            'currentAssignments.session:id,name',
        ]);

        /** @var array<int, string> $columns */
        $columns = $this->selectedExportColumns($request->query('columns', self::DEFAULT_COLUMNS));
        $validColumns = array_values(array_intersect($columns, array_keys(self::COLUMN_LABELS)));
        $layout = $this->exportColumnLayout($validColumns);
        $headingRow = count($layout['headerRows']) + 1;
        $lastColumn = Coordinate::stringFromColumnIndex(count($layout['headings']));

        $rows = collect([$this->coachExportRow($coach, $layout['keys'], 1)]);

        $filename = 'coach-'.($coach->pno ?? $coach->id).'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new ReportExport(
                $rows,
                $layout['headings'],
                $coach->full_name,
                headerRows: $layout['headerRows'],
                mergeRanges: $layout['mergeRanges'],
                afterSheet: fn (AfterSheet $event) => $this->styleCoachExportSheet(
                    $event,
                    $headingRow,
                    $lastColumn,
                ),
            ),
            $filename,
        );
    }

    /**
     * @param  Collection<int, Coach>  $coaches
     * @param  array<int|string, string>  $sportsById
     * @return array{rows: Collection<int, array<int, string|int>>, mergeRanges: list<string>}
     */
    private function coachListingExportRows(Collection $coaches, array $sportsById): array
    {
        $coachRoleOrder = static fn (string $role): int => match (mb_strtolower(trim($role))) {
            'head', 'head coach' => 0,
            'assistant', 'assistant coach' => 1,
            default => 2,
        };

        $coachRoleLabel = static fn (string $role): string => match (mb_strtolower(trim($role))) {
            'head', 'head coach' => __('Head Coach'),
            'assistant', 'assistant coach' => __('Assistant Coach'),
            default => $role ?: __('Coach'),
        };

        $groups = collect();

        foreach ($coaches as $coach) {
            $assignments = $coach->currentAssignments ?? collect();

            if ($assignments->isEmpty()) {
                $groups->put('inactive:'.$coach->id, [
                    'sport' => __('Unassigned'),
                    'team' => '-',
                    'coaches' => [[
                        'id' => (string) $coach->id,
                        'rank' => (string) ($coach->rankMaster?->name ?? $coach->rankMaster?->short_name ?? ''),
                        'full_name' => (string) $coach->full_name,
                        'pno' => (string) ($coach->pno ?? ''),
                        'mobile' => (string) ($coach->mobile ?? ''),
                        'role' => __('Inactive'),
                        'posting' => trim(implode(' - ', array_filter([$coach->unit?->name, $coach->district?->name]))),
                        'nis_certified' => $coach->nis_certified ? __('Yes') : __('No'),
                    ]],
                ]);

                continue;
            }

            $teamGrouped = $assignments
                ->unique(fn (CoachAssignment $assignment): int => (int) $assignment->id)
                ->groupBy(fn (CoachAssignment $assignment): string => (($assignment->team?->sport_id ?? 0).':'.($assignment->team?->id ?? 0)));

            foreach ($teamGrouped as $rows) {
                $team = $rows->first()?->team;
                $teamName = (string) ($team?->name ?? __('Unspecified team'));
                $teamSportName = $team?->sport?->name;
                $teamSportId = $team?->sport_id;
                $sportName = (string) ($teamSportName !== null
                    ? $teamSportName
                    : ($teamSportId !== null && isset($sportsById[$teamSportId])
                        ? $sportsById[$teamSportId]
                        : __('Unspecified sport')));
                $groupKey = ($teamSportId ?? 0).':'.($team?->id ?? 0);

                $groupedCoaches = $rows->values()->map(function (CoachAssignment $assignment) use ($coach, $coachRoleLabel): array {
                    return [
                        'id' => (string) $coach->id,
                        'rank' => (string) ($coach->rankMaster?->name ?? $coach->rankMaster?->short_name ?? ''),
                        'full_name' => (string) $coach->full_name,
                        'pno' => (string) ($coach->pno ?? ''),
                        'mobile' => (string) ($coach->mobile ?? ''),
                        'role' => $coachRoleLabel((string) ($assignment->role ?? '')),
                        'posting' => trim(implode(' - ', array_filter([$coach->unit?->name, $coach->district?->name]))),
                        'nis_certified' => $coach->nis_certified ? __('Yes') : __('No'),
                    ];
                })->toArray();

                $existingGroup = $groups->get($groupKey);

                if (is_array($existingGroup)) {
                    $groupedCoaches = array_merge($existingGroup['coaches'], $groupedCoaches);
                }

                $coachIds = [];
                $groupedCoaches = collect($groupedCoaches)
                    ->filter(function (array $coachData) use (&$coachIds): bool {
                        if (in_array($coachData['id'], $coachIds, true)) {
                            return false;
                        }

                        $coachIds[] = $coachData['id'];

                        return true;
                    })
                    ->values()
                    ->toArray();

                $groups->put($groupKey, [
                    'sport' => $sportName,
                    'team' => $teamName,
                    'coaches' => $groupedCoaches,
                ]);
            }
        }

        $rows = collect();
        $mergeRanges = [];
        $excelRow = 3;

        $groups->sortBy([['sport', 'asc'], ['team', 'asc']])
            ->values()
            ->each(function (array $group, int $groupIndex) use (&$excelRow, &$mergeRanges, $coachRoleOrder, $rows): void {
                $coachRows = collect($group['coaches'])
                    ->sortBy([
                        fn (array $coachData): int => $coachRoleOrder((string) $coachData['role']),
                        fn (array $coachData): string => (string) $coachData['rank'],
                    ])
                    ->values();
                $startRow = $excelRow;

                foreach ($coachRows as $coachIndex => $coachData) {
                    $rows->push([
                        $coachIndex === 0 ? $groupIndex + 1 : '',
                        $coachIndex === 0 ? $group['sport'] : '',
                        $coachIndex === 0 ? $group['team'] : '',
                        $coachData['rank'],
                        $coachData['full_name'],
                        $coachData['pno'],
                        $coachData['mobile'],
                        $coachData['role'],
                        $coachData['posting'],
                        $coachData['nis_certified'],
                    ]);
                    $excelRow++;
                }

                if ($coachRows->count() > 1) {
                    $endRow = $excelRow - 1;
                    $mergeRanges[] = "A{$startRow}:A{$endRow}";
                    $mergeRanges[] = "B{$startRow}:B{$endRow}";
                    $mergeRanges[] = "C{$startRow}:C{$endRow}";
                }
            });

        return [
            'rows' => $rows,
            'mergeRanges' => $mergeRanges,
        ];
    }

    /**
     * @param  list<string>  $columns
     * @return array{headings:list<string>,headerRows:list<list<string>>,mergeRanges:list<string>,keys:list<string>}
     */
    private function exportColumnLayout(array $columns): array
    {
        $hasGroupedColumns = in_array('sports', $columns, true) || in_array('current_assignments', $columns, true);

        if (! $hasGroupedColumns) {
            return [
                'headings' => array_map(fn (string $column): string => self::COLUMN_LABELS[$column], $columns),
                'headerRows' => [],
                'mergeRanges' => [],
                'keys' => $columns,
            ];
        }

        $mainHeadings = [];
        $detailHeadings = [];
        $mergeRanges = [];
        $keys = [];
        $columnIndex = 1;

        foreach ($columns as $column) {
            if ($column === 'sports') {
                $mainHeadings[] = self::COLUMN_LABELS[$column];
                $mainHeadings[] = '';
                $detailHeadings[] = __('Sport');
                $detailHeadings[] = __('Event / Weight');
                $keys[] = 'sport_name';
                $keys[] = 'sport_event';
                $mergeRanges[] = Coordinate::stringFromColumnIndex($columnIndex).'1:'.Coordinate::stringFromColumnIndex($columnIndex + 1).'1';
                $columnIndex += 2;

                continue;
            }

            if ($column === 'current_assignments') {
                $mainHeadings[] = __('Teams');
                $mainHeadings[] = '';
                $mainHeadings[] = '';
                $mainHeadings[] = '';
                $detailHeadings[] = __('Team');
                $detailHeadings[] = __('Session');
                $detailHeadings[] = __('Role');
                $detailHeadings[] = __('Assigned at');
                $keys[] = 'assignment_team';
                $keys[] = 'assignment_session';
                $keys[] = 'assignment_role';
                $keys[] = 'assignment_assigned_at';
                $mergeRanges[] = Coordinate::stringFromColumnIndex($columnIndex).'1:'.Coordinate::stringFromColumnIndex($columnIndex + 3).'1';
                $columnIndex += 4;

                continue;
            }

            $mainHeadings[] = self::COLUMN_LABELS[$column];
            $detailHeadings[] = '';
            $keys[] = $column;
            $mergeRanges[] = Coordinate::stringFromColumnIndex($columnIndex).'1:'.Coordinate::stringFromColumnIndex($columnIndex).'2';
            $columnIndex++;
        }

        return [
            'headings' => $detailHeadings,
            'headerRows' => [$mainHeadings],
            'mergeRanges' => $mergeRanges,
            'keys' => $keys,
        ];
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    private function coachExportRow(Coach $coach, array $keys, int $serialNumber): array
    {
        $sportRows = $coach->sports->map(fn (Sport $sport): array => [
            'sport_name' => (string) $sport->name,
            'sport_event' => (string) ($sport->pivot?->sport_event ?? ''),
        ]);
        $assignmentRows = $coach->currentAssignments->map(fn (CoachAssignment $assignment): array => [
            'assignment_team' => (string) ($assignment->team?->name ?? ''),
            'assignment_session' => (string) ($assignment->session?->name ?? $assignment->team?->session?->name ?? ''),
            'assignment_role' => (string) ($assignment->role ?? ''),
            'assignment_assigned_at' => (string) ($assignment->assigned_at?->format('d-m-Y') ?? ''),
        ]);

        $row = [];

        foreach ($keys as $key) {
            $row[$key] = match ($key) {
                'serial_number' => $serialNumber,
                'coach' => implode(' | ', array_filter([
                    trim((string) ($coach->designation ?? '')) !== '' ? trim((string) $coach->designation) : null,
                    $coach->full_name,
                ])),
                'pno' => $coach->pno,
                'nis_certified' => $coach->nis_certified ? 'Yes' : 'No',
                'gender' => self::GENDER_LABELS[$coach->gender] ?? ($coach->gender ?? ''),
                'unit_district' => (string) ($coach->unit?->name ?? $coach->district?->name),
                'sport_name', 'sport_event' => $this->stackedExportValue($sportRows, $key),
                'assignment_team', 'assignment_session', 'assignment_role', 'assignment_assigned_at' => $this->stackedExportValue($assignmentRows, $key),
                'current_assignments' => $this->flatAssignmentsValue($coach),
                'linked_member' => $coach->member?->member_code,
                'certifications' => $coach->certifications
                    ->map(fn ($cert) => trim(($cert->name ?? '').' '.($cert->certificate_type ? "({$cert->certificate_type})" : '')))
                    ->filter()
                    ->join('|'),
                'sports' => $coach->sports
                    ->map(function (Sport $sport): string {
                        $event = (string) ($sport->pivot?->sport_event ?? '');

                        return $event !== '' ? $sport->name.' ('.$event.')' : $sport->name;
                    })
                    ->filter()
                    ->join('|'),
                'assignment_history_count' => (string) ($coach->assignments_count ?? 0),
                default => $coach->{$key},
            };
        }

        return $row;
    }

    /** @param  Collection<int, array<string, string>>  $rows */
    private function stackedExportValue(Collection $rows, string $key): string
    {
        return $rows->pluck($key)->filter(fn (string $value): bool => $value !== '')->join("\n");
    }

    private function flatAssignmentsValue(Coach $coach): string
    {
        return $coach->currentAssignments
            ->map(function (CoachAssignment $assignment): string {
                $team = $assignment->team?->name ?? '';
                $session = $assignment->session?->name ?? $assignment->team?->session?->name ?? '';
                $role = (string) ($assignment->role ?? '');
                $assignedAt = $assignment->assigned_at?->format('d-m-Y') ?? '';

                return implode(' | ', array_filter([$team, $session, $role, $assignedAt]));
            })
            ->join('; ');
    }

    private function styleCoachExportSheet(AfterSheet $event, int $headingRow, string $lastColumn): void
    {
        $sheet = $event->sheet->getDelegate();
        $lastRow = max($sheet->getHighestDataRow(), $headingRow);
        $headerStartRow = 1;

        $sheet->freezePane('A'.($headingRow + 1));
        $sheet->getDefaultRowDimension()->setRowHeight(22);
        $sheet->getStyle("A{$headerStartRow}:{$lastColumn}{$lastRow}")->applyFromArray([
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '9CA3AF'],
                ],
            ],
        ]);

        $sheet->getStyle("A{$headerStartRow}:{$lastColumn}{$headingRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A8A'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
    }

    /**
     * @return array<int, int>
     */
    private function normalizedIds(mixed $ids): array
    {
        if (! is_array($ids)) {
            $ids = [$ids];
        }

        return array_values(
            array_unique(
                array_map(
                    fn (mixed $id): int => (int) $id,
                    array_filter($ids, fn (mixed $id): bool => is_numeric($id)),
                )
            )
        );
    }

    /**
     * @return array<int, string>
     */
    private function selectedExportColumns(mixed $columns): array
    {
        $requested = is_array($columns) ? $columns : self::DEFAULT_COLUMNS;
        $requested = array_values(array_filter(array_unique($requested), 'is_string'));
        $valid = array_values(array_intersect($requested, array_keys(self::COLUMN_LABELS)));

        return $valid === [] ? self::DEFAULT_COLUMNS : $valid;
    }

    private function filterByStatusScope(Builder $query, string $value): Builder
    {
        return match ($value) {
            'inactive' => $query->whereDoesntHave('currentAssignments'),
            default => $query->whereHas('currentAssignments'),
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function statusScopeFromFilters(array $filters): string
    {
        $assignmentScope = $filters['has_active_assignment'] ?? null;

        if ($assignmentScope === false || $assignmentScope === 'false' || $assignmentScope === '0' || $assignmentScope === 0) {
            return 'inactive';
        }

        if ($assignmentScope === true || $assignmentScope === 'true' || $assignmentScope === '1' || $assignmentScope === 1) {
            return 'active';
        }

        return ($filters['status_scope'] ?? null) === 'inactive' ? 'inactive' : 'active';
    }
}
