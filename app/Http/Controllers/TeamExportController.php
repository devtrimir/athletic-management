<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\SportSession;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TeamExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'name_hi' => 'Team Name (Hindi)',
        'session' => 'Session',
        'sport' => 'Sport',
        'unit' => 'Unit',
        'in_charge_hi' => 'In-Charge',
        'players_count' => 'Players',
        'coaches_count' => 'Coaches',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Team::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        if (! empty($ids)) {
            $teams = Team::whereIn('id', array_map('intval', $ids))
                ->withCount(['teamMembers as players_count', 'coachAssignments as coaches_count'])
                ->with(['sport:id,name_hi,name_en', 'session:id,name', 'unit:id,name_hi'])
                ->orderBy('name_hi')
                ->get();
        } else {
            $teams = QueryBuilder::for(Team::class)
                ->allowedFilters([
                    AllowedFilter::exact('session_id'),
                    AllowedFilter::exact('sport_id'),
                    AllowedFilter::exact('unit_id'),
                    AllowedFilter::partial('q', 'name_hi'),
                ])
                ->allowedSorts(['name_hi', 'created_at'])
                ->defaultSort('name_hi')
                ->withCount(['teamMembers as players_count', 'coachAssignments as coaches_count'])
                ->with(['sport:id,name_hi,name_en', 'session:id,name', 'unit:id,name_hi'])
                ->when(
                    ! $request->has('filter.session_id') && $defaultSessionId,
                    fn ($q) => $q->where('session_id', $defaultSessionId)
                )
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $teams->map(function (Team $team) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'session' => $team->session?->name,
                    'sport' => $team->sport?->name_hi,
                    'unit' => $team->unit?->name_hi,
                    default => $team->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Teams'),
            'teams-'.now()->format('Y-m-d').'.xlsx',
        );
    }
}
