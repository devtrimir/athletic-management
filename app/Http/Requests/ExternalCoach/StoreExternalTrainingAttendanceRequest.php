<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoach;

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
            'attendance_date' => ['required', 'date'],
            'attendance_status' => ['required', 'string', Rule::in(['present', 'absent', 'late', 'excused'])],
            'coach_remarks' => ['nullable', 'string', 'max:2000'],
            'submitted_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'submitted_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'submitted_gps_accuracy' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'device_info' => ['nullable', 'array'],
            'browser_timezone' => ['nullable', 'string', 'max:100'],
            'submitted_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }
}
