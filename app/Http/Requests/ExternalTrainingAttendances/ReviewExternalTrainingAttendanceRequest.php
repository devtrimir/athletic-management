<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalTrainingAttendances;

use App\Models\ExternalTrainingAttendance;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewExternalTrainingAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $attendance = $this->route('external_training_attendance');

        return $attendance instanceof ExternalTrainingAttendance
            && $this->user()?->can('update', $attendance) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $attendance = $this->route('external_training_attendance');
        $geoStatus = $attendance instanceof ExternalTrainingAttendance ? $attendance->geo_status : null;

        return [
            'action' => ['required', 'string', Rule::in(['accept', 'reject', 'correct', 'manual_review', 'lock'])],
            'attendance_status' => [
                Rule::requiredIf(fn (): bool => $this->input('action') === 'correct'),
                'nullable',
                'string',
                Rule::in(['present', 'absent', 'late', 'excused', 'not_marked']),
            ],
            'review_remarks' => [
                Rule::requiredIf(fn (): bool => in_array($this->input('action'), ['reject', 'manual_review'], true)
                    || ($this->input('action') === 'accept' && $geoStatus !== 'valid')),
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }
}
