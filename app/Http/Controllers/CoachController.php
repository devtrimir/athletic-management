<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachRequest;
use App\Http\Requests\Coaches\UpdateCoachRequest;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachCertification;
use App\Models\District;
use App\Models\NisMaster;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Support\Coaches\CoachProfileData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CoachController extends Controller
{
    /** @var list<string> */
    private const DEFAULT_PRINT_COLUMNS = [
        'serial_number',
        'coach',
        'pno',
        'blood_group',
        'gender',
        'sports',
        'current_assignments',
        'unit_district',
        'mobile',
    ];

    /** @var array<string, string> */
    private const PRINT_COLUMN_LABELS = [
        'serial_number' => 'S.No.',
        'coach' => 'Coach',
        'pno' => 'PNO',
        'blood_group' => 'Blood Group',
        'gender' => 'Gender',
        'sports' => 'Playable Sport',
        'current_assignments' => 'Current team names',
        'unit_district' => 'Posting',
        'mobile' => 'Mobile Number',
        'display_name' => 'Display Name',
        'email' => 'Email',
        'coach_status' => 'Status',
        'certifications' => 'Certifications',
        'assignment_history_count' => 'Assignment History Count',
        'linked_member' => 'Linked Member Code',
    ];

    private const PRINT_GENDER_LABELS = [
        'M' => 'Male',
        'F' => 'Female',
        'O' => 'Other gender',
    ];

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeSportPayloadValues(array $row): array
    {
        return [
            'is_primary' => (bool) ($row['is_primary'] ?? false),
            'level_master_id' => isset($row['level_master_id']) && is_numeric($row['level_master_id']) ? (int) $row['level_master_id'] : null,
            'level' => ($row['level'] ?? null) !== '' ? $row['level'] ?? null : null,
            'sport_event' => ($row['sport_event'] ?? null) !== '' ? $row['sport_event'] ?? null : null,
            'effective_from' => ($row['effective_from'] ?? null) !== '' ? $row['effective_from'] ?? null : null,
            'effective_to' => ($row['effective_to'] ?? null) !== '' ? $row['effective_to'] ?? null : null,
            'notes' => ($row['notes'] ?? null) !== '' ? $row['notes'] ?? null : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function buildSyncPayload(array $rows): array
    {
        $payload = [];

        foreach ($rows as $row) {
            if (! is_array($row) || ! isset($row['sport_id'])) {
                continue;
            }

            $sportId = (int) $row['sport_id'];
            $payload[$sportId] = $this->normalizeSportPayloadValues($row);
        }

        return $payload;
    }

    /**
     * @param  list<int>  $sportIds
     * @return Collection<int, array{sport_id:int,sport_name:string,teams:list<string>,message:string}>
     */
    private function protectedSportsForCoach(Coach $coach, array $sportIds): Collection
    {
        if ($sportIds === []) {
            return collect();
        }

        return CoachAssignment::query()
            ->whereBelongsTo($coach)
            ->whereHas('team', fn (Builder $query) => $query->whereIn('sport_id', $sportIds))
            ->with(['team:id,name,sport_id', 'team.sport:id,name'])
            ->get()
            ->groupBy(fn (CoachAssignment $assignment): int => (int) $assignment->team->sport_id)
            ->map(function (Collection $assignments, int $sportId): array {
                $teams = $assignments
                    ->map(fn (CoachAssignment $assignment): ?string => $assignment->team?->name)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $sportName = (string) ($assignments->first()?->team?->sport?->name ?? __('Selected sport'));

                return [
                    'sport_id' => $sportId,
                    'sport_name' => $sportName,
                    'teams' => $teams,
                    'message' => __('This specialization is already used in team assignments for :teams and cannot be changed.', [
                        'teams' => implode(', ', $teams),
                    ]),
                ];
            })
            ->values();
    }

    /**
     * Prevent detaching or mutating protected sport specializations that are already used by team assignments.
     *
     * @param  array<int, array<string, mixed>>  $sportsRows
     */
    private function ensureProtectedSportsRemainUnchanged(Coach $coach, array $sportsRows): void
    {
        $existingSports = $coach->sports()
            ->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes'])
            ->get()
            ->mapWithKeys(fn (Sport $sport): array => [
                $sport->id => $this->normalizeSportPayloadValues([
                    'is_primary' => $sport->pivot?->is_primary,
                    'level_master_id' => $sport->pivot?->level_master_id,
                    'level' => $sport->pivot?->level,
                    'sport_event' => $sport->pivot?->sport_event,
                    'effective_from' => $sport->pivot?->effective_from?->toDateString(),
                    'effective_to' => $sport->pivot?->effective_to?->toDateString(),
                    'notes' => $sport->pivot?->notes,
                ]),
            ]);

        $incomingSports = collect($this->buildSyncPayload($sportsRows));

        $candidateSportIds = $existingSports
            ->keys()
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        $protectedSports = $this->protectedSportsForCoach($coach, $candidateSportIds)->keyBy('sport_id');

        if ($protectedSports->isEmpty()) {
            return;
        }

        $blocked = $protectedSports->filter(function (array $protectedSport, int $sportId) use ($existingSports, $incomingSports): bool {
            $incoming = $incomingSports->get($sportId);

            if ($incoming === null) {
                return true;
            }

            return $incoming !== $existingSports->get($sportId);
        })->values();

        if ($blocked->isEmpty()) {
            return;
        }

        throw ValidationException::withMessages([
            'sports' => $blocked
                ->pluck('message')
                ->all(),
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function normalizeCertifications(array $rows): Collection
    {
        return collect($rows)
            ->filter(fn (array $row): bool => trim((string) ($row['name'] ?? '')) !== '')
            ->map(fn (array $row): array => [
                'id' => isset($row['id']) && is_numeric($row['id']) ? (int) $row['id'] : null,
                'name' => (string) $row['name'],
                'certificate_type' => $row['certificate_type'] ?? null,
                'issuer' => $row['issuer'] ?? null,
                'issued_at' => $row['issued_at'] ?? null,
                'expired_at' => $row['expired_at'] ?? null,
                'attachment_path' => $row['attachment_path'] ?? null,
                'metadata' => $row['metadata'] ?? null,
            ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function syncCertifications(Coach $coach, array $rows): void
    {
        $certifications = $this->normalizeCertifications($rows);

        if ($certifications->isEmpty()) {
            $coach->certifications()->delete();

            return;
        }

        $incomingIds = $certifications
            ->pluck('id')
            ->filter(fn ($id): bool => is_int($id))
            ->values()
            ->all();

        $coach->certifications()->when(
            ! empty($incomingIds),
            fn ($q) => $q->whereNotIn('id', $incomingIds),
            fn ($q) => $q->delete(),
        );

        $coach->certifications()->whereNotIn('id', $incomingIds)->delete();

        foreach ($certifications as $payload) {
            if ($payload['id'] !== null) {
                $coach->certifications()
                    ->where('id', (int) $payload['id'])
                    ->update(array_filter($payload, static fn (mixed $value, string $key): bool => $key !== 'id', ARRAY_FILTER_USE_BOTH));
            } else {
                $coach->certifications()->create(array_filter($payload, static fn (mixed $value, string $key): bool => $key !== 'id', ARRAY_FILTER_USE_BOTH));
            }
        }
    }

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Coach::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusScope = $this->statusScopeFromFilters($filters);

        $coaches = $this->listingQuery($statusScope)
            ->withCount(['assignmentHistory as assignments_count' => fn ($q) => $q->current()])
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('coaches/index', [
            'coaches' => $coaches,
            'filters' => [
                'status_scope' => $statusScope,
                ...$filters,
            ],
            'activeCoachCount' => $this->coachStatusScopeQuery('active')->count(),
            'inactiveCoachCount' => $this->coachStatusScopeQuery('inactive')->count(),
            'sports' => Sport::select(['id', 'name', 'name_en'])
                ->where('organization_id', $request->user()->organization_id)
                ->orderBy('name')
                ->get(),
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'certificateTypes' => CoachCertification::query()
                ->whereHas('coach', fn (Builder $query) => $query->where('organization_id', $request->user()->organization_id))
                ->whereNotNull('certificate_type')
                ->where('certificate_type', '!=', '')
                ->distinct()
                ->pluck('certificate_type')
                ->concat(NisMaster::query()->active()->ordered()->pluck('name'))
                ->filter()
                ->unique()
                ->sort()
                ->values(),
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function print(Request $request): HttpResponse
    {
        Gate::authorize('viewAny', Coach::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusScope = $this->statusScopeFromFilters($filters);
        $columns = $this->selectedPrintColumns($request->query('columns', self::DEFAULT_PRINT_COLUMNS));
        $orientation = $request->query('orientation') === 'portrait' ? 'portrait' : 'landscape';
        $sportsById = Sport::query()
            ->where('organization_id', $request->user()->organization_id)
            ->pluck('name', 'id')
            ->all();

        $coaches = $this->listingQuery($statusScope)
            ->with([
                'member:id,member_code',
                'certifications:id,coach_id,name,certificate_type',
                'currentAssignments:id,coach_id,team_id,session_id,role,assigned_at',
                'currentAssignments.team:id,name,sport_id,session_id',
                'currentAssignments.team.sport:id,name',
                'currentAssignments.session:id,name',
            ])
            ->withCount(['assignmentHistory as assignments_count' => fn ($q) => $q->current()])
            ->get()
            ->unique('id')
            ->values();

        return response($this->buildPrintHtml($coaches, $sportsById, $columns, $filters, $statusScope, $orientation));
    }

    private function listingQuery(string $statusScope): QueryBuilder
    {
        return QueryBuilder::for($this->coachStatusScopeQuery($statusScope))
            ->allowedFilters([
                AllowedFilter::callback('status_scope', fn (Builder $query, mixed $value): Builder => $this->filterByStatusScope($query, (string) $value)),
                AllowedFilter::exact('blood_group'),
                AllowedFilter::exact('gender'),
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
                AllowedFilter::callback('sport_id', function (Builder $query, mixed $value) use ($statusScope): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $sportId = (int) $value;

                    if ($statusScope === 'inactive') {
                        $query->whereHas('sports', fn (Builder $q) => $q->where('sports.id', $sportId));

                        return;
                    }

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
                    $term = '%'.mb_strtolower(trim((string) $value)).'%';

                    $query->where(function (Builder $q) use ($term): void {
                        $q->whereRaw('LOWER(full_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(display_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(pno, \'\')) LIKE ?', [$term])
                            ->orWhereHas('aliases', fn (Builder $aliasQuery) => $aliasQuery->whereRaw('LOWER(alias) LIKE ?', [$term]));
                    });
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'coach_status', 'created_at'])
            ->defaultSort('full_name')
            ->with([
                'district:id,name',
                'unit:id,name',
                'rankMaster:id,code,name,short_name',
                'nisMaster:id,kind,code,name,short_name',
                'sports' => fn ($q) => $q
                    ->select('sports.id', 'sports.name', 'sports.name_en')
                    ->withPivot([
                        'is_primary',
                        'level_master_id',
                        'level',
                        'sport_event',
                        'effective_from',
                        'effective_to',
                        'notes',
                    ]),
                'currentAssignments' => fn ($q) => $q
                    ->select(['id', 'team_id', 'coach_id', 'session_id', 'role', 'assigned_at'])
                    ->with([
                        'team:id,name,sport_id,session_id,location_type,district_id,unit_id',
                        'team.sport:id,name',
                        'team.session:id,name',
                        'session:id,name',
                    ])
                    ->latest('assigned_at'),
            ]);
    }

    /**
     * @return list<string>
     */
    private function selectedPrintColumns(mixed $columns): array
    {
        $requested = is_array($columns) ? $columns : self::DEFAULT_PRINT_COLUMNS;
        $requested = array_values(array_filter(array_unique($requested), 'is_string'));
        $valid = array_values(array_intersect($requested, array_keys(self::PRINT_COLUMN_LABELS)));

        return $valid === [] ? self::DEFAULT_PRINT_COLUMNS : $valid;
    }

    /**
     * @param  Collection<int, Coach>  $coaches
     * @param  list<string>  $columns
     * @param  array<string, mixed>  $filters
     */
    private function buildPrintHtml(Collection $coaches, array $sportsById, array $columns, array $filters, string $statusScope, string $orientation): string
    {
        return '<!DOCTYPE html><html><head>'
            .'<meta charset="utf-8">'
            .'<title>'.e(__('Coach Listing')).'</title>'
            .'<style>@page{size:A4 '.e($orientation).';margin:8mm}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;font-size:8px;line-height:1.25;padding:8px;color:#111}.watermark{position:fixed;top:50%;left:50%;width:520px;height:520px;transform:translate(-50%,-50%);object-fit:contain;opacity:.045;z-index:0}.print-content{position:relative;z-index:1}.letterhead{display:flex;align-items:center;gap:12px;border-bottom:2px solid #171717;padding:0 0 8px;margin:0 0 8px}.letterhead-logo{width:64px;height:64px;object-fit:contain;flex-shrink:0}.letterhead-spacer{width:64px;flex-shrink:0}.letterhead-body{min-width:0;flex:1;text-align:center}.letterhead-title{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.025em;color:#111}.letterhead-subtitle{font-size:11px;font-weight:600;text-transform:uppercase;margin-top:3px;color:#111}.letterhead-meta{font-size:9px;color:#404040;margin-top:3px}h1{font-size:14px;margin:0 0 7px;text-align:center}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #94a3b8;padding:2px 3px;vertical-align:middle;text-align:center;word-break:normal;overflow-wrap:anywhere;font-size:8px}.num{text-align:center;white-space:nowrap}.th-group{background:#1E3A8A;color:#fff;font-weight:600;vertical-align:middle;text-align:center}.outer-sno{width:1%;white-space:nowrap}.outer-sport{width:7%}.outer-team{width:18%}.outer-coaches{width:74%}.coach-head{display:grid;grid-template-columns:12fr 26fr 16fr 12fr 10fr 12fr;gap:4px;margin-top:3px;color:#dbeafe;font-size:7px;font-weight:600;text-align:center}.coach-head span{text-align:center}.inner{padding:0!important;vertical-align:middle}.inner-table{width:100%;border-collapse:collapse;table-layout:fixed}.inner-table td{border:1px solid #cbd5e1;padding:2px 3px;vertical-align:middle;text-align:center}.no-data{color:#64748b;font-style:italic;text-align:center}</style>'
            .'</head><body>'
            .'<img class="watermark" src="/logo.jpg" alt=""><div class="print-content">'
            .'<div class="letterhead">'
            .'<img class="letterhead-logo" src="/logo.jpg" alt="'.e(__('UP Police Sports Control Board (UPPSCB)')).'">'
            .'<div class="letterhead-body">'
            .'<div class="letterhead-title">'.e(__('UP Police Sports Control Board (UPPSCB)')).'</div>'
            .'<div class="letterhead-subtitle">'.e(__('Coach Listing Report')).'</div>'
            .'<div class="letterhead-meta">'.e(__('Official print preview')).'</div>'
            .'</div>'
            .'<div class="letterhead-spacer" aria-hidden="true"></div>'
            .'</div>'
            .'<h1>'.e(__('Coach Listing')).'</h1>'
            .'<table><thead>'.$this->buildPrintCoachTableHeader().'</thead><tbody>'.$this->buildPrintCoachTeamRows($coaches, $sportsById).'</tbody></table>'
            .'</div>'
            .'<script>window.onload=function(){window.print();}</script>'
            .'</body></html>';
    }

    private function buildPrintCoachTableHeader(): string
    {
        return '<tr>'
            .'<th class="th-group outer-sno">'.e(__('S.No.')).'</th>'
            .'<th class="th-group outer-sport">'.e(__('Sport')).'</th>'
            .'<th class="th-group outer-team">'.e(__('Team')).'</th>'
            .'<th class="th-group outer-coaches"><div>'.e(__('Coaches in team')).'</div><div class="coach-head"><span>'.e(__('Rank')).'</span><span>'.e(__('Name')).'</span><span>'.e(__('PNO')).'</span><span>'.e(__('Mobile')).'</span><span>'.e(__('Role')).'</span><span>'.e(__('Posting')).'</span></div></th>'
            .'</tr>';
    }

    /**
     * @param  array<int|string, string>  $sportsById
     */
    private function buildPrintCoachTeamRows(Collection $coaches, array $sportsById): string
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
                    'coaches' => [
                        [
                            'rank' => (string) ($coach->rankMaster?->name ?? $coach->rankMaster?->short_name ?? ''),
                            'full_name' => (string) $coach->full_name,
                            'pno' => (string) ($coach->pno ?? ''),
                            'mobile' => (string) ($coach->mobile ?? ''),
                            'role' => __('Inactive'),
                            'posting' => trim(implode(' - ', array_filter([$coach->unit?->name, $coach->district?->name]))),
                        ],
                    ],
                ]);

                continue;
            }

            $teamGrouped = $assignments
                ->unique(fn (CoachAssignment $assignment): int => (int) $assignment->id)
                ->groupBy(fn (CoachAssignment $assignment): string => (($assignment->team?->sport_id ?? 0).':'.($assignment->team?->id ?? 0)));

            foreach ($teamGrouped as $key => $rows) {
                $team = $rows->first()?->team;
                $rows = $rows->values();
                $teamName = (string) ($team?->name ?? __('Unspecified team'));
                $teamSportName = $team?->sport?->name;
                $teamSportId = $team?->sport_id;

                $sportName = (string) ($teamSportName !== null
                    ? $teamSportName
                    : ($teamSportId !== null && isset($sportsById[$teamSportId])
                        ? $sportsById[$teamSportId]
                        : __('Unspecified sport')));
                $groupKey = ($teamSportId ?? 0).':'.($team?->id ?? 0);

                $groupedCoaches = $rows->map(function (CoachAssignment $assignment) use ($coach, $coachRoleLabel): array {
                    return [
                        'id' => (string) $coach->id,
                        'rank' => (string) ($coach->rankMaster?->name ?? $coach->rankMaster?->short_name ?? ''),
                        'full_name' => (string) $coach->full_name,
                        'pno' => (string) ($coach->pno ?? ''),
                        'mobile' => (string) ($coach->mobile ?? ''),
                        'role' => $coachRoleLabel((string) ($assignment->role ?? '')),
                        'posting' => trim(implode(' - ', array_filter([$coach->unit?->name, $coach->district?->name]))),
                    ];
                })->toArray();

                $coachIds = [];
                $existingGroup = $groups->get($groupKey);

                if (is_array($existingGroup)) {
                    $groupedCoaches = array_merge($existingGroup['coaches'], $groupedCoaches);
                }

                $groupedCoaches = collect($groupedCoaches)->filter(function (array $coachData) use (&$coachIds): bool {
                    if (in_array($coachData['id'], $coachIds, true)) {
                        return false;
                    }

                    $coachIds[] = $coachData['id'];

                    return true;
                })->values()->toArray();

                $groups->put($groupKey, [
                    'sport' => $sportName,
                    'team' => $teamName,
                    'coaches' => $groupedCoaches,
                ]);
            }
        }

        if ($groups->isEmpty()) {
            return '<tr><td colspan="10">'.e(__('No coaches found for the selected filters.')).'</td></tr>';
        }

        $sortedGroups = $groups->sortBy([['sport', 'asc'], ['team', 'asc']])->values();

        return $sortedGroups
            ->map(function (array $group, int $groupIndex) use ($coachRoleOrder): string {
                $coachRows = collect($group['coaches'])
                    ->sortBy([
                        fn (array $coachData): int => $coachRoleOrder((string) $coachData['role']),
                        fn (array $coachData): string => (string) $coachData['rank'],
                    ])
                    ->values();

                $innerRows = $coachRows
                    ->map(function (array $coachData): string {
                        return '<tr>'
                            .'<td>'.e($coachData['rank']).'</td>'
                            .'<td>'.e($coachData['full_name']).'</td>'
                            .'<td>'.e($coachData['pno']).'</td>'
                            .'<td>'.e($coachData['mobile']).'</td>'
                            .'<td>'.e($coachData['role']).'</td>'
                            .'<td>'.e($coachData['posting']).'</td>'
                            .'</tr>';
                    })->implode('');

                $coachRowsHtml = '<table class="inner-table">'
                    .'<colgroup><col style="width:12%"><col style="width:26%"><col style="width:16%"><col style="width:12%"><col style="width:10%"><col style="width:12%"></colgroup>'
                    .'<tbody>'.$innerRows.'</tbody>'
                    .'</table>';

                return '<tr>'
                    .'<td class="num">'.e((string) ($groupIndex + 1)).'</td>'
                    .'<td>'.e($group['sport']).'</td>'
                    .'<td>'.e($group['team']).'</td>'
                    .'<td class="inner">'.$coachRowsHtml.'</td>'
                    .'</tr>';
            })
            ->implode('');
    }

    private function printColumnValue(Coach $coach, string $column, int $serialNumber): string
    {
        return match ($column) {
            'serial_number' => (string) $serialNumber,
            'coach' => $coach->full_name,
            'pno' => (string) ($coach->pno ?? ''),
            'gender' => self::PRINT_GENDER_LABELS[$coach->gender] ?? ($coach->gender ?? ''),
            'unit_district' => (string) ($coach->unit?->name ?? $coach->district?->name ?? ''),
            'current_assignments' => $coach->currentAssignments
                ->map(function (CoachAssignment $assignment): string {
                    $team = $assignment->team?->name ?? '';
                    $session = $assignment->session?->name
                        ?? $assignment->team?->session?->name
                        ?? '';
                    $role = (string) ($assignment->role ?? '');
                    $assignedAt = $assignment->assigned_at?->format('d-m-Y') ?? '';

                    return implode(' | ', array_filter([$team, $session, $role, $assignedAt]));
                })
                ->filter()
                ->join('; '),
            'linked_member' => (string) ($coach->member?->member_code ?? ''),
            'certifications' => $coach->certifications
                ->map(fn (CoachCertification $certification): string => trim(($certification->name ?? '').($certification->certificate_type ? ' ('.$certification->certificate_type.')' : '')))
                ->filter()
                ->join(', ') ?: __('None'),
            'sports' => $coach->sports
                ->map(function (Sport $sport): string {
                    $event = (string) ($sport->pivot?->sport_event ?? '');

                    return $event !== '' ? $sport->name.' ('.$event.')' : $sport->name;
                })
                ->filter()
                ->join(', '),
            'assignment_history_count' => (string) ($coach->assignments_count ?? 0),
            default => (string) ($coach->{$column} ?? ''),
        };
    }

    private function sportsPrintCells(Coach $coach): string
    {
        if ($coach->sports->isEmpty()) {
            return '<td></td><td></td>';
        }

        $values = $coach->sports->map(fn (Sport $sport): array => [
            'sport' => (string) $sport->name,
            'event' => (string) ($sport->pivot?->sport_event ?? ''),
        ]);

        return $this->printStackedCells($values, ['sport', 'event']);
    }

    private function currentAssignmentsPrintCells(Coach $coach): string
    {
        if ($coach->currentAssignments->isEmpty()) {
            return '<td class="no-data">'.e(__('Not assigned')).'</td><td></td><td></td><td></td>';
        }

        $values = $coach->currentAssignments->map(fn (CoachAssignment $assignment): array => [
            'team' => (string) ($assignment->team?->name ?? ''),
            'session' => (string) ($assignment->session?->name ?? $assignment->team?->session?->name ?? ''),
            'role' => (string) ($assignment->role ?? ''),
            'assigned_at' => (string) ($assignment->assigned_at?->format('d-m-Y') ?? ''),
        ]);

        return $this->printStackedCells($values, ['team', 'session', 'role', 'assigned_at']);
    }

    /**
     * @param  Collection<int, array<string, string>>  $values
     * @param  list<string>  $keys
     */
    private function printStackedCells(Collection $values, array $keys): string
    {
        return collect($keys)
            ->map(fn (string $key): string => '<td>'.$values
                ->map(fn (array $row): string => '<div class="line-item">'.e($row[$key] ?? '').'</div>')
                ->implode('').'</td>')
            ->implode('');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function printFilterText(array $filters, string $statusScope): string
    {
        $activeFilters = collect($filters)
            ->reject(fn (mixed $value, string $key): bool => $key === 'status_scope' || $value === null || $value === '')
            ->map(fn (mixed $value, string $key): string => str($key)->replace('_', ' ')->title()->toString().': '.(is_scalar($value) ? (string) $value : (json_encode($value) ?: '')))
            ->values();

        return $activeFilters->prepend($statusScope === 'inactive' ? __('Inactive coaches') : __('Active coaches'))->join(', ');
    }

    private function filterByStatusScope(Builder $query, string $value): Builder
    {
        return match ($value) {
            'inactive' => $query->whereDoesntHave('currentAssignments'),
            default => $query->whereHas('currentAssignments'),
        };
    }

    private function coachStatusScopeQuery(string $scope): Builder
    {
        $query = Coach::query();

        return $this->filterByStatusScope($query, $scope);
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

    public function create(Request $request): Response
    {
        Gate::authorize('create', Coach::class);

        return Inertia::render('coaches/create', [
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function store(StoreCoachRequest $request): RedirectResponse
    {
        Gate::authorize('create', Coach::class);

        $payload = $request->validated();

        $coach = DB::transaction(function () use ($request, $payload): Coach {
            $payload['organization_id'] = (int) $request->user()->organization_id;
            $payload['display_name'] = $payload['full_name'];
            $payload['coach_status'] = $payload['coach_status'] ?? 'ACTIVE';

            /** @var Coach $coach */
            $coach = Coach::create(Arr::except($payload, ['certifications', 'sports']));

            if (array_key_exists('certifications', $payload)) {
                $this->syncCertifications($coach, (array) $payload['certifications']);
            }

            if (array_key_exists('sports', $payload)) {
                $coach->sports()->sync($this->buildSyncPayload((array) $payload['sports']));
            }

            return $coach;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach created.')]);

        return to_route('coaches.show', $coach);
    }

    public function show(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->overview($coach));
    }

    public function preview(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/print-preview', $profileData->print($coach));
    }

    public function edit(Coach $coach, Request $request): Response
    {
        Gate::authorize('update', $coach);

        return Inertia::render('coaches/edit', [
            'coach' => $coach,
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function update(UpdateCoachRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('update', $coach);

        $payload = $request->validated();
        $payload['display_name'] = (string) ($payload['full_name'] ?? $coach->full_name);
        if (array_key_exists('sports', $payload)) {
            $this->ensureProtectedSportsRemainUnchanged($coach, (array) $payload['sports']);
        }

        DB::transaction(function () use ($coach, $payload): void {
            $coach->update(Arr::except($payload, ['certifications', 'sports']));

            if (array_key_exists('certifications', $payload)) {
                $this->syncCertifications($coach, (array) $payload['certifications']);
            }

            if (array_key_exists('sports', $payload)) {
                $coach->sports()->sync($this->buildSyncPayload((array) $payload['sports']));
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach updated.')]);

        return to_route('coaches.show', $coach);
    }

    public function destroy(Coach $coach): RedirectResponse
    {
        Gate::authorize('delete', $coach);

        $coach->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach deleted.')]);

        return to_route('coaches.index');
    }
}
