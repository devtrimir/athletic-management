<?php

declare(strict_types=1);

namespace App\Http\Requests\SportsCalendars;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSportsCalendarRequest extends FormRequest
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
                'required_if:report_arrived,1',
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

                if (! $hasInterMonth && ! $hasAnnualMonth) {
                    $validator->errors()->add('proposed_month', __('At least one proposed month field is required.'));
                    $validator->errors()->add('proposed_month_annual', __('At least one proposed month field is required.'));
                }
            },
        ];
    }
}
