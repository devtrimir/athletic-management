<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachSport;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Coach::withoutGlobalScopes()
            ->with('member')
            ->chunkById(200, function ($coaches): void {
                /** @var Coach $coach */
                foreach ($coaches as $coach) {
                    $coach->fill([
                        'display_name' => $coach->display_name ?? $coach->full_name,
                        'designation' => $coach->designation ?? $coach->member?->designation,
                        'gender' => $coach->gender ?? $coach->member?->gender,
                        'date_of_birth' => $coach->date_of_birth ?? $coach->member?->dob,
                        'coach_status' => $coach->coach_status === 'RETIRRED'
                            ? 'RETIRED'
                            : ($coach->coach_status ?? 'ACTIVE'),
                        'address' => $coach->address,
                        'email' => $coach->email,
                    ]);

                    if ($coach->isDirty()) {
                        $coach->saveQuietly();
                    }

                    if ($coach->member && $coach->member->sport_id !== null) {
                        CoachSport::query()->updateOrCreate(
                            ['coach_id' => $coach->id, 'sport_id' => $coach->member->sport_id],
                            [
                                'is_primary' => true,
                                'level' => $coach->member->player_level,
                                'notes' => null,
                                'effective_from' => $coach->member?->joining_date,
                                'effective_to' => null,
                            ],
                        );
                    }
                }
            });

        CoachAssignment::withoutGlobalScopes()
            ->whereNull('assigned_at')
            ->update([
                'assigned_at' => DB::raw('created_at'),
                'is_current' => true,
            ]);

        // Preserve the latest row as current in legacy duplicate scopes.
        $scopes = CoachAssignment::withoutGlobalScopes()
            ->select('coach_id', 'team_id', 'session_id')
            ->where('is_current', true)
            ->groupBy('coach_id', 'team_id', 'session_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($scopes as $scope) {
            $activeAssignments = CoachAssignment::withoutGlobalScopes()
                ->where('coach_id', (int) $scope->coach_id)
                ->where('team_id', (int) $scope->team_id)
                ->where('session_id', (int) $scope->session_id)
                ->where('is_current', true)
                ->orderByDesc('assigned_at')
                ->orderByDesc('id')
                ->get();

            $activeAssignments->skip(1)->each(function (CoachAssignment $assignment): void {
                $assignment->updateQuietly([
                    'is_current' => false,
                    'removed_at' => $assignment->removed_at ?? $assignment->updated_at,
                    'notes' => 'Backfilled historical row',
                ]);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-reversible by design.
    }
};
