<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoach;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Scopes\BelongsToOrganization;
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
        $coach = $this->user('external_coach');

        if (! $coach instanceof ExternalCoach) {
            return false;
        }

        $assignmentId = $this->integer('external_coaching_assignment_id');

        if ($assignmentId === 0) {
            return true;
        }

        return ExternalCoachingAssignment::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $coach->organization_id)
            ->where('external_coach_id', $coach->id)
            ->whereKey($assignmentId)
            ->exists();
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
