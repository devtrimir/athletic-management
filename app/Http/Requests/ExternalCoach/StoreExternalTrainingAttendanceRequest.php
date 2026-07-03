<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoach;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExternalTrainingAttendanceRequest extends FormRequest
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
            'attendance_date' => ['required', 'date'],
            'attendance_status' => ['required', 'string', Rule::in(['present', 'absent', 'late', 'excused'])],
            'coach_remarks' => ['nullable', 'string', 'max:2000'],
            'submitted_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'submitted_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'submitted_gps_accuracy' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'device_info' => ['nullable', 'array'],
            'browser_timezone' => ['nullable', 'string', 'max:100'],
            'submitted_photo_source' => [
                Rule::requiredIf(fn (): bool => $this->hasFile('submitted_photo')),
                'nullable',
                'string',
                'in:camera',
            ],
            'submitted_photo' => [
                Rule::requiredIf(fn (): bool => in_array($this->string('attendance_status')->toString(), ['present', 'late'], true)),
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
            ],
        ];
    }
}
