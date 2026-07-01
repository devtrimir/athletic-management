<?php

declare(strict_types=1);

namespace App\Http\Requests\Events;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('event_type') === '') {
            $this->merge(['event_type' => null]);
        }

        if ($this->input('participants_required') === '') {
            $this->merge(['participants_required' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;
        $isProvisional = $this->input('event_mode') === 'provisional';

        return [
            'event_mode' => ['required', Rule::in(['official', 'provisional'])],
            'sport_event_variant_id' => [Rule::requiredIf(! $isProvisional), 'nullable', 'integer', Rule::exists('sport_event_variants', 'id')],
            'sport_id' => [Rule::requiredIf($isProvisional), 'nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'name' => [Rule::requiredIf($isProvisional), 'nullable', 'string', 'max:255'],
            'event_type' => [Rule::requiredIf($isProvisional), 'nullable', Rule::in(['individual', 'team'])],
            'participants_required' => ['nullable', 'integer', 'min:1'],
            'discipline' => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class' => [Rule::requiredIf($isProvisional), 'nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'provisional_reason' => [Rule::requiredIf($isProvisional), 'nullable', 'string', 'max:1000'],
        ];
    }
}
