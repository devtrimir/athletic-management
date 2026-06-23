<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\MissingValue;

/**
 * Inertia prop shape for Tournament.
 *
 * @mixin Tournament
 */
class TournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'venue' => $this->venue,
            'date_from' => $this->date_from?->toDateString(),
            'date_to' => $this->date_to?->toDateString(),
            'raw_date_text' => $this->raw_date_text,
            'created_at' => $this->created_at?->toDateString(),
            'events_count' => $this->whenCounted('events'),
            'participants_count' => $this->countAttribute('participants_count'),
            'teams_count' => $this->countAttribute('teams_count'),
            'medals_count' => $this->countAttribute('medals_count'),
            'session' => $this->whenLoaded('session', fn () => [
                'id' => $this->session->id,
                'name' => $this->session->name,
            ]),
            'tier' => $this->whenLoaded('tier', fn () => [
                'id' => $this->tier->id,
                'code' => $this->tier->code,
                'label_hi' => $this->tier->label_hi,
                'label' => $this->tier->label,
            ]),
            'sport' => $this->whenLoaded('sport', fn () => $this->sport ? [
                'id' => $this->sport->id,
                'name' => $this->sport->name,
            ] : null),
        ];
    }

    private function countAttribute(string $key): mixed
    {
        if (array_key_exists($key, $this->resource->getAttributes())) {
            return (int) $this->resource->getAttribute($key);
        }

        return new MissingValue;
    }
}
