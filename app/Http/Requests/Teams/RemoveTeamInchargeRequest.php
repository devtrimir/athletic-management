<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use Illuminate\Foundation\Http\FormRequest;

class RemoveTeamInchargeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'removed_at' => ['nullable', 'date'],
            'removal_reason' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                /** @var Team $team */
                $team = $this->route('team');
                $currentAssignment = $team->currentInchargeAssignment()->first();

                if ($currentAssignment === null) {
                    $validator->errors()->add('team', __('This team does not have a current incharge to remove.'));

                    return;
                }

                if ($this->filled('removed_at')) {
                    $removedAt = $this->date('removed_at');

                    if ($removedAt !== null && $removedAt->lt($currentAssignment->assigned_at)) {
                        $validator->errors()->add('removed_at', __('The removal date cannot be before the assignment date.'));
                    }
                }
            },
        ];
    }
}
