<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $userId = (int) $this->route('user')->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'locale' => ['required', 'string', Rule::in(['hi', 'en'])],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', 'string', Password::min(8)->uncompromised(), 'confirmed'],
        ];
    }
}
