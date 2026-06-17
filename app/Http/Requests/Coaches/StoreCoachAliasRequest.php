<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoachAliasRequest extends FormRequest
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
            'alias' => ['required', 'string', 'max:255'],
            'source' => ['required', Rule::in(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual'])],
        ];
    }
}
