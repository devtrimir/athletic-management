<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\AchievementHistoryReport;
use App\Services\Reports\MedalsByMemberReport;
use App\Services\Reports\MedalTallyReport;
use App\Services\Reports\NewJoinersReport;
use App\Services\Reports\PlayerLevelSummaryReport;
use App\Services\Reports\ResignationDismissalLogReport;
use App\Services\Reports\TeamRosterReport;
use App\Services\Reports\UnitHeadcountReport;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

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

        return Inertia::render('reports/show', [
            'report' => ['key' => $key, ...self::REPORTS[$key]],
            'data' => $data,
            'filters' => $filters,
            ...$this->filterOptions($orgId),
        ]);
    }

    /**
     * @return array<string, int|string|null>
     */
    private function buildFilters(Request $request, string $key): array
    {
        $base = $request->validate([
            'session_id' => ['nullable', 'integer'],
            'sport_id' => ['nullable', 'integer'],
            'unit_id' => ['nullable', 'integer'],
            'tier_id' => ['nullable', 'integer'],
        ]);

        $filters = [
            'session_id' => isset($base['session_id']) ? (int) $base['session_id'] : null,
            'sport_id' => isset($base['sport_id']) ? (int) $base['sport_id'] : null,
            'unit_id' => isset($base['unit_id']) ? (int) $base['unit_id'] : null,
            'tier_id' => isset($base['tier_id']) ? (int) $base['tier_id'] : null,
        ];

        if ($key === 'medals-by-member') {
            $extra = $request->validate(['limit' => ['nullable', 'integer', 'min:1', 'max:500']]);
            $filters['limit'] = isset($extra['limit']) ? (int) $extra['limit'] : 50;
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
            'new-joiners' => $this->newJoiners->run($orgId, $filters),
            'achievement-history' => $this->achievementHistory->run($orgId, $filters),
        };
    }

    /**
     * @return array{sessions: Collection, sports: Collection, tiers: Collection, units: Collection}
     */
    private function filterOptions(int $orgId): array
    {
        return [
            'sessions' => SportSession::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get(),
            'sports' => Sport::select(['id', 'name_hi'])
                ->orderBy('name_hi')
                ->get(),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi'])
                ->orderByDesc('weight')
                ->get(),
            'units' => Unit::select(['id', 'name_hi'])
                ->where('organization_id', $orgId)
                ->orderBy('name_hi')
                ->get(),
        ];
    }
}
