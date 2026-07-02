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
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TeamExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'serial_no' => 'S.No.',
        'name' => 'Team Name',
        'sport' => 'Sport',
        'posting' => 'Location',
        'location_type' => 'Location Type',
        'district' => 'District',
        'unit' => 'Unit',
        'is_active' => 'Status',
        'in_charge' => 'Team Prabhari',
        'incharge_pno' => 'Team Prabhari PNO',
        'incharge_rank' => 'Team Prabhari Rank',
        'incharge_designation' => 'Team Prabhari Designation',
        'incharge_mobile' => 'Team Prabhari Mobile',
        'incharge_email' => 'Team Prabhari Email',
        'incharge_assigned_at' => 'Team Prabhari Assigned On',
        'players_count' => 'Players',
        'men_players_count' => 'Men Players',
        'men_gd_players_count' => 'Men GD Players',
        'men_non_gd_players_count' => 'Men Sports Quota Players',
        'women_players_count' => 'Women Players',
        'women_gd_players_count' => 'Women GD Players',
        'women_non_gd_players_count' => 'Women Sports Quota Players',
        'captains_count' => 'Captains',
        'reserves_count' => 'Reserves',
        'coaches_count' => 'Coaches',
    ];

    /** @var array<string, string> */
    private const MEMBER_COLUMN_LABELS = [
        'member_code' => 'Member Code',
        'member_pno' => 'Member PNO',
        'member_name' => 'Member Name',
        'member_father_name' => "Father's Name",
        'member_gender' => 'Gender',
        'member_rank' => 'Member Rank',
        'member_designation' => 'Member Designation',
        'member_mobile' => 'Member Mobile',
        'member_team_role' => 'Team Role',
        'member_team_session' => 'Team Session',
        'member_joined_on' => 'Joined On',
        'member_left_on' => 'Left On',
        'member_category' => 'Category',
        'member_level' => 'Level',
        'member_status' => 'Member Status',
        'member_current_unit' => 'Current Unit',
        'member_posting_district' => 'Posting District',
    ];

    /** @var array<string, string> */
    private const COACH_COLUMN_LABELS = [
        'coach_name' => 'Coach Name',
        'coach_pno' => 'Coach PNO',
        'coach_mobile' => 'Coach Mobile',
        'nis_certified' => 'NIS Certified',
        'coach_role' => 'Coach Role',
        'coach_session' => 'Coach Session',
    ];

    /** @var array<string, string> */
    private const ROSTER_COLUMN_LABELS = [
        'roster_type' => 'Roster Type',
        'roster_no' => 'Roster S.No.',
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

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

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

        $validColumns = array_values(array_intersect($columns, array_keys(self::COLUMN_LABELS)));

        if ($validColumns === []) {
            $validColumns = array_keys(self::COLUMN_LABELS);
        }

        $headings = [
            ...array_map(fn (string $col): string => $this->translateText(self::COLUMN_LABELS[$col]), $validColumns),
            ...$this->translatedLabels(self::ROSTER_COLUMN_LABELS),
            ...$this->translatedLabels(self::MEMBER_COLUMN_LABELS),
            ...$this->translatedLabels(self::COACH_COLUMN_LABELS),
        ];

        [$rows, $mergeRanges] = $this->buildRowsAndMerges($teams->values(), $validColumns);

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Teams', $mergeRanges),
            'teams-'.now()->format('Y-m-d').'.xlsx',
        );
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
                    'session:id,name',
                ])
                ->orderBy('id'),
        ];
    }

    private function teamColumnValue(Team $team, string $column, int $serialNumber): mixed
    {
        return match ($column) {
            'serial_no' => $serialNumber,
            'sport' => $team->sport?->name,
            'posting' => $team->location_label,
            'location_type' => $this->translateText($team->location_type === 'unit' ? 'Unit' : 'District'),
            'district' => $team->district?->name,
            'unit' => $team->unit?->name,
            'is_active' => $this->translateText((string) ($team->getAttribute('session_status_label') ?? ($team->is_active ? 'Active' : 'Inactive'))),
            'in_charge' => $team->currentInchargeAssignment?->full_name ?? $team->in_charge,
            'incharge_pno' => $team->currentInchargeAssignment?->pno,
            'incharge_rank' => $team->currentInchargeAssignment?->rank,
            'incharge_designation' => $team->currentInchargeAssignment?->designation,
            'incharge_mobile' => $team->currentInchargeAssignment?->mobile,
            'incharge_email' => $team->currentInchargeAssignment?->email,
            'incharge_assigned_at' => $this->formatDate($team->currentInchargeAssignment?->assigned_at),
            default => $team->getAttribute($column),
        };
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @param  array<int, string>  $validColumns
     * @return array{0: Collection<int, array<string, mixed>>, 1: array<int, string>}
     */
    private function buildRowsAndMerges(Collection $teams, array $validColumns): array
    {
        $rows = collect();
        $mergeRanges = [];
        $worksheetRow = 2;

        foreach ($teams as $index => $team) {
            $teamRows = $this->teamRosterRows($team, $validColumns, $index + 1);
            $rowCount = count($teamRows);

            foreach ($teamRows as $teamRow) {
                $rows->push($teamRow);
            }

            if ($rowCount > 1) {
                $mergeRanges = [
                    ...$mergeRanges,
                    ...$this->teamMergeRanges($worksheetRow, $worksheetRow + $rowCount - 1, count($validColumns)),
                ];
            }

            $worksheetRow += $rowCount;
        }

        return [$rows, $mergeRanges];
    }

    /**
     * @return array<int, string>
     */
    private function teamMergeRanges(int $startRow, int $endRow, int $teamColumnCount): array
    {
        $ranges = [];

        for ($column = 1; $column <= $teamColumnCount; $column++) {
            $letter = Coordinate::stringFromColumnIndex($column);
            $ranges[] = "{$letter}{$startRow}:{$letter}{$endRow}";
        }

        return $ranges;
    }

    /**
     * @param  array<int, string>  $validColumns
     * @return array<int, array<string, mixed>>
     */
    private function teamRosterRows(Team $team, array $validColumns, int $serialNumber): array
    {
        $teamValues = $this->teamRowValues($team, $validColumns, $serialNumber);
        $emptyTeamValues = $this->emptyTeamRowValues($validColumns);
        $rows = [];
        $rosterNumber = 1;

        foreach ($team->teamMembers as $teamMember) {
            $rows[] = array_merge(
                $rows === [] ? $teamValues : $emptyTeamValues,
                [
                    'roster_type' => $this->translateText('Member'),
                    'roster_no' => $rosterNumber,
                ],
                $this->memberRowValues($teamMember),
                $this->emptyCoachRowValues(),
            );

            $rosterNumber++;
        }

        foreach ($team->coachAssignments as $coachAssignment) {
            $rows[] = array_merge(
                $rows === [] ? $teamValues : $emptyTeamValues,
                [
                    'roster_type' => $this->translateText('Coach'),
                    'roster_no' => $rosterNumber,
                ],
                $this->emptyMemberRowValues(),
                $this->coachRowValues($coachAssignment),
            );

            $rosterNumber++;
        }

        if ($rows === []) {
            return [
                array_merge(
                    $teamValues,
                    [
                        'roster_type' => null,
                        'roster_no' => null,
                    ],
                    $this->emptyMemberRowValues(),
                    $this->emptyCoachRowValues(),
                ),
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int, string>  $validColumns
     * @return array<string, mixed>
     */
    private function teamRowValues(Team $team, array $validColumns, int $serialNumber): array
    {
        $row = [];

        foreach ($validColumns as $col) {
            $row[$col] = $this->teamColumnValue($team, $col, $serialNumber);
        }

        return $row;
    }

    /**
     * @param  array<int, string>  $validColumns
     * @return array<string, mixed>
     */
    private function emptyTeamRowValues(array $validColumns): array
    {
        return array_fill_keys($validColumns, null);
    }

    /**
     * @return array<string, mixed>
     */
    private function memberRowValues(TeamMember $teamMember): array
    {
        if ($teamMember->member === null) {
            return $this->emptyMemberRowValues();
        }

        $member = $teamMember->member;

        return [
            'member_code' => $member->member_code,
            'member_pno' => $member->pno,
            'member_name' => $member->full_name,
            'member_father_name' => $member->father_name,
            'member_gender' => $this->genderLabel($member->gender),
            'member_rank' => $member->rank,
            'member_designation' => $member->designation,
            'member_mobile' => $member->mobile,
            'member_team_role' => $this->translatedValue($teamMember->role),
            'member_team_session' => $teamMember->session?->name,
            'member_joined_on' => $this->formatDate($teamMember->joined_on),
            'member_left_on' => $this->formatDate($teamMember->left_on),
            'member_category' => $this->translatedValue($member->player_category),
            'member_level' => $this->translatedValue($member->player_level),
            'member_status' => $this->translatedValue($member->current_status),
            'member_current_unit' => $member->currentUnit?->name,
            'member_posting_district' => $member->postingDistrict?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function coachRowValues(CoachAssignment $coachAssignment): array
    {
        if ($coachAssignment->coach === null) {
            return $this->emptyCoachRowValues();
        }

        $coach = $coachAssignment->coach;

        return [
            'coach_name' => $coach->full_name,
            'coach_pno' => $coach->pno,
            'coach_mobile' => $coach->mobile,
            'nis_certified' => $this->translateText($coach->nis_certified ? 'Yes' : 'No'),
            'coach_role' => $this->translatedValue($coachAssignment->role),
            'coach_session' => $coachAssignment->session?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyMemberRowValues(): array
    {
        return array_fill_keys(array_keys(self::MEMBER_COLUMN_LABELS), null);
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyCoachRowValues(): array
    {
        return array_fill_keys(array_keys(self::COACH_COLUMN_LABELS), null);
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

    private function genderLabel(?string $gender): ?string
    {
        if ($gender === null || trim($gender) === '') {
            return null;
        }

        return match (strtoupper($gender)) {
            'M', 'MALE' => $this->translateText('Male'),
            'F', 'FEMALE' => $this->translateText('Female'),
            'O', 'OTHER' => $this->translateText('Other'),
            default => $this->translatedValue($gender),
        };
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
