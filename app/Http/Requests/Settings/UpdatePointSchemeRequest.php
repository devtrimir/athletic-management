<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\GameLevel;
use App\Models\PointScheme;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePointSchemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('pointScheme')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'effective_from' => ['nullable', 'date'],
            'points' => ['required', 'array'],
        ];

        foreach (GameLevel::pluck('id') as $levelId) {
            foreach (PointScheme::RESULTS as $result) {
                $rules["points.$levelId.$result"] = ['required', 'integer', 'min:0', 'max:65535'];
            }
        }

        return $rules;
    }

    /**
     * Publishing needs a start date that is today or later and after every published version's start.
     *
     * @return array<string, mixed>
     */
    public function publishRules(): array
    {
        $latest = PointScheme::whereIn('status', [PointScheme::STATUS_ACTIVE, PointScheme::STATUS_RETIRED])->max('effective_from');

        return ['effective_from' => ['required', 'date', 'after_or_equal:today', Rule::when($latest !== null, ['after:'.$latest])]];
    }
}
