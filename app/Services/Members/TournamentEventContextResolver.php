<?php

declare(strict_types=1);

namespace App\Services\Members;

use App\Models\Event;
use App\Models\Member;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Services\Tournaments\TournamentEventPayload;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class TournamentEventContextResolver
{
    public function __construct(
        private readonly TournamentEventPayload $payload,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{
     *     tournament: Tournament,
     *     event: Event,
     *     tournament_created: bool,
     *     event_created: bool,
     * }
     */
    public function resolveOrCreate(Member $member, array $data, bool $createIfMissing = true): array
    {
        [$tournament, $tournamentCreated] = $this->resolveTournament($member, $data, $createIfMissing);
        $this->ensureTournamentSport($tournament, $data);
        $event = $this->resolveEvent($tournament, $data);

        if ($event !== null) {
            return [
                'tournament' => $tournament,
                'event' => $event,
                'tournament_created' => $tournamentCreated,
                'event_created' => false,
            ];
        }

        if (! $createIfMissing) {
            throw ValidationException::withMessages([
                'event_id' => __('Could not find a matching event in the selected tournament.'),
            ]);
        }

        $event = Event::create($this->eventData($tournament, $data));

        return [
            'tournament' => $tournament,
            'event' => $event,
            'tournament_created' => $tournamentCreated,
            'event_created' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: Tournament, 1: bool}
     */
    private function resolveTournament(Member $member, array $data, bool $createIfMissing): array
    {
        $orgId = (int) $member->organization_id;
        $tournamentId = (int) ($data['tournament_id'] ?? 0);

        if ($tournamentId > 0) {
            $tournament = Tournament::query()
                ->where('organization_id', $orgId)
                ->find($tournamentId);

            if ($tournament === null) {
                throw ValidationException::withMessages([
                    'tournament_id' => __('Selected tournament does not exist.'),
                ]);
            }

            return [$tournament, false];
        }

        $session = $this->resolveSession($member, $data, $createIfMissing);
        $tierId = (int) ($data['tier_id'] ?? 0);
        $normalizedName = $this->normalizeName((string) ($data['tournament_name'] ?? ''));
        $tournamentDateFrom = $this->normalizeDate($data['date_from'] ?? null);
        $tournamentDateTo = $this->normalizeDate($data['date_to'] ?? null);
        $venue = $this->normalizeName((string) ($data['venue'] ?? ''));
        $sportId = (int) Arr::get($data, 'sport_id', 0);

        $candidates = Tournament::query()
            ->with('sports:id')
            ->where('organization_id', $orgId)
            ->where('session_id', $session->id)
            ->where('tier_id', $tierId)
            ->with('sports:id,name')
            ->get();

        $matched = $candidates->filter(function (Tournament $tournament) use (
            $normalizedName,
            $tournamentDateFrom,
            $tournamentDateTo,
            $venue,
            $sportId,
        ): bool {
            $tournamentSportMatch = $sportId <= 0
                || (int) $tournament->sport_id === $sportId
                || $tournament->sports->pluck('id')->contains($sportId);

            return $this->normalizeName((string) $tournament->name) === $normalizedName
                && $this->normalizeDate($tournament->date_from) === $tournamentDateFrom
                && $this->normalizeDate($tournament->date_to) === $tournamentDateTo
                && $this->normalizeName((string) $tournament->venue) === $venue
                && $tournamentSportMatch;
        })->values();

        if ($matched->count() === 1) {
            return [$matched->first(), false];
        }

        if ($matched->count() > 1) {
            throw ValidationException::withMessages([
                'tournament_name' => __('Multiple tournaments match this context. Choose one from the list.'),
            ]);
        }

        if (! $createIfMissing) {
            throw ValidationException::withMessages([
                'tournament_id' => __('Could not find a matching tournament in the selected context.'),
            ]);
        }

        return [Tournament::create([
            'organization_id' => $orgId,
            'session_id' => $session->id,
            'tier_id' => $tierId,
            'sport_id' => $sportId > 0 ? $sportId : null,
            'name' => (string) ($data['tournament_name'] ?? ''),
            'venue' => (string) ($data['venue'] ?? ''),
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,
            'raw_date_text' => null,
        ]), true];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function ensureTournamentSport(Tournament $tournament, array $data): void
    {
        $sportId = (int) (Arr::get($data, 'event_sport_id') ?: Arr::get($data, 'sport_id', 0));

        if ($sportId <= 0) {
            return;
        }

        if ((int) ($tournament->sport_id ?? 0) <= 0) {
            $tournament->forceFill(['sport_id' => $sportId])->save();
        }

        $tournament->sports()->syncWithoutDetaching([$sportId]);
    }

    private function resolveSession(Member $member, array $data, bool $createIfMissing): SportSession
    {
        $orgId = (int) $member->organization_id;
        $sessionId = (int) ($data['session_id'] ?? 0);

        $existing = $sessionId > 0
            ? SportSession::query()
                ->where('organization_id', $orgId)
                ->find($sessionId)
            : null;

        if ($existing !== null) {
            return $existing;
        }

        if (! $createIfMissing) {
            throw ValidationException::withMessages([
                'session_id' => __('Could not find a matching session in the selected context.'),
            ]);
        }

        $sessionName = trim((string) ($data['session_name'] ?? ''));
        if ($sessionName === '') {
            throw ValidationException::withMessages([
                'session_name' => __('Session name is required when session is not selected.'),
            ]);
        }

        $normalizedSessionName = $this->normalizeName($sessionName);
        if ($normalizedSessionName === '') {
            throw ValidationException::withMessages([
                'session_name' => __('Session name is required when session is not selected.'),
            ]);
        }

        $existing = SportSession::query()
            ->where('organization_id', $orgId)
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedSessionName])
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        [$startYear, $endYear] = $this->resolveSessionYears($data, $sessionName);

        return SportSession::create([
            'organization_id' => $orgId,
            'name' => $sessionName,
            'start_year' => $startYear,
            'end_year' => $endYear,
            'is_current' => false,
        ]);
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function resolveSessionYears(array $data, string $sessionName): array
    {
        $startYear = (int) ($data['session_start_year'] ?? 0);
        $endYear = (int) ($data['session_end_year'] ?? 0);

        if ($startYear > 0 && $endYear > 0) {
            return [$startYear, $endYear];
        }

        if (preg_match('/(\\d{4})(?:\\D(\\d{2,4}))?/', $sessionName, $matches) === 1) {
            $startYear = (int) $matches[1];
            $parsedEnd = (int) ($matches[2] ?? 0);
            if ($parsedEnd > 0) {
                if ($parsedEnd < 100) {
                    $parsedEnd += 2000;
                }
                $endYear = $parsedEnd >= $startYear ? $parsedEnd : ($startYear + 1);
            }
        }

        if ($startYear === 0) {
            $startYear = $this->extractYearFromDate($data['date_from'] ?? null)
                ?: $this->extractYearFromDate($data['date_to'] ?? null)
                ?: (int) now()->year;
        }

        if ($endYear === 0) {
            $endYear = $startYear;
        }

        if ($endYear < $startYear) {
            $endYear = $startYear;
        }

        return [$startYear, $endYear];
    }

    private function extractYearFromDate(mixed $value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^(\\d{4})-\\d{2}-\\d{2}$/', $trimmed, $matches) === 1) {
            return (int) $matches[1];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveEvent(Tournament $tournament, array $data): ?Event
    {
        $overrideEventId = (int) ($data['event_id'] ?? 0);
        $eventSportId = (int) (Arr::get($data, 'event_sport_id') ?: Arr::get($data, 'sport_id', 0));

        if ($eventSportId <= 0) {
            $eventSportId = (int) ($tournament->sport_id ?? 0);
        }

        if ($overrideEventId > 0) {
            $event = Event::query()
                ->where('tournament_id', $tournament->id)
                ->find($overrideEventId);

            if ($event === null) {
                throw ValidationException::withMessages([
                    'event_id' => __('Selected event does not belong to the selected tournament.'),
                ]);
            }

            return $event;
        }

        $normalizedName = $this->normalizeName((string) ($data['event_name'] ?? ''));
        $genderClass = (string) ($data['gender_class'] ?? '');
        $discipline = $this->normalizeName((string) ($data['discipline'] ?? ''));
        $weightCategory = $this->normalizeName((string) ($data['weight_category'] ?? ''));
        $eventType = (string) ($data['event_type'] ?? 'individual');
        $participantsRequired = $data['participants_required'] ?? null;
        $candidateEvents = Event::query()
            ->where('tournament_id', $tournament->id)
            ->when($eventSportId > 0, function ($query) use ($eventSportId): void {
                $query->where('sport_id', $eventSportId);
            })
            ->get();

        $matches = $candidateEvents->filter(function (Event $event) use (
            $normalizedName,
            $genderClass,
            $discipline,
            $weightCategory,
            $eventType,
            $participantsRequired,
        ): bool {
            return $this->normalizeName((string) $event->name) === $normalizedName
                && $event->gender_class === $genderClass
                && $this->normalizeName((string) $event->discipline) === $discipline
                && $this->normalizeName((string) $event->weight_category) === $weightCategory
                && $event->event_type === $eventType
                && (string) ($event->participants_required ?? '') === (string) ($participantsRequired ?? '');
        })->values();

        return $matches->count() === 1 ? $matches->first() : null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function eventData(Tournament $tournament, array $data): array
    {
        $eventSportId = (int) (Arr::get($data, 'event_sport_id') ?: Arr::get($data, 'sport_id') ?: $tournament->sport_id);

        if ($eventSportId <= 0) {
            throw ValidationException::withMessages([
                'event_sport_id' => __('Event sport is required before creating a new event.'),
            ]);
        }

        $payload = $this->payload->forStoreOrUpdate($tournament, [
            'event_mode' => 'provisional',
            'sport_id' => $eventSportId,
            'name' => (string) $data['event_name'],
            'discipline' => $data['discipline'] ?? null,
            'weight_category' => $data['weight_category'] ?? null,
            'event_type' => (string) $data['event_type'],
            'participants_required' => $data['participants_required'] ?? null,
            'gender_class' => $data['gender_class'] ?? 'OPEN',
            'provisional_reason' => $data['provisional_reason'] ?? null,
        ]);

        $payload['tournament_id'] = $tournament->id;

        return $payload;
    }

    private function normalizeName(string $value): string
    {
        $normalized = preg_replace('/\s+/u', ' ', trim($value));

        return strtolower($normalized !== null ? $normalized : '');
    }

    private function normalizeDate(mixed $value): ?string
    {
        if ($value === null || (is_string($value) && trim($value) === '')) {
            return null;
        }

        return is_string($value)
            ? trim($value)
            : ($value instanceof \DateTimeInterface ? $value->format('Y-m-d') : null);
    }
}
