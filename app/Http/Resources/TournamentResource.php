<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'name_hi' => $this->name_hi,
            'venue' => $this->venue,
            'date_from' => $this->date_from?->toDateString(),
            'date_to' => $this->date_to?->toDateString(),
            'raw_date_text' => $this->raw_date_text,
            'events_count' => $this->whenCounted('events'),
            'session' => $this->whenLoaded('session', fn () => [
                'id' => $this->session->id,
                'name' => $this->session->name,
            ]),
            'tier' => $this->whenLoaded('tier', fn () => [
                'id' => $this->tier->id,
                'code' => $this->tier->code,
                'label_hi' => $this->tier->label_hi,
            ]),
            'sport' => $this->whenLoaded('sport', fn () => $this->sport ? [
                'id' => $this->sport->id,
                'name' => $this->sport->name,
            ] : null),
        ];
    }
}
