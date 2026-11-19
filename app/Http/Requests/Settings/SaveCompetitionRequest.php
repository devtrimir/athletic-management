<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\Competition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCompetitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $competition = $this->route('competition');

        return $this->user()?->can($competition instanceof Competition ? 'update' : 'create', $competition ?? Competition::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()?->organization_id;
        $competition = $this->route('competition');

        return [
            'game_level_id' => ['required', 'integer', Rule::exists('game_levels', 'id')->where('organization_id', $orgId)],
            'name_en' => ['required', 'string', 'max:255', Rule::unique('competitions', 'name_en')->where('organization_id', $orgId)->ignore($competition instanceof Competition ? $competition->id : null)],
            'name_hi' => ['required', 'string', 'max:255'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['boolean'],
        ];
    }
}
