<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Member;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'pno' => 'PNO',
        'full_name' => 'Name',
        'father_name' => "Father's Name",
        'gender' => 'Gender',
        'dob' => 'Date of Birth',
        'rank' => 'Rank',
        'mobile' => 'Mobile',
        'current_status' => 'Status',
        'player_category' => 'Category',
        'player_level' => 'Level',
        'home_district' => 'Home District',
        'posting_district' => 'Posting',
        'joining_date' => 'Joining Date',
        'blood_group' => 'Blood Group',
        'caste' => 'Caste',
        'initial_rank' => 'Initial Rank',
        'playable_sports' => 'Playable Sports',
        'promotion_date' => 'Promotion Date',
        'team_since' => 'Team Since',
    ];

    private function playableSportsSummary(Member $member): ?string
    {
        $sports = $member->relationLoaded('playableSports') ? $member->playableSports : collect();

        if ($sports->isEmpty()) {
            return null;
        }

        return $sports->map(static function ($sport): string {
            $parts = array_filter([
                $sport->name,
                $sport->pivot?->role,
                $sport->pivot?->sport_event,
                $sport->pivot?->weight,
                $sport->pivot?->position,
                $sport->pivot?->notes,
            ]);

            return implode(' · ', $parts);
        })->implode(' | ');
    }

    private function formatDate(?CarbonInterface $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return $value->format('d M Y');
    }

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Member::class);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        [$validColumns, $headings, $rows] = $this->buildExportData($request, $columns);

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Members'),
            'members-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    /**
     * Render the member listing print view. Uses the same column contract and
     * filter handling as the Excel export, so print and export show the same
     * rows and columns for the same query.
     */
    public function print(Request $request): Response
    {
        Gate::authorize('viewAny', Member::class);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        [$validColumns, $headings, $rows] = $this->buildExportData($request, $columns);

        return Inertia::render('members/print', [
            'columns' => $validColumns,
            'headings' => array_values($headings),
            'rows' => $rows->values(),
            'reportMeta' => [
                'title' => 'Member Listing',
                'printedAt' => now()->timezone('Asia/Kolkata')->format('d M Y, h:i A').' IST',
            ],
        ]);
    }

    /**
     * Build the aligned export/print payload: validated column list, display
     * headings, and one row per selected member.
     *
     * @param  array<int, string>  $columns
     * @return array{0: array<int, string>, 1: array<int, string>, 2: Collection<int, array<string, mixed>>}
     */
    private function buildExportData(Request $request, array $columns): array
    {
        $members = $this->selectMembers($request);

        $validColumns = array_values(array_intersect($columns, array_keys(self::COLUMN_LABELS)));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $members->map(fn (Member $member) => $this->memberRow($member, $validColumns));

        return [$validColumns, $headings, $rows];
    }

    /**
     * Select members for export/print honoring the `ids` or `filter` query,
     * mirroring `MemberController::index`.
     *
     * @return Collection<int, Member>
     */
    private function selectMembers(Request $request): Collection
    {
        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        $baseQuery = Member::query();

        if (! empty($ids)) {
            return $baseQuery
                ->whereIn('id', array_map('intval', $ids))
                ->with(['currentUnit:id,name', 'homeDistrict:id,name', 'postingDistrict:id,name', 'playableSports'])
                ->orderBy('full_name')
                ->get();
        }

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $hasStatusScope = array_key_exists('status_scope', $filters);
        $hasCurrentStatus = array_key_exists('current_status', $filters);

        $baseQuery->when(
            ! $hasStatusScope && ! $hasCurrentStatus,
            fn ($query) => $query->rosterActive()
        );

        return QueryBuilder::for($baseQuery)
            ->allowedFilters([
                AllowedFilter::exact('player_category'),
                AllowedFilter::exact('player_level'),
                AllowedFilter::callback('status_scope', fn ($query, string $value): mixed => $this->filterByStatusScope($query, $value)),
                AllowedFilter::callback('current_status', fn ($query, string $value): mixed => $this->filterByCurrentStatus($query, $value)),
                AllowedFilter::exact('home_district_id'),
                AllowedFilter::exact('posting_district_id'),
                AllowedFilter::exact('current_unit_id'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('blood_group'),
                AllowedFilter::callback('sport_id', fn ($query, mixed $value): mixed => $this->filterByPlayableSports($query, $value)),
                AllowedFilter::callback('sport_ids', fn ($query, mixed $value): mixed => $this->filterByPlayableSports($query, $value)),
                AllowedFilter::callback('q', function ($query, string $value): void {
                    $query->where(function ($q) use ($value): void {
                        $q->where('full_name', 'LIKE', "%{$value}%")
                            ->orWhere('full_name_normalized', 'LIKE', "%{$value}%")
                            ->orWhere('pno', 'LIKE', "%{$value}%");
                    });
                }),
                AllowedFilter::callback('joining_year_from', function ($query, string $value): void {
                    $query->whereYear('joining_date', '>=', (int) $value);
                }),
                AllowedFilter::callback('joining_year_to', function ($query, string $value): void {
                    $query->whereYear('joining_date', '<=', (int) $value);
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'joining_date', 'created_at'])
            ->defaultSort('full_name')
            ->with(['currentUnit:id,name', 'homeDistrict:id,name', 'postingDistrict:id,name', 'playableSports'])
            ->get();
    }

    /**
     * Build one export/print row for a member using the given column keys.
     *
     * @param  array<int, string>  $validColumns
     * @return array<string, mixed>
     */
    private function memberRow(Member $member, array $validColumns): array
    {
        $row = [];
        foreach ($validColumns as $col) {
            $row[$col] = match ($col) {
                'home_district' => $member->homeDistrict?->name,
                'posting_district' => $member->postingDistrict?->name ?? $member->currentUnit?->name,
                'dob', 'joining_date', 'promotion_date', 'team_since' => $this->formatDate($member->{$col}),
                'playable_sports' => $this->playableSportsSummary($member),
                default => $member->{$col},
            };
        }

        return $row;
    }

    private function filterByPlayableSports(mixed $query, mixed $value): mixed
    {
        $sportIds = collect(Arr::wrap($value))
            ->flatMap(fn (mixed $item): array => is_string($item) ? explode(',', $item) : [$item])
            ->map(fn (mixed $item): int => (int) $item)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($sportIds->isEmpty()) {
            return $query;
        }

        return $query->whereHas(
            'playableSports',
            fn ($query) => $query->whereIn('sports.id', $sportIds->all()),
        );
    }

    private function filterByStatusScope(mixed $query, string $value): mixed
    {
        return match ($value) {
            'inactive' => $query->rosterInactive(),
            default => $query->rosterActive(),
        };
    }

    private function filterByCurrentStatus(mixed $query, string $value): mixed
    {
        return $value === 'ACTIVE'
            ? $query->rosterActive()
            : $query->where('current_status', $value);
    }

    public function show(Member $member, Request $request): BinaryFileResponse
    {
        Gate::authorize('view', $member);

        $member->load(['currentUnit:id,name', 'homeDistrict:id,name', 'postingDistrict:id,name', 'playableSports']);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));
        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = collect([[]])->map(function () use ($member, $validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'home_district' => $member->homeDistrict?->name,
                    'posting_district' => $member->postingDistrict?->name ?? $member->currentUnit?->name,
                    'dob', 'joining_date', 'promotion_date', 'team_since' => $this->formatDate($member->{$col}),
                    'playable_sports' => $this->playableSportsSummary($member),
                    default => $member->{$col},
                };
            }

            return $row;
        });

        $filename = 'member-'.$member->member_code.'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new ReportExport($rows, array_values($headings), $member->full_name),
            $filename,
        );
    }
}
