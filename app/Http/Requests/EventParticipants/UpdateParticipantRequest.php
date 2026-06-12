<?php

declare(strict_types=1);

namespace App\Http\Requests\EventParticipants;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateParticipantRequest extends FormRequest
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
            'position' => ['nullable', 'integer', 'min:1'],
            'medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT'])],
            'medal_position' => ['nullable', 'integer', 'min:1'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
