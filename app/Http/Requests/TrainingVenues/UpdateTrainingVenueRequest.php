<?php

declare(strict_types=1);

namespace App\Http\Requests\TrainingVenues;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTrainingVenueRequest extends FormRequest
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
        $trainingVenue = $this->route('training_venue');
        $trainingVenueId = is_object($trainingVenue) && method_exists($trainingVenue, 'getKey') ? $trainingVenue->getKey() : null;
        $isActive = $this->string('status')->toString() === 'active';

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('training_venues', 'code')->where('organization_id', $orgId)->ignore($trainingVenueId)],
            'address' => ['nullable', 'string', 'max:4000'],
            'district_id' => ['nullable', 'integer', Rule::exists('districts', 'id')],
            'unit_id' => ['nullable', 'integer', Rule::exists('units', 'id')->where('organization_id', $orgId)],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'latitude' => [Rule::requiredIf($isActive), 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => [Rule::requiredIf($isActive), 'nullable', 'numeric', 'between:-180,180'],
            'allowed_radius_meters' => ['required', 'integer', 'min:1', 'max:10000'],
            'status' => ['required', Rule::in(['active', 'inactive', 'under_review'])],
            'remarks' => ['nullable', 'string', 'max:4000'],
        ];
    }
}
