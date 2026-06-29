<?php

declare(strict_types=1);

namespace App\Http\Requests\Events;

use App\Models\Tournament;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;
        $isProvisional = $this->input('event_mode') === 'provisional';
        $isOfficial = $this->input('event_mode') === 'official';

        return [
            'event_mode' => ['required', Rule::in(['official', 'provisional'])],
            'sport_event_variant_id' => [Rule::requiredIf($isOfficial && ! $this->filled('sport_event_variant_ids')), 'nullable', 'integer', Rule::exists('sport_event_variants', 'id')],
            'sport_event_variant_ids' => [Rule::requiredIf($isOfficial && ! $this->filled('sport_event_variant_id')), 'nullable', 'array'],
            'sport_event_variant_ids.*' => ['integer', 'distinct', Rule::exists('sport_event_variants', 'id')],
            'sport_id' => [Rule::requiredIf($isProvisional), 'nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'name' => [Rule::requiredIf($isProvisional), 'nullable', 'string', 'max:255'],
            'discipline' => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class' => [Rule::requiredIf($isProvisional), 'nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'provisional_reason' => [Rule::requiredIf($isProvisional), 'nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->input('event_mode') !== 'official') {
                    return;
                }

                $tournament = $this->route('tournament');

                if (! $tournament instanceof Tournament) {
                    return;
                }

                $variantIds = collect($this->input('sport_event_variant_ids', []))
                    ->when(
                        $this->filled('sport_event_variant_id'),
                        fn ($ids) => $ids->push($this->input('sport_event_variant_id')),
                    )
                    ->filter()
                    ->map(fn ($id): int => (int) $id)
                    ->unique()
                    ->values();

                if ($variantIds->isEmpty()) {
                    return;
                }

                $existing = $tournament->events()
                    ->whereIn('sport_event_variant_id', $variantIds)
                    ->exists();

                if ($existing) {
                    $validator->errors()->add(
                        'sport_event_variant_ids',
                        __('One or more selected events have already been added to this tournament.'),
                    );
                }
            },
        ];
    }
}
