<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoach;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExternalCoachPerformanceUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user('external_coach') !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'external_coaching_assignment_id' => ['required', 'integer'],
            'update_date' => ['required', 'date'],
            'performance_level' => ['nullable', 'string', Rule::in(['improving', 'stable', 'needs_attention', 'excellent'])],
            'performance_score' => ['nullable', 'integer', 'min:1', 'max:10'],
            'training_summary' => ['required', 'string', 'max:3000'],
            'improvement_notes' => ['nullable', 'string', 'max:3000'],
            'injury_or_fitness_notes' => ['nullable', 'string', 'max:3000'],
            'next_focus' => ['nullable', 'string', 'max:3000'],
        ];
    }
}
