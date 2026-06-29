<?php

declare(strict_types=1);

namespace App\Http\Requests\SportsCalendars;

use App\Models\SportsCalendar;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSportsCalendarRequest extends FormRequest
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
        return [
            'year' => ['required', 'integer', 'min:2000', 'max:2400'],
            'competition_name' => ['required', 'string', 'max:255'],
            'proposed_month' => ['nullable', 'string', 'max:255'],
            'proposed_month_annual' => ['nullable', 'string', 'max:255'],
            'proposed_venue' => ['required', 'string', 'max:255'],
            'report_arrived' => ['required', 'boolean'],
            'report_pdf' => [
                'nullable',
                'prohibited_if:report_arrived,0',
                'prohibited_if:report_arrived,false',
                'file',
                'mimes:pdf',
                'max:10240',
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $hasInterMonth = $this->filled('proposed_month');
                $hasAnnualMonth = $this->filled('proposed_month_annual');
                $calendar = $this->route('sports_calendar');
                $hasExistingReport = $calendar instanceof SportsCalendar && $calendar->report_pdf_path !== null;

                if (! $hasInterMonth && ! $hasAnnualMonth) {
                    $validator->errors()->add('proposed_month', __('At least one proposed month field is required.'));
                    $validator->errors()->add('proposed_month_annual', __('At least one proposed month field is required.'));
                }

                if ($this->boolean('report_arrived') && ! $this->hasFile('report_pdf') && ! $hasExistingReport) {
                    $validator->errors()->add('report_pdf', __('The report PDF is required when report has arrived.'));
                }
            },
        ];
    }
}
