<?php

declare(strict_types=1);

namespace App\Http\Requests\Incharges;

use Illuminate\Foundation\Http\FormRequest;

class StoreInchargePhotoRequest extends FormRequest
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
            'photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
        ];
    }
}
