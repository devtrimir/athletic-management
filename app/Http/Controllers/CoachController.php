<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachRequest;
use App\Http\Requests\Coaches\UpdateCoachRequest;
use App\Http\Resources\CoachResource;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Designation;
use App\Models\District;
use App\Models\NisMaster;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\AuditLogBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $coaches = QueryBuilder::for(Coach::class)
            ->allowedFilters([
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

                    $query->whereHas('sports', fn (Builder $q) => $q->where('sports.id', (int) $value));
                }),
                AllowedFilter::callback('has_active_assignment', function (Builder $query, mixed $value): void {
                    if ($value === 'true' || $value === true) {
                        $query->whereHas('currentAssignments');
                    } elseif ($value === 'false' || $value === false) {
                        $query->whereDoesntHave('currentAssignments');
                    }
                }),
                AllowedFilter::callback('has_member', function (Builder $query, mixed $value): void {
                    if ($value === 'true' || $value === true) {
                        $query->whereNotNull('member_id');
                    } elseif ($value === 'false' || $value === false) {
                        $query->whereNull('member_id');
                    }
                }),
                AllowedFilter::callback('q', function (Builder $query, mixed $value): void {
                    $term = '%'.mb_strtolower(trim((string) $value)).'%';

                    $query->where(function (Builder $q) use ($term): void {
                        $q->whereRaw('LOWER(full_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(display_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(pno, \'\')) LIKE ?', [$term]);
                    });
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'coach_status', 'designation', 'created_at'])
            ->defaultSort('full_name')
            ->with([
                'member:id,member_code,full_name,pno,rank,mobile',
                'district:id,name',
                'unit:id,name',
            ])
            ->withCount(['assignmentHistory as assignments_count' => fn ($q) => $q->current()])
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('coaches/index', [
            'coaches' => $coaches,
            'filters' => $request->query('filter', []),
            'sports' => Sport::select(['id', 'name'])
                ->where('organization_id', $request->user()->organization_id)
                ->orderBy('name')
                ->get(),
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['id', 'code', 'name', 'short_name', 'mapped_rank_code']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'certificateTypes' => Coach::query()
                ->join('coach_certifications', 'coach_certifications.coach_id', '=', 'coaches.id')
                ->distinct()
                ->pluck('coach_certifications.certificate_type')
                ->filter()
                ->values(),
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'RETIRED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Coach::class);

        $sports = Sport::select(['id', 'name'])
            ->where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->get();

        return Inertia::render('coaches/create', [
            'sports' => $sports,
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['id', 'code', 'name', 'short_name', 'mapped_rank_code']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'RETIRED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function store(StoreCoachRequest $request): RedirectResponse
    {
        Gate::authorize('create', Coach::class);

        $payload = $request->validated();

        $coach = DB::transaction(function () use ($request, $payload): Coach {
            $payload['organization_id'] = (int) $request->user()->organization_id;
            $payload['display_name'] = $payload['display_name'] ?: $payload['full_name'];
            $payload['coach_status'] = $payload['coach_status'] ?? 'ACTIVE';
            $payload['designation'] = $payload['designation'] ?? null;

            /** @var Coach $coach */
            $coach = Coach::create(Arr::except($payload, ['certifications', 'sports']));

            $this->syncCertifications($coach, (array) ($payload['certifications'] ?? []));
            $coach->sports()->sync($this->buildSyncPayload((array) ($payload['sports'] ?? [])));

            return $coach;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach created.')]);

        return to_route('coaches.show', $coach);
    }

    public function show(Coach $coach, AuditLogBuilder $auditLogBuilder): Response
    {
        Gate::authorize('view', $coach);

        $coach->loadMissing([
            'district:id,name',
            'unit:id,name,district_id',
            'nisMaster:id,kind,code,name,short_name',
            'tierMaster:id,code,label_hi,label_en,weight',
            'rankMaster:id,code,name,short_name',
            'designationMaster:id,code,name,short_name',
            'member:id,member_code,full_name,pno,rank,designation,mobile,home_unit_id',
            'certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,metadata',
            'assignmentHistory' => fn ($q) => $q
                ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
                ->orderByDesc('is_current')
                ->orderByDesc('assigned_at')
                ->orderByDesc('id'),
            'sports' => fn ($q) => $q->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes']),
        ]);

        $coachResource = (new CoachResource($coach))->resolve();

        return Inertia::render('coaches/show', [
            'coach' => $coachResource,
            'coachTeams' => Inertia::defer(fn () => $coach->assignmentHistory
                ->map(fn (CoachAssignment $ca) => [
                    'id' => $ca->id,
                    'role' => $ca->role,
                    'is_current' => (bool) $ca->is_current,
                    'assigned_at' => $ca->assigned_at?->toDateTimeString(),
                    'removed_at' => $ca->removed_at?->toDateTimeString(),
                    'notes' => $ca->notes,
                    'team' => $ca->team ? ['id' => $ca->team->id, 'name' => $ca->team->name] : null,
                    'sport' => $ca->team?->sport ? ['id' => $ca->team->sport->id, 'name' => $ca->team->sport->name] : null,
                    'session' => $ca->session ? ['id' => $ca->session->id, 'name' => $ca->session->name] : null,
                ])),
            'auditLog' => Inertia::defer(fn () => $auditLogBuilder->forCoach($coach)),
        ]);
    }

    public function edit(Coach $coach, Request $request): Response
    {
        Gate::authorize('update', $coach);

        $sports = Sport::select(['id', 'name'])
            ->where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->get();

        $protectedSports = $this->protectedSportsForCoach(
            $coach,
            $coach->sports()->pluck('sports.id')->map(fn (mixed $id): int => (int) $id)->all(),
        );

        return Inertia::render('coaches/edit', [
            'coach' => $coach
                ->load('member:id,member_code,full_name,pno,rank,mobile,player_category,player_level,current_status')
                ->loadMissing([
                    'certifications',
                    'sports' => fn ($q) => $q->select('sports.id', 'sports.name')->withPivot([
                        'is_primary',
                        'level_master_id',
                        'level',
                        'sport_event',
                        'effective_from',
                        'effective_to',
                        'notes',
                    ]),
                    'assignmentHistory',
                ]),
            'sports' => $sports,
            'districts' => District::select(['id', 'name'])->orderBy('name')->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])->orderBy('name')->get(),
            'ranks' => Rank::active()->ordered()->get(['id', 'code', 'name', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['id', 'code', 'name', 'short_name', 'mapped_rank_code']),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en', 'weight'])->orderByDesc('weight')->get(),
            'nisMasters' => NisMaster::query()->active()->ordered()->get(),
            'protectedSports' => $protectedSports,
            'coachStatuses' => ['ACTIVE', 'INACTIVE', 'RETIRED'],
            'genders' => ['M', 'F', 'O'],
        ]);
    }

    public function update(UpdateCoachRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('update', $coach);

        $payload = $request->validated();
        $payload['display_name'] = $payload['display_name'] ?? $coach->full_name;
        $this->ensureProtectedSportsRemainUnchanged($coach, (array) ($payload['sports'] ?? []));

        DB::transaction(function () use ($coach, $payload): void {
            $coach->update(Arr::except($payload, ['certifications', 'sports']));
            $this->syncCertifications($coach, (array) ($payload['certifications'] ?? []));
            $coach->sports()->sync($this->buildSyncPayload((array) ($payload['sports'] ?? [])));
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
