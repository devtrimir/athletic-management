<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use Illuminate\Foundation\Http\Attributes\ErrorBag;
use Illuminate\Foundation\Http\FormRequest;

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
            'full_name' => ['required', 'string', 'max:255'],
            'pno' => ['required', 'string', 'max:20'],
            'rank' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
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

                $pno = trim((string) $this->input('pno'));

                if ($pno === '') {
                    return;
                }

                $existingAssignment = TeamInchargeAssignment::query()
                    ->current()
                    ->where('pno', $pno)
                    ->where('team_id', '!=', $team->id)
                    ->first();

                if ($existingAssignment !== null) {
                    $validator->errors()->add('pno', __('The selected incharge is already assigned to another team.'));
                }
            },
        ];
    }
}
