<?php

declare(strict_types=1);

namespace App\Support\TrainingVenues;

use Illuminate\Http\Request;

/**
 * The training venue listing filters, parsed once from `filter[...]` query
 * params. Anything malformed becomes null instead of an error.
 */
final readonly class VenueFilters
{
    public function __construct(
        public ?string $status = null,
        public ?string $search = null,
        public ?string $city = null,
        public ?string $state = null,
        public ?int $coachId = null,
        public ?int $sportId = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        return new self(
            status: self::text($filters['status'] ?? null),
            search: self::text($filters['q'] ?? null),
            city: self::text($filters['city'] ?? null),
            state: self::text($filters['state'] ?? null),
            coachId: self::id($filters['coach_id'] ?? null),
            sportId: self::id($filters['sport_id'] ?? null),
        );
    }

    /**
     * The filter state as the listing page receives it.
     *
     * @return array{q: ?string, status: ?string, city: ?string, state: ?string, coach_id: ?string, sport_id: ?string}
     */
    public function toArray(): array
    {
        return [
            'q' => $this->search,
            'status' => $this->status,
            'city' => $this->city,
            'state' => $this->state,
            'coach_id' => $this->coachId === null ? null : (string) $this->coachId,
            'sport_id' => $this->sportId === null ? null : (string) $this->sportId,
        ];
    }

    private static function text(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' || $value === 'all' ? null : $value;
    }

    private static function id(mixed $value): ?int
    {
        return is_string($value) && ctype_digit($value) && (int) $value > 0 ? (int) $value : null;
    }
}
