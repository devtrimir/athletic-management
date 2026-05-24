<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Concerns\HasReportFilters;
use Illuminate\Foundation\Http\FormRequest;

class ReportFilterRequest extends FormRequest
{
    use HasReportFilters;

    public function authorize(): bool
    {
        return $this->user()->can('reports.view');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return $this->reportFilterRules();
    }
}
