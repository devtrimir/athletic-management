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

    /**
     * Convenience wrapper — extract validated filter values from this request.
     *
     * @return array{year_from: int|null, year_to: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}
     */
    public function filters(): array
    {
        return $this->resolvedFilters($this);
    }
}
