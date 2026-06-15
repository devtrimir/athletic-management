<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use Illuminate\Foundation\Http\FormRequest;

class ChangeTeamInchargeRequest extends FormRequest
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

                $pno = trim((string) $this->input('pno'));

                if ($pno === '') {
                    return;
                }

                if ($currentAssignment !== null && $currentAssignment->pno === $pno) {
                    $validator->errors()->add('pno', __('The selected incharge is already the current incharge.'));
                }

                $existingAssignment = TeamInchargeAssignment::query()
                    ->current()
                    ->where('pno', $pno)
                    ->where('team_id', '!=', $team->id)
                    ->first();

                if ($existingAssignment !== null) {
                    $validator->errors()->add('pno', __('The selected incharge is already assigned to another team.'));
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
