<?php

declare(strict_types=1);

namespace App\Http\Requests;

class MedalsByMemberRequest extends ReportFilterRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);
    }
}
