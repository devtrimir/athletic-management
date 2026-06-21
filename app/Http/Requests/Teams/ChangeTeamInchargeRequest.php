<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use Illuminate\Foundation\Http\Attributes\ErrorBag;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[ErrorBag('changeIncharge')]
class ChangeTeamInchargeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'incharge_id' => [
                'required',
                'integer',
                Rule::exists('incharges', 'id')
                    ->where('organization_id', (int) $this->user()->organization_id)
                    ->where('is_active', true),
            ],
            'assigned_at' => ['nullable', 'date'],
            'assignment_reason' => ['nullable', 'string'],
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

                if (! $team->is_active) {
                    $validator->errors()->add('team', __('Cannot change the incharge of an inactive team.'));
                }

                if ($currentAssignment === null) {
                    $validator->errors()->add('team', __('This team does not have a current incharge to replace.'));
                }

                if (
                    $currentAssignment !== null
                    && (int) $this->input('incharge_id') === (int) $currentAssignment->incharge_id
                ) {
                    $validator->errors()->add('incharge_id', __('The selected incharge is already the current incharge.'));
                }

                if ($currentAssignment !== null && $this->filled('assigned_at')) {
                    $assignedAt = $this->date('assigned_at');

                    if ($assignedAt !== null && $assignedAt->lt($currentAssignment->assigned_at)) {
                        $validator->errors()->add('assigned_at', __('The replacement date must be after the current assignment date.'));
                    }
                }
            },
        ];
    }
}
