<?php

declare(strict_types=1);

namespace App\Http\Requests\EventParticipants;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $medalType = (string) $this->input('medal_type', '');
                $position = $this->input('position');

                if ($medalType === 'MERIT') {
                    if ($position === null || $position === '') {
                        $validator->errors()->add('position', __('Merit medal needs a position.'));
                    } elseif (! is_numeric($position) || ! in_array((int) $position, [1, 2, 3], true)) {
                        $validator->errors()->add('position', __('Position must be 1, 2, or 3 for merit medals.'));
                    }
                }
            },
        ];
    }
}
