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
        'name' => 'Team Name',
        'session' => 'Session',
        'sport' => 'Sport',
        'location_type' => 'Location Type',
        'district' => 'District',
        'unit' => 'Unit',
        'is_active' => 'Status',
        'in_charge' => 'In-Charge',
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
                ->with(['sport:id,name', 'session:id,name', 'district:id,name', 'unit:id,name'])
                ->orderBy('name')
                ->get();
        } else {
            $teams = QueryBuilder::for(Team::class)
                ->allowedFilters([
                    AllowedFilter::exact('session_id'),
                    AllowedFilter::exact('sport_id'),
                    AllowedFilter::exact('district_id'),
                    AllowedFilter::exact('unit_id'),
                    AllowedFilter::exact('location_type'),
                    AllowedFilter::exact('is_active'),
                    AllowedFilter::partial('q', 'name'),
                ])
                ->allowedSorts(['name', 'created_at'])
                ->defaultSort('name')
                ->withCount(['teamMembers as players_count', 'coachAssignments as coaches_count'])
                ->with(['sport:id,name', 'session:id,name', 'district:id,name', 'unit:id,name'])
                ->when(
                    ! $request->has('filter.is_active'),
                    fn ($q) => $q->where('is_active', true)
                )
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
                    'sport' => $team->sport?->name,
                    'location_type' => $team->location_type,
                    'district' => $team->district?->name,
                    'unit' => $team->unit?->name,
                    'is_active' => $team->is_active ? 'Active' : 'Inactive',
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
