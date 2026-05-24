<?php

declare(strict_types=1);

namespace App\Http\Requests\Events;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<ValidationRule|string>>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

        return [
            'sport_id'       => ['required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'name_hi'        => ['required', 'string', 'max:255'],
            'discipline'     => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class'   => ['required', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
        ];
    }
}
