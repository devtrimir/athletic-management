<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\CoachAssignment;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSessionStatus;
use App\Support\Teams\TeamSessionStatusManager;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TeamExportController extends Controller
{
    /** @var array<string, string> */
    private const PRINT_COLUMN_LABELS = [
        'section' => 'Section',
        'serial_no' => 'S.No.',
        'event_weight' => 'Event / Weight',
        'rank' => 'Rank',
        'pno' => 'PNO',
        'name' => 'Name',
        'role' => 'Role',
        'posting' => 'Posting',
        'joined_on' => 'Joined on',
        'left_on' => 'Left on',
        'mobile' => 'Mobile',
        'level' => 'Level',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Team::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');
        /** @var int|null $resolvedSessionId */
        $sessionFilterBucket = $request->query('filter');
        $sessionFilterRaw = is_array($sessionFilterBucket)
            ? $sessionFilterBucket['session_id'] ?? null
            : $request->query('filter.session_id');

        if ($sessionFilterRaw !== null) {
            $sessionFilterValue = (int) $sessionFilterRaw;
            $resolvedSessionId = $sessionFilterValue > 0 ? (int) $sessionFilterValue : $defaultSessionId;
        } else {
            $resolvedSessionId = null;
        }
        $statusSessionId = $resolvedSessionId ?? ($defaultSessionId ? (int) $defaultSessionId : null);

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);
        $exportSections = $this->exportSections($request);

        if (! empty($ids)) {
            $teams = Team::whereIn('id', array_map('intval', $ids))
                ->withCount($this->teamCountColumns($resolvedSessionId))
                ->with($this->teamExportRelations($resolvedSessionId))
                ->orderBy('name')
                ->get();
        } else {
            $teams = QueryBuilder::for(Team::class)
                ->allowedFilters([
                    AllowedFilter::callback('session_id', fn ($query, $value): null => null),
                    AllowedFilter::exact('sport_id'),
                    AllowedFilter::exact('district_id'),
                    AllowedFilter::exact('unit_id'),
                    AllowedFilter::exact('location_type'),
                    AllowedFilter::callback('is_active', function ($query, $value) use ($statusSessionId): void {
                        if ($statusSessionId === null) {
                            return;
                        }

                        $isActive = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

                        $query->where(function ($statusAwareQuery) use ($statusSessionId, $isActive): void {
                            $statusAwareQuery->whereHas('sessionStatuses', function ($statusQuery) use ($statusSessionId, $isActive): void {
                                $statusQuery->where('session_id', $statusSessionId);

                                if ($isActive === true) {
                                    $statusQuery->where('status', TeamSessionStatus::STATUS_ACTIVE);
                                }

                                if ($isActive === false) {
                                    $statusQuery->where('status', '!=', TeamSessionStatus::STATUS_ACTIVE);
                                }
                            })->orWhere(function ($legacyQuery) use ($statusSessionId, $isActive): void {
                                $legacyQuery->whereDoesntHave('sessionStatuses', fn ($statusQuery) => $statusQuery->where('session_id', $statusSessionId));

                                if ($isActive === true) {
                                    $legacyQuery->where('is_active', true)->where('session_id', $statusSessionId);
                                }

                                if ($isActive === false) {
                                    $legacyQuery->where(function ($inactiveLegacyQuery) use ($statusSessionId): void {
                                        $inactiveLegacyQuery->where('is_active', false)->orWhere('session_id', '!=', $statusSessionId);
                                    });
                                }
                            });
                        });
                    }),
                    AllowedFilter::partial('q', 'name'),
                ])
                ->allowedSorts(['name', 'created_at'])
                ->defaultSort('name')
                ->withCount($this->teamCountColumns($resolvedSessionId))
                ->with($this->teamExportRelations($resolvedSessionId))
                ->when(
                    ! $request->has('filter.is_active'),
                    fn ($q) => $q->where('is_active', true)
                )
                ->get();
        }

        if ($statusSessionId !== null) {
            $sessionStatuses = app(TeamSessionStatusManager::class)->statusesForTeams($teams, $statusSessionId);

            $teams->each(function (Team $team) use ($sessionStatuses): void {
                /** @var TeamSessionStatus|null $sessionStatus */
                $sessionStatus = $sessionStatuses->get($team->id);
                $status = $sessionStatus?->status ?? TeamSessionStatus::STATUS_INACTIVE;

                $team->setAttribute('session_status', $status);
                $team->setAttribute('session_status_label', match ($status) {
                    TeamSessionStatus::STATUS_ACTIVE => __('Active'),
                    TeamSessionStatus::STATUS_CARRIED_FORWARD => __('Carried forward'),
                    default => __('Inactive'),
                });
            });
        }

        $headings = $this->translatedLabels(self::PRINT_COLUMN_LABELS);
        $rows = $this->buildPrintRows($teams->values(), $exportSections);
        $lastColumn = $this->lastPrintColumn();
        $headerRows = $this->teamExportHeaderRows();

        return Excel::download(
            new ReportExport(
                $rows,
                array_values($headings),
                'Teams',
                $headerRows,
                ["A1:{$lastColumn}1", "A2:{$lastColumn}2", "A3:{$lastColumn}3"],
                $this->teamExportColumnWidths(),
                afterSheet: fn (AfterSheet $event) => $this->styleTeamExportSheet($event, count($headerRows) + 1),
            ),
            'teams-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function teamExportHeaderRows(): array
    {
        $columnCount = count(self::PRINT_COLUMN_LABELS);

        return [
            array_pad(['UP Police Sport Control Board (UPPSCB)'], $columnCount, ''),
            array_pad(['Team Players Details'], $columnCount, ''),
            array_pad(['Generated on '.now()->format('d M Y')], $columnCount, ''),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function teamExportColumnWidths(): array
    {
        return [
            'A' => 22,
            'B' => 8,
            'C' => 24,
            'D' => 16,
            'E' => 16,
            'F' => 28,
            'G' => 16,
            'H' => 26,
            'I' => 16,
            'J' => 16,
            'K' => 16,
            'L' => 16,
        ];
    }

    private function styleTeamExportSheet(AfterSheet $event, int $headingRow): void
    {
        $sheet = $event->sheet->getDelegate();
        $lastRow = max($sheet->getHighestDataRow(), $headingRow);
        $lastColumn = $this->lastPrintColumn();

        $sheet->freezePane('A'.($headingRow + 1));
        $sheet->getDefaultRowDimension()->setRowHeight(22);
        $sheet->getRowDimension(1)->setRowHeight(30);
        $sheet->getRowDimension(2)->setRowHeight(24);

        $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->applyFromArray([
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

        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => ['bold' => true, 'size' => 15, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A8A'],
            ],
        ]);
        $sheet->getStyle("A2:{$lastColumn}3")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '1E3A8A']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'DBEAFE'],
            ],
        ]);

        $sheet->getStyle("A{$headingRow}:{$lastColumn}{$headingRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '111827'],
            ],
        ]);

        for ($row = $headingRow + 1; $row <= $lastRow; $row++) {
            $firstCell = trim((string) $sheet->getCell("A{$row}")->getValue());
            $restHasValue = false;

            foreach (range('B', $lastColumn) as $column) {
                if (trim((string) $sheet->getCell("{$column}{$row}")->getValue()) !== '') {
                    $restHasValue = true;
                    break;
                }
            }

            if ($firstCell !== '' && ! $restHasValue) {
                $range = "A{$row}:{$lastColumn}{$row}";
                $sheet->mergeCells($range);
                $sheet->getRowDimension($row)->setRowHeight(24);
                $sheet->getStyle($range)->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '2563EB'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);
            } elseif ($firstCell !== '') {
                $sheet->getStyle("A{$row}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => '1E3A8A']],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'EFF6FF'],
                    ],
                ]);
            }
        }
    }

    private function lastPrintColumn(): string
    {
        return chr(64 + count(self::PRINT_COLUMN_LABELS));
    }

    /**
     * @return array{all: bool, gd: bool, sport_quota: bool, coaches: bool, removed: bool}
     */
    private function exportSections(Request $request): array
    {
        $raw = (string) $request->query('export_sections', 'all,coaches');
        $sections = collect(explode(',', $raw))
            ->map(fn (string $section): string => str($section)->trim()->lower()->replace(' ', '_')->toString())
            ->filter()
            ->values();

        $includeDefaults = $sections->isEmpty() || $sections->contains('all');

        return [
            'all' => $includeDefaults,
            'gd' => $sections->contains('gd'),
            'sport_quota' => $sections->contains('sport_quota') || $sections->contains('sports_quota'),
            'coaches' => $includeDefaults || $sections->contains('coaches'),
            'removed' => $sections->contains('removed'),
        ];
    }

    /**
     * @param  array{all: bool, gd: bool, sport_quota: bool, coaches: bool, removed: bool}  $exportSections
     */
    private function includesMembers(array $exportSections): bool
    {
        return $exportSections['all']
            || $exportSections['gd']
            || $exportSections['sport_quota']
            || $exportSections['removed'];
    }

    /**
     * @return array<string, mixed>
     */
    private function teamCountColumns(?int $sessionId = null): array
    {
        $activeInSession = fn ($query) => $query
            ->when(
                $sessionId !== null,
                fn ($q) => $q->where('session_id', $sessionId),
            )
            ->whereNull('left_on');

        $genderAndCategory = function (string $gender, ?bool $isGd) use ($activeInSession): callable {
            return function ($query) use ($activeInSession, $gender, $isGd) {
                $activeInSession($query);

                return $query->whereHas('member', function ($memberQuery) use ($gender, $isGd): void {
                    $memberQuery->where('gender', $gender);

                    if ($isGd === true) {
                        $memberQuery->where('player_category', 'GD');
                    }

                    if ($isGd === false) {
                        $memberQuery->where('player_category', '!=', 'GD');
                    }
                });
            };
        };

        return [
            'teamMembers as players_count' => $activeInSession,
            'teamMembers as men_players_count' => $genderAndCategory('M', null),
            'teamMembers as men_gd_players_count' => $genderAndCategory('M', true),
            'teamMembers as men_non_gd_players_count' => $genderAndCategory('M', false),
            'teamMembers as women_players_count' => $genderAndCategory('F', null),
            'teamMembers as women_gd_players_count' => $genderAndCategory('F', true),
            'teamMembers as women_non_gd_players_count' => $genderAndCategory('F', false),
            'teamMembers as captains_count' => fn ($query) => $activeInSession($query)
                ->where('role', 'CAPTAIN'),
            'teamMembers as reserves_count' => fn ($query) => $activeInSession($query)
                ->where('role', 'RESERVE'),
            'coachAssignments as coaches_count' => fn ($query) => $query->when(
                $sessionId !== null,
                fn ($q) => $q->where('session_id', $sessionId),
            )->current(),
        ];
    }

    /**
     * @return array<int|string, mixed>
     */
    private function teamExportRelations(?int $sessionId = null): array
    {
        return [
            'sport:id,name',
            'session:id,name',
            'district:id,name',
            'unit:id,name,district_id',
            'currentInchargeAssignment',
            'teamMembers' => fn ($query) => $query
                ->when(
                    $sessionId !== null,
                    fn ($q) => $q->where('session_id', $sessionId),
                )
                ->with([
                    'member:id,member_code,pno,full_name,father_name,gender,rank,designation,mobile,player_category,player_level,current_status,current_unit_id,posting_district_id',
                    'member.currentUnit:id,name',
                    'member.postingDistrict:id,name',
                    'member.playableSports' => fn ($q) => $q
                        ->select(['sports.id', 'sports.name'])
                        ->withPivot(['sport_event', 'role', 'position']),
                    'session:id,name',
                ])
                ->orderBy('id'),
            'coachAssignments' => fn ($query) => $query
                ->when(
                    $sessionId !== null,
                    fn ($q) => $q->where('session_id', $sessionId),
                )
                ->current()
                ->with([
                    'coach:id,full_name,pno,mobile,nis_certified',
                    'coach.sports' => fn ($q) => $q
                        ->select(['sports.id', 'sports.name'])
                        ->withPivot(['sport_event', 'level']),
                    'session:id,name',
                ])
                ->orderBy('id'),
        ];
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @param  array{all: bool, gd: bool, sport_quota: bool, coaches: bool, removed: bool}  $exportSections
     * @return Collection<int, array<string, mixed>>
     */
    private function buildPrintRows(Collection $teams, array $exportSections): Collection
    {
        $rows = collect();

        foreach ($teams as $teamIndex => $team) {
            if ($teamIndex > 0) {
                $rows->push($this->blankPrintRow());
            }

            foreach ($this->teamPrintRows($team, $exportSections) as $row) {
                $rows->push($row);
            }
        }

        return $rows;
    }

    /**
     * @param  array{all: bool, gd: bool, sport_quota: bool, coaches: bool, removed: bool}  $exportSections
     * @return array<int, array<string, mixed>>
     */
    private function teamPrintRows(Team $team, array $exportSections): array
    {
        $rows = [
            $this->sectionPrintRow($team->name),
            $this->metaPrintRow('Sport', $team->sport?->name),
            $this->metaPrintRow('Location', $team->location_label),
            $this->metaPrintRow('Team prabhari', $this->teamInchargeLine($team) ?: $this->translateText('Not assigned')),
        ];

        if ($exportSections['coaches']) {
            $rows = [
                ...$rows,
                ...$this->coachSectionRows($team),
            ];
        }

        if ($exportSections['all']) {
            $rows = [
                ...$rows,
                ...$this->memberSectionRows(
                    'Active players',
                    $team,
                    $team->teamMembers->filter(fn (TeamMember $teamMember): bool => $teamMember->left_on === null)->values(),
                    false,
                ),
            ];
        }

        if ($exportSections['gd']) {
            $rows = [
                ...$rows,
                ...$this->memberSectionRows(
                    'GD players',
                    $team,
                    $team->teamMembers
                        ->filter(fn (TeamMember $teamMember): bool => $teamMember->left_on === null && strtoupper((string) ($teamMember->member?->player_category ?? '')) === 'GD')
                        ->values(),
                    false,
                ),
            ];
        }

        if ($exportSections['sport_quota']) {
            $rows = [
                ...$rows,
                ...$this->memberSectionRows(
                    'Sport quota players',
                    $team,
                    $team->teamMembers
                        ->filter(function (TeamMember $teamMember): bool {
                            $category = strtoupper((string) ($teamMember->member?->player_category ?? ''));

                            return $teamMember->left_on === null && $category !== '' && $category !== 'GD';
                        })
                        ->values(),
                    false,
                ),
            ];
        }

        if ($exportSections['removed']) {
            $removedMembers = $team->teamMembers
                ->filter(fn (TeamMember $teamMember): bool => $teamMember->left_on !== null)
                ->values();

            if ($removedMembers->isNotEmpty()) {
                $rows = [
                    ...$rows,
                    ...$this->memberSectionRows('Removed players', $team, $removedMembers, true),
                ];
            }
        }

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function coachSectionRows(Team $team): array
    {
        $rows = [$this->sectionPrintRow('Coaches')];

        if ($team->coachAssignments->isEmpty()) {
            return [
                ...$rows,
                $this->messagePrintRow('No coaches assigned in this session.'),
            ];
        }

        foreach ($team->coachAssignments->values() as $index => $coachAssignment) {
            $rows[] = $this->printRow([
                'section' => $this->translateText('Coaches'),
                'serial_no' => $index + 1,
                'event_weight' => $this->coachEventText($coachAssignment, $team),
                'pno' => $coachAssignment->coach?->pno,
                'name' => $coachAssignment->coach?->full_name,
                'role' => $this->translatedValue($coachAssignment->role),
                'joined_on' => $this->formatDate($coachAssignment->assigned_at),
                'level' => $this->translatedValue($this->coachLevelText($coachAssignment, $team)),
            ]);
        }

        return $rows;
    }

    /**
     * @param  Collection<int, TeamMember>  $members
     * @return array<int, array<string, mixed>>
     */
    private function memberSectionRows(string $title, Team $team, Collection $members, bool $showLeftOn): array
    {
        $rows = [$this->sectionPrintRow($title)];

        if ($members->isEmpty()) {
            return [
                ...$rows,
                $this->messagePrintRow('No players in this session.'),
            ];
        }

        foreach ($members->values() as $index => $teamMember) {
            $rows[] = $this->memberPrintRow($teamMember, $team, $index + 1, $showLeftOn);
        }

        return $rows;
    }

    private function memberPrintRow(TeamMember $teamMember, Team $team, int $serialNumber, bool $showLeftOn): array
    {
        $member = $teamMember->member;
        $posting = collect([
            $member?->designation,
            $member?->currentUnit?->name,
        ])->filter()->implode(' / ');

        return $this->printRow([
            'section' => $teamMember->left_on === null
                ? $this->translateText('Player')
                : $this->translateText('Removed player'),
            'serial_no' => $serialNumber,
            'event_weight' => $this->memberEventText($teamMember, $team),
            'rank' => $member?->rank,
            'pno' => $member?->pno,
            'name' => $member?->full_name,
            'role' => $this->translatedValue($teamMember->role),
            'posting' => $posting !== '' ? $posting : null,
            'joined_on' => $this->formatDate($teamMember->joined_on),
            'left_on' => $showLeftOn ? $this->formatDate($teamMember->left_on) : null,
            'mobile' => $member?->mobile,
            'level' => $this->translatedValue($member?->player_category),
        ]);
    }

    private function teamInchargeLine(Team $team): string
    {
        return collect([
            $team->currentInchargeAssignment?->rank,
            $team->currentInchargeAssignment?->full_name ?? $team->in_charge,
            $team->currentInchargeAssignment?->pno,
            $team->currentInchargeAssignment?->mobile,
        ])->filter()->implode(' / ');
    }

    private function memberEventText(TeamMember $teamMember, Team $team): ?string
    {
        $sport = $teamMember->member?->relationLoaded('playableSports')
            ? $teamMember->member->playableSports->firstWhere('id', $team->sport_id)
            : null;

        if ($sport === null) {
            return null;
        }

        return collect([
            $this->withoutSportName($sport->pivot?->sport_event, $team->sport?->name),
            filled($sport->pivot?->position) ? (string) $sport->pivot->position : null,
            filled($sport->pivot?->role) ? (string) $sport->pivot->role : null,
        ])->filter()->implode(' / ') ?: null;
    }

    private function coachEventText(CoachAssignment $coachAssignment, Team $team): ?string
    {
        $sport = $coachAssignment->coach?->relationLoaded('sports')
            ? $coachAssignment->coach->sports->firstWhere('id', $team->sport_id)
            : null;

        if ($sport === null) {
            return null;
        }

        return filled($sport->pivot?->sport_event) ? (string) $sport->pivot->sport_event : null;
    }

    private function coachLevelText(CoachAssignment $coachAssignment, Team $team): ?string
    {
        $sport = $coachAssignment->coach?->relationLoaded('sports')
            ? $coachAssignment->coach->sports->firstWhere('id', $team->sport_id)
            : null;

        if ($sport === null) {
            return null;
        }

        return filled($sport->pivot?->level) ? (string) $sport->pivot->level : null;
    }

    private function withoutSportName(mixed $value, ?string $sportName): ?string
    {
        $text = trim((string) ($value ?? ''));
        $sport = trim((string) ($sportName ?? ''));

        if ($text === '') {
            return null;
        }

        if ($sport !== '' && str_starts_with(mb_strtolower($text), mb_strtolower($sport))) {
            $text = trim(mb_substr($text, mb_strlen($sport)));
            $text = trim($text, " \t\n\r\0\x0B-/:|");
        }

        return $text !== '' ? $text : null;
    }

    private function sectionPrintRow(string $title): array
    {
        return $this->printRow([
            'section' => $this->translateText($title),
        ]);
    }

    private function metaPrintRow(string $label, mixed $value): array
    {
        return $this->printRow([
            'section' => $this->translateText($label),
            'name' => $value,
        ]);
    }

    private function messagePrintRow(string $message): array
    {
        return $this->printRow([
            'name' => $this->translateText($message),
        ]);
    }

    private function blankPrintRow(): array
    {
        return $this->printRow();
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function printRow(array $values = []): array
    {
        return array_replace(array_fill_keys(array_keys(self::PRINT_COLUMN_LABELS), null), $values);
    }

    private function formatDate(?CarbonInterface $value): ?string
    {
        return $value?->format('d M Y');
    }

    /**
     * @param  array<string, string>  $labels
     * @return array<int, string>
     */
    private function translatedLabels(array $labels): array
    {
        return array_map(
            fn (string $label): string => $this->translateText($label),
            array_values($labels),
        );
    }

    private function translatedValue(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return $value;
        }

        return $this->translateText($value);
    }

    private function translateText(string $value): string
    {
        $translated = __($value);

        return is_string($translated) ? $translated : $value;
    }
}
