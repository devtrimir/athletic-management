<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\SportSession;
use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TournamentExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'name_hi' => 'Tournament Name (Hindi)',
        'session' => 'Session',
        'tier' => 'Tier',
        'sport' => 'Sport',
        'venue' => 'Venue',
        'date_from' => 'Date From',
        'date_to' => 'Date To',
        'events_count' => 'Events',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Tournament::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        if (! empty($ids)) {
            $tournaments = Tournament::whereIn('id', array_map('intval', $ids))
                ->withCount('events')
                ->with(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name_hi,name_en'])
                ->orderBy('name_hi')
                ->get();
        } else {
            $tournaments = QueryBuilder::for(Tournament::class)
                ->allowedFilters([
                    AllowedFilter::exact('session_id'),
                    AllowedFilter::exact('tier_id'),
                    AllowedFilter::exact('sport_id'),
                    AllowedFilter::partial('q', 'name_hi'),
                ])
                ->allowedSorts(['name_hi', 'date_from', 'created_at'])
                ->defaultSort('-date_from')
                ->withCount('events')
                ->with(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name_hi,name_en'])
                ->when(
                    ! $request->has('filter.session_id') && $defaultSessionId,
                    fn ($q) => $q->where('session_id', $defaultSessionId)
                )
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $tournaments->map(function (Tournament $tournament) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'session' => $tournament->session?->name,
                    'tier' => $tournament->tier?->label_hi ?? $tournament->tier?->code,
                    'sport' => $tournament->sport?->name_hi,
                    'date_from' => $tournament->date_from?->toDateString(),
                    'date_to' => $tournament->date_to?->toDateString(),
                    default => $tournament->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Tournaments'),
            'tournaments-'.now()->format('Y-m-d').'.xlsx',
        );
    }
}
