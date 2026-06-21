<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use Illuminate\Foundation\Http\Attributes\ErrorBag;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[ErrorBag('assignIncharge')]
class AssignTeamInchargeRequest extends FormRequest
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
            'remarks' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                /** @var Team $team */
                $team = $this->route('team');

                if (! $team->is_active) {
                    $validator->errors()->add('team', __('Cannot assign an incharge to an inactive team.'));
                }

                if ($team->currentInchargeAssignment()->exists()) {
                    $validator->errors()->add('team', __('This team already has a current incharge.'));
                }

            },
        ];
    }
}
