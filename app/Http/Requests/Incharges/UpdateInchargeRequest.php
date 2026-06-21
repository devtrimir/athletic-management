<?php

declare(strict_types=1);

namespace App\Http\Requests\Incharges;

use App\Models\Incharge;
use App\Rules\UniquePnoAcrossPeople;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInchargeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Incharge $incharge */
        $incharge = $this->route('incharge');
        $orgId = (int) $this->user()->organization_id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'pno' => [
                'required',
                'string',
                'max:20',
                new UniquePnoAcrossPeople($orgId, 'incharges', (int) $incharge->id),
            ],
            'rank' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
