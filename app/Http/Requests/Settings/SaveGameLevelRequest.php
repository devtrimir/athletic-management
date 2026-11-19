<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\GameLevel;
use Illuminate\Foundation\Http\FormRequest;

class SaveGameLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        $level = $this->route('gameLevel');

        return $this->user()?->can($level instanceof GameLevel ? 'update' : 'create', $level ?? GameLevel::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name_en' => ['required', 'string', 'max:255'],
            'name_hi' => ['required', 'string', 'max:255'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['boolean'],
        ];
    }
}
