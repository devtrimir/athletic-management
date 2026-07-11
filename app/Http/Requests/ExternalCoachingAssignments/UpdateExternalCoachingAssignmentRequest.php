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

    protected function prepareForValidation(): void
    {
        $this->merge([
            'start_date' => $this->normalizeDateInput($this->input('start_date')),
            'end_date' => $this->normalizeDateInput($this->input('end_date')),
            'training_start_time' => $this->normalizeTimeInput($this->input('training_start_time')),
            'training_end_time' => $this->normalizeTimeInput($this->input('training_end_time')),
        ]);
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
            'training_start_time' => ['nullable', 'required_with:training_end_time', 'date_format:H:i'],
            'training_end_time' => ['nullable', 'required_with:training_start_time', 'date_format:H:i', 'after:training_start_time'],
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

                if ($this->hasPostedAttendance($assignment)) {
                    if ($this->hasChangedPeriod($assignment)) {
                        $validator->errors()->add(
                            'start_date',
                            __('Cannot change assignment dates after attendance has been posted.'),
                        );
                    }

                    return;
                }

                if ($this->hasOverlappingAssignment($ignoreId)) {
                    $validator->errors()->add('start_date', __('This member already has an overlapping external coaching assignment for this sport.'));
                }
            },
        ];
    }

    private function hasPostedAttendance(?ExternalCoachingAssignment $assignment): bool
    {
        return $assignment !== null
            && $assignment->attendances()->exists();
    }

    private function hasChangedPeriod(ExternalCoachingAssignment $assignment): bool
    {
        if (! $this->filled(['start_date', 'end_date'])) {
            return false;
        }

        return $assignment->start_date?->toDateString() !== $this->date('start_date')
            || $assignment->end_date?->toDateString() !== $this->date('end_date');
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

    private function normalizeDateInput(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        $normalized = trim($value);

        if ($normalized === '') {
            return $normalized;
        }

        if (\preg_match('/^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:[T\\s].+)?$/', $normalized, $matches)) {
            $normalizedDate = $this->buildNormalizedDate($matches[1], $matches[2], $matches[3]);

            if ($normalizedDate !== null) {
                return $normalizedDate;
            }
        }

        if (\preg_match('/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/', $normalized, $matches)) {
            $normalizedDate = $this->buildNormalizedDate($matches[3], $matches[2], $matches[1]);

            if ($normalizedDate !== null) {
                return $normalizedDate;
            }
        }

        return $normalized;
    }

    private function buildNormalizedDate(
        string $year,
        string $month,
        string $day,
    ): ?string {
        $yearValue = (int) $year;
        $monthValue = (int) $month;
        $dayValue = (int) $day;

        if (! \checkdate($monthValue, $dayValue, $yearValue)) {
            return null;
        }

        return \sprintf('%04d-%02d-%02d', $yearValue, $monthValue, $dayValue);
    }

    private function normalizeTimeInput(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        $normalized = trim($value);

        if ($normalized === '') {
            return $normalized;
        }

        if (\preg_match('/^(\\d{1,2}):(\\d{2})(?::\\d{2})?$/', $normalized, $matches)) {
            $hour = (int) $matches[1];
            $minute = (int) $matches[2];

            if ($hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59) {
                return \sprintf('%02d:%02d', $hour, $minute);
            }
        }

        return $normalized;
    }
}
