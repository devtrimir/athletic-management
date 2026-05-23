<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAliasRequest extends FormRequest
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
        return [
            'alias_hi' => ['required', 'string', 'max:255'],
            'source'   => ['required', Rule::in(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual'])],
        ];
    }
}
