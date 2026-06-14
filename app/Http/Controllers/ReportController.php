<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Jobs\ExportReportJob;
use App\Models\District;
use App\Models\Member;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Performance\MemberPerformanceService;
use App\Services\Performance\PlayerPointsService;
use App\Services\Reports\AchievementHistoryReport;
use App\Services\Reports\MedalsByMemberReport;
use App\Services\Reports\MedalTallyReport;
use App\Services\Reports\NewJoinersReport;
use App\Services\Reports\PlayerLevelSummaryReport;
use App\Services\Reports\PlayerPerformanceReport;
use App\Services\Reports\PlayerPerformanceReportPage;
use App\Services\Reports\ResignationDismissalLogReport;
use App\Services\Reports\TeamRosterReport;
use App\Services\Reports\UnitHeadcountReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    /** @var array<string, array{name_hi: string, name_en: string}> */
    private const REPORTS = [
        'medal-tally' => ['name_hi' => 'पदक तालिका',           'name_en' => 'Medal Tally'],
        'medals-by-member' => ['name_hi' => 'सदस्य द्वारा पदक',     'name_en' => 'Medals by Member'],
        'team-roster' => ['name_hi' => 'दल सूची',              'name_en' => 'Team Roster'],
        'resignation-dismissal-log' => ['name_hi' => 'त्याग/बर्खास्तगी लॉग', 'name_en' => 'Resignation / Dismissal Log'],
        'unit-headcount' => ['name_hi' => 'इकाई जनगणना',          'name_en' => 'Unit Headcount'],
        'player-level-summary' => ['name_hi' => 'खिलाड़ी स्तर सारांश',  'name_en' => 'Player Level Summary'],
        'player-performance-ranking' => ['name_hi' => 'खिलाड़ी प्रदर्शन रैंकिंग', 'name_en' => 'Player Performance Ranking'],
        'new-joiners' => ['name_hi' => 'नए शामिल सदस्य',       'name_en' => 'New Joiners'],
        'achievement-history' => ['name_hi' => 'उपलब्धि इतिहास',       'name_en' => 'Achievement History'],
    ];

    public function __construct(
        private readonly MedalTallyReport $medalTally,
        private readonly MedalsByMemberReport $medalsByMember,
        private readonly TeamRosterReport $teamRoster,
        private readonly ResignationDismissalLogReport $resignationDismissal,
        private readonly UnitHeadcountReport $unitHeadcount,
        private readonly PlayerLevelSummaryReport $playerLevelSummary,
        private readonly PlayerPerformanceReport $playerPerformance,
        private readonly PlayerPerformanceReportPage $playerPerformancePage,
        private readonly MemberPerformanceService $memberPerformance,
        private readonly NewJoinersReport $newJoiners,
        private readonly AchievementHistoryReport $achievementHistory,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $reports = array_map(
            static fn (string $key, array $meta) => ['key' => $key, ...$meta],
            array_keys(self::REPORTS),
            array_values(self::REPORTS),
        );

        return Inertia::render('reports/index', [
            'reports' => $reports,
        ]);
    }

    public function show(Request $request, string $key): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_unless(array_key_exists($key, self::REPORTS), 404);

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->buildFilters($request, $key);
        $data = $this->runService($key, $orgId, $filters);

        if ($key === 'achievement-history') {
            return Inertia::render('reports/achievement-history', [
                'report' => ['key' => $key, ...self::REPORTS[$key]],
                'data' => $data,
                'filters' => $filters,
                ...$this->filterOptions($orgId),
                'tournaments' => Tournament::select(['id', 'name', 'date_from'])
                    ->where('organization_id', $orgId)
                    ->whereNull('deleted_at')
                    ->orderByDesc('date_from')
                    ->get(),
            ]);
        }

        if ($key === 'player-performance-ranking') {
            return Inertia::render('reports/player-performance-ranking', [
                'report' => ['key' => $key, ...self::REPORTS[$key]],
                'data' => $this->playerPerformancePage->run($orgId, $filters),
                'filters' => $filters,
                'selected_members' => $this->selectedMembers($orgId, $filters),
                ...$this->filterOptions($orgId),
            ]);
        }

        return Inertia::render('reports/show', [
            'report' => ['key' => $key, ...self::REPORTS[$key]],
            'data' => $data,
            'filters' => $filters,
            ...$this->filterOptions($orgId),
        ]);
    }

    public function export(Request $request, string $key): BinaryFileResponse|JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_unless(array_key_exists($key, self::REPORTS), 404);

        $request->validate(['format' => ['required', 'string', 'in:xlsx']]);

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->buildFilters($request, $key);
        $data = $this->runService($key, $orgId, $filters);

        $title = self::REPORTS[$key]['name'];
        $filename = $key.'.xlsx';

        if ($data->count() > 500) {
            $uuid = (string) Str::uuid();
            Cache::put("export:{$uuid}", ['status' => 'queued'], now()->addMinutes(30));
            ExportReportJob::dispatch($uuid, $orgId, $key, $filters, $title);

            return response()->json(['status' => 'queued', 'job_id' => $uuid], 202);
        }

        /** @var array<int, string> $headings */
        $headings = $data->isNotEmpty() ? array_keys((array) $data->first()) : [];

        return Excel::download(new ReportExport($data, $headings, $title), $filename);
    }

    public function memberPerformanceDetail(Request $request, string $key, Member $member): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_unless($key === 'player-performance-ranking', 404);
        abort_unless((int) $request->user()->organization_id === (int) $member->organization_id, 404);

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->buildFilters($request, $key);

        return response()->json([
            'member' => [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'member_code' => $member->member_code,
                'pno' => $member->pno,
                'rank' => $member->rank,
            ],
            'performance' => $this->memberPerformance->run($orgId, (int) $member->id, $filters),
        ]);
    }

    public function playerPerformanceDrilldown(Request $request, string $key): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_unless($key === 'player-performance-ranking', 404);

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->buildFilters($request, $key);
        $validated = $request->validate([
            'dimension' => ['required', 'string', 'in:overall,session,sport,tier,district,unit,member'],
            'dimension_id' => ['nullable', 'integer'],
            'metric' => ['required', 'string', 'in:all,participations,achievements,awards,points,GOLD,SILVER,BRONZE,MERIT'],
            'member_id' => ['nullable', 'integer'],
        ]);

        $rows = $this->playerPerformancePageRows($orgId, $filters);
        $filtered = $rows
            ->when(($validated['dimension'] ?? 'overall') !== 'overall', function (Collection $collection) use ($validated): Collection {
                $dimension = (string) $validated['dimension'];
                $dimensionId = isset($validated['dimension_id']) ? (int) $validated['dimension_id'] : null;

                return $collection->filter(fn (array $row): bool => $this->dimensionIdForRow($row, $dimension) === $dimensionId);
            })
            ->when(isset($validated['member_id']), fn (Collection $collection) => $collection->filter(
                fn (array $row): bool => (int) data_get($row, 'member.id', 0) === (int) $validated['member_id']
            ))
            ->values();

        $metric = (string) $validated['metric'];

        $filtered = match ($metric) {
            'achievements' => $filtered->filter(fn (array $row): bool => data_get($row, 'achievement') !== null)->values(),
            'awards' => $filtered->filter(fn (array $row): bool => count((array) data_get($row, 'awards', [])) > 0)->values(),
            'GOLD', 'SILVER', 'BRONZE', 'MERIT' => $filtered->filter(
                fn (array $row): bool => data_get($row, 'achievement.medal_type') === $metric
            )->values(),
            default => $filtered,
        };

        return response()->json([
            'rows' => $filtered->all(),
            'summary' => [
                'count' => $filtered->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildFilters(Request $request, string $key): array
    {
        $base = $request->validate([
            'session_id' => ['nullable', 'integer'],
            'sport_id' => ['nullable', 'integer'],
            'unit_id' => ['nullable', 'integer'],
            'tier_id' => ['nullable', 'integer'],
            'session_ids' => ['nullable', 'array'],
            'session_ids.*' => ['integer', Rule::exists('sport_sessions', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'sport_ids' => ['nullable', 'array'],
            'sport_ids.*' => ['integer', Rule::exists('sports', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'tier_ids' => ['nullable', 'array'],
            'tier_ids.*' => ['integer', Rule::exists('tournament_tiers', 'id')],
            'unit_ids' => ['nullable', 'array'],
            'unit_ids.*' => ['integer', Rule::exists('units', 'id')->where('organization_id', (int) $request->user()->organization_id)],
            'district_ids' => ['nullable', 'array'],
            'district_ids.*' => ['integer', Rule::exists('districts', 'id')],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', (int) $request->user()->organization_id)],
        ]);

        $filters = [
            'session_id' => isset($base['session_id']) ? (int) $base['session_id'] : null,
            'sport_id' => isset($base['sport_id']) ? (int) $base['sport_id'] : null,
            'unit_id' => isset($base['unit_id']) ? (int) $base['unit_id'] : null,
            'tier_id' => isset($base['tier_id']) ? (int) $base['tier_id'] : null,
            'session_ids' => array_map('intval', $base['session_ids'] ?? []),
            'sport_ids' => array_map('intval', $base['sport_ids'] ?? []),
            'tier_ids' => array_map('intval', $base['tier_ids'] ?? []),
            'unit_ids' => array_map('intval', $base['unit_ids'] ?? []),
            'district_ids' => array_map('intval', $base['district_ids'] ?? []),
            'member_ids' => array_map('intval', $base['member_ids'] ?? []),
        ];

        if ($key === 'medals-by-member') {
            $extra = $request->validate(['limit' => ['nullable', 'integer', 'min:1', 'max:500']]);
            $filters['limit'] = isset($extra['limit']) ? (int) $extra['limit'] : 50;
        }

        if ($key === 'player-performance-ranking') {
            $extra = $request->validate([
                'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
                'page' => ['nullable', 'integer', 'min:1'],
                'member_name' => ['nullable', 'string', 'max:100'],
                'pno' => ['nullable', 'string', 'max:20'],
                'from_date' => ['nullable', 'date'],
                'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
                'group_by' => ['nullable', 'string', 'in:overall,session,sport,tier,district,unit,member'],
                'subgroup_by' => ['nullable', 'string', 'in:none,overall,session,sport,tier,district,unit,member'],
                'ranking_scope' => ['nullable', 'string', 'in:overall,within_group'],
            ]);
            $filters['limit'] = isset($extra['limit']) ? (int) $extra['limit'] : 50;
            $filters['page'] = isset($extra['page']) ? (int) $extra['page'] : 1;
            $filters['member_name'] = $extra['member_name'] ?? null;
            $filters['pno'] = $extra['pno'] ?? null;
            $filters['from_date'] = $extra['from_date'] ?? null;
            $filters['to_date'] = $extra['to_date'] ?? null;
            $filters['group_by'] = $extra['group_by'] ?? 'overall';
            $filters['subgroup_by'] = $extra['subgroup_by'] ?? 'none';
            $filters['ranking_scope'] = $extra['ranking_scope'] ?? 'within_group';
        }

        if (in_array($key, ['resignation-dismissal-log', 'new-joiners'], true)) {
            $extra = $request->validate([
                'from_date' => ['nullable', 'date', 'before_or_equal:today'],
                'to_date' => ['nullable', 'date'],
            ]);
            $filters['from_date'] = $extra['from_date'] ?? null;
            $filters['to_date'] = $extra['to_date'] ?? null;
        }

        if ($key === 'resignation-dismissal-log') {
            $extra = $request->validate(['status' => ['nullable', 'string', 'in:RESIGNED,DISMISSED']]);
            $filters['status'] = $extra['status'] ?? null;
        }

        if ($key === 'achievement-history') {
            $extra = $request->validate([
                'member_name' => ['nullable', 'string', 'max:100'],
                'pno' => ['nullable', 'string', 'max:20'],
                'tournament_id' => ['nullable', 'integer'],
                'event_name' => ['nullable', 'string', 'max:100'],
            ]);
            $filters['member_name'] = $extra['member_name'] ?? null;
            $filters['pno'] = $extra['pno'] ?? null;
            $filters['tournament_id'] = isset($extra['tournament_id']) ? (int) $extra['tournament_id'] : null;
            $filters['event_name'] = $extra['event_name'] ?? null;
        }

        return $filters;
    }

    private function runService(string $key, int $orgId, array $filters): Collection
    {
        return match ($key) {
            'medal-tally' => $this->medalTally->run($orgId, $filters),
            'medals-by-member' => $this->medalsByMember->run($orgId, $filters, (int) ($filters['limit'] ?? 50)),
            'team-roster' => $this->teamRoster->run($orgId, $filters),
            'resignation-dismissal-log' => $this->resignationDismissal->run(
                $orgId,
                $filters,
                $filters['from_date'] ?? null,
                $filters['to_date'] ?? null,
                $filters['status'] ?? null,
            ),
            'unit-headcount' => $this->unitHeadcount->run($orgId, $filters),
            'player-level-summary' => $this->playerLevelSummary->run($orgId, $filters),
            'player-performance-ranking' => $this->playerPerformance->run($orgId, $filters, (int) ($filters['limit'] ?? 50)),
            'new-joiners' => $this->newJoiners->run($orgId, $filters),
            'achievement-history' => $this->achievementHistory->run($orgId, $filters),
        };
    }

    /**
     * @return array{sessions: Collection, sports: Collection, tiers: Collection, units: Collection, districts: Collection}
     */
    private function filterOptions(int $orgId): array
    {
        return [
            'sessions' => SportSession::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get(),
            'sports' => Sport::select(['id', 'name'])
                ->orderBy('name')
                ->get(),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en'])
                ->orderByDesc('weight')
                ->get(),
            'units' => Unit::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get(),
            'districts' => District::select(['id', 'name'])
                ->orderBy('name')
                ->get(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function playerPerformancePageRows(int $orgId, array $filters): Collection
    {
        /** @var Collection<int, array<string, mixed>> $rows */
        $rows = app(PlayerPointsService::class)->run($orgId, $filters)['rows'];

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function selectedMembers(int $orgId, array $filters): Collection
    {
        $memberIds = $filters['member_ids'] ?? [];

        if (! is_array($memberIds) || $memberIds === []) {
            return collect();
        }

        return Member::query()
            ->where('organization_id', $orgId)
            ->whereIn('id', $memberIds)
            ->get(['id', 'member_code', 'pno', 'full_name', 'full_name', 'player_category', 'player_level', 'current_status']);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function dimensionIdForRow(array $row, string $dimension): ?int
    {
        return match ($dimension) {
            'session' => data_get($row, 'session.id'),
            'sport' => data_get($row, 'sport.id'),
            'tier' => data_get($row, 'tournament.tier.id'),
            'district' => data_get($row, 'member.district.id'),
            'unit' => data_get($row, 'member.unit.id'),
            'member' => data_get($row, 'member.id'),
            default => null,
        };
    }
}
