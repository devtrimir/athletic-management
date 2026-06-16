<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamRequest extends FormRequest
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
        $locationType = $this->input('location_type');

        return [
            'sport_id' => ['required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'session_id' => ['required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'location_type' => ['required', 'string', Rule::in(['unit', 'district'])],
            'unit_id' => [
                'nullable',
                'integer',
                Rule::requiredIf($locationType === 'unit'),
                Rule::prohibitedIf($locationType === 'district'),
                Rule::exists('units', 'id')->where('organization_id', $orgId),
                function (string $attribute, mixed $value, \Closure $fail) use ($locationType, $orgId): void {
                    if ($locationType !== 'unit' || $value === null) {
                        return;
                    }

                    $districtId = Unit::query()
                        ->where('organization_id', $orgId)
                        ->whereKey((int) $value)
                        ->value('district_id');

                    if ($districtId === null) {
                        $fail(__('The selected unit must belong to a district.'));
                    }
                },
            ],
            'district_id' => [
                Rule::excludeIf($locationType === 'unit'),
                'nullable',
                'integer',
                Rule::requiredIf($locationType === 'district'),
                Rule::exists('districts', 'id'),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('teams', 'name')
                    ->where('organization_id', $orgId)
                    ->where('sport_id', (int) $this->input('sport_id'))
                    ->where('location_type', (string) $locationType)
                    ->where(
                        $locationType === 'unit' ? 'unit_id' : 'district_id',
                        (int) ($locationType === 'unit' ? $this->input('unit_id') : $this->input('district_id'))
                    ),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
