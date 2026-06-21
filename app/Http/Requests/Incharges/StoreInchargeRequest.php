<?php

declare(strict_types=1);

namespace App\Http\Requests\Incharges;

use App\Rules\UniquePnoAcrossPeople;
use Illuminate\Foundation\Http\FormRequest;

class StoreInchargeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'pno' => ['required', 'string', 'max:20', new UniquePnoAcrossPeople($orgId)],
            'rank' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
