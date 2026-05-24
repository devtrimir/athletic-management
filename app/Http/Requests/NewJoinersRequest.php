<?php

declare(strict_types=1);

namespace App\Http\Requests;

class NewJoinersRequest extends ReportFilterRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'from_date' => ['nullable', 'date', 'before_or_equal:today'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
        ]);
    }

    /**
     * @return array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null, from_date: string|null, to_date: string|null}
     */
    public function allFilters(): array
    {
        return array_merge($this->filters(), [
            'from_date' => $this->input('from_date'),
            'to_date' => $this->input('to_date'),
        ]);
    }
}
