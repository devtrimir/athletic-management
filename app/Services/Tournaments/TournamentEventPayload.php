<?php

declare(strict_types=1);

namespace App\Services\Tournaments;

use App\Models\SportEventVariant;
use App\Models\Tournament;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class TournamentEventPayload
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function forStoreOrUpdate(Tournament $tournament, array $data): array
    {
        if (($data['event_mode'] ?? null) === 'official') {
            return $this->officialPayload($tournament, (int) $data['sport_event_variant_id'], $data);
        }

        return [
            'sport_id' => (int) $data['sport_id'],
            'sport_event_variant_id' => null,
            'name' => (string) $data['name'],
            'discipline' => Arr::get($data, 'discipline'),
            'weight_category' => Arr::get($data, 'weight_category'),
            'event_type' => Arr::get($data, 'event_type', 'individual'),
            'participants_required' => Arr::get($data, 'participants_required'),
            'gender_class' => (string) $data['gender_class'],
            'event_source' => 'manual',
            'provisional_reason' => (string) $data['provisional_reason'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function officialPayload(Tournament $tournament, int $variantId, array $data): array
    {
        $variant = SportEventVariant::query()
            ->with([
                'sport:id,organization_id',
                'sportEvent:id,name,discipline_type',
                'genderCategory:id,code',
                'weightCategory:id,name',
            ])
            ->findOrFail($variantId);

        if ((int) $variant->sport?->organization_id !== (int) $tournament->organization_id) {
            throw ValidationException::withMessages([
                'sport_event_variant_id' => __('The selected event is invalid.'),
            ]);
        }

        $eventType = Arr::get($data, 'event_type');
        $participantsRequired = Arr::get($data, 'participants_required');

        return [
            'sport_id' => $variant->sport_id,
            'sport_event_variant_id' => $variant->id,
            'event_type' => in_array($eventType, ['team', 'individual'], true)
                ? $eventType
                : ($variant->is_team_based ? 'team' : 'individual'),
            'participants_required' => is_numeric($participantsRequired)
                ? (int) $participantsRequired
                : $variant->min_participants,
            'name' => $variant->sportEvent?->name ?? $variant->name,
            'discipline' => $variant->sportEvent?->discipline_type,
            'weight_category' => $variant->weightCategory?->name,
            'gender_class' => $this->genderClass($variant->genderCategory?->code),
            'event_source' => 'official',
            'provisional_reason' => null,
        ];
    }

    private function genderClass(?string $code): string
    {
        return match ($code) {
            'MEN' => 'M',
            'WOMEN' => 'F',
            'MIXED' => 'MIXED',
            default => 'OPEN',
        };
    }
}
