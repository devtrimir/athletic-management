<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\Rank;
use Illuminate\Foundation\Http\FormRequest;

class StoreRankRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $aliases = $this->input('aliases');

        if (is_string($aliases)) {
            $aliases = array_values(array_filter(array_map('trim', explode(',', $aliases))));
        }

        $this->merge([
            'aliases' => $aliases,
        ]);
    }

    public function authorize(): bool
    {
        return $this->user()?->can('create', Rank::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:ranks,code'],
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:100'],
            'rank_order' => ['required', 'integer', 'min:1'],
            'cadre_type' => ['nullable', 'string', 'max:50'],
            'is_gazetted' => ['boolean'],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
