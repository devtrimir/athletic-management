<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoachPerformanceUpdates;

use App\Models\ExternalCoachPerformanceUpdate;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewExternalCoachPerformanceUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $update = $this->route('performance_update');

        return $update instanceof ExternalCoachPerformanceUpdate
            && $this->user()?->can('update', $update) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'string', Rule::in(['accept', 'reject', 'needs_correction', 'lock'])],
            'review_remarks' => [
                Rule::requiredIf(fn (): bool => in_array($this->input('action'), ['reject', 'needs_correction'], true)),
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }
}
