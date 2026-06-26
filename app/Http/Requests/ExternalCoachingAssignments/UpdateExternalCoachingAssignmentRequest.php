<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoachingAssignments;

use App\Models\ExternalCoachingAssignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateExternalCoachingAssignmentRequest extends FormRequest
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

        return [
            'member_id' => ['required', 'integer', Rule::exists('members', 'id')->where('organization_id', $orgId)->where('current_status', 'ACTIVE')],
            'external_coach_id' => ['required', 'integer', Rule::exists('external_coaches', 'id')->where('organization_id', $orgId)->where('status', 'active')],
            'training_venue_id' => ['required', 'integer', Rule::exists('training_venues', 'id')->where('organization_id', $orgId)->where('status', 'active')],
            'sport_id' => ['required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)->where('is_active', true)],
            'sport_event_id' => ['nullable', 'integer', Rule::exists('sport_events', 'id')],
            'start_date' => ['required', Rule::date()->format('Y-m-d')],
            'end_date' => ['required', Rule::date()->format('Y-m-d'), 'after_or_equal:start_date'],
            'training_days' => ['nullable', 'array'],
            'training_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'training_start_time' => ['nullable', 'date_format:H:i'],
            'training_end_time' => ['nullable', 'date_format:H:i', 'after:training_start_time'],
            'attendance_mode' => ['required', Rule::in(['single_mark', 'check_in_check_out'])],
            'permission_reference_number' => ['nullable', 'string', 'max:100'],
            'permission_document' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png,webp', 'max:5120'],
            'status' => ['required', Rule::in(['draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'cancelled', 'rejected', 'expired'])],
            'cancellation_reason' => ['nullable', 'string', 'max:4000'],
            'completion_remarks' => ['nullable', 'string', 'max:4000'],
            'remarks' => ['nullable', 'string', 'max:4000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $assignment = $this->route('external_coaching_assignment');
                $ignoreId = $assignment instanceof ExternalCoachingAssignment ? $assignment->id : null;

                if ($this->hasOverlappingAssignment($ignoreId)) {
                    $validator->errors()->add('start_date', __('This member already has an overlapping external coaching assignment for this sport.'));
                }
            },
        ];
    }

    private function hasOverlappingAssignment(?int $ignoreId): bool
    {
        if (! $this->filled(['member_id', 'sport_id', 'start_date', 'end_date'])) {
            return false;
        }

        return ExternalCoachingAssignment::query()
            ->where('member_id', (int) $this->input('member_id'))
            ->where('sport_id', (int) $this->input('sport_id'))
            ->whereIn('status', ['approved', 'active', 'paused'])
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->whereDate('start_date', '<=', $this->date('end_date'))
            ->whereDate('end_date', '>=', $this->date('start_date'))
            ->exists();
    }
}
