<?php

declare(strict_types=1);

namespace App\Support\Incharges;

use App\Models\Incharge;
use App\Models\TeamInchargeAssignment;
use App\Models\Team;
use App\Models\TournamentTier;
use App\Models\InchargeSpecialAchievement;
use App\Models\InchargeAchievement;
use App\Models\Sport;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Collection;

class InchargeProfileData
{
    /** @return array<string, mixed> */
    public function overview(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'overview',
            'summary' => [
                'current_teams_count' => $incharge->currentAssignments()->count(),
                'total_assignments_count' => $incharge->assignments()->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function profile(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'profile',
            'summary' => [
                'current_teams_count' => $incharge->currentAssignments()->count(),
                'total_assignments_count' => $incharge->assignments()->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function achievements(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'achievements',
            'achievements' => $this->achievementsPayload($incharge),
            'summary' => [
                'current_teams_count' => $incharge->currentAssignments()->count(),
                'total_assignments_count' => $incharge->assignments()->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function specialAchievements(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'special-achievements',
            'specialAchievements' => $this->specialAchievementsPayload($incharge),
        ];
    }

    /** @return array<string, mixed> */
    public function teams(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'teams',
            'assignments' => $this->assignmentsPayload($incharge),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'changelog',
        ];
    }

    /** @return array<string, mixed> */
    public function print(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'assignments' => $this->assignmentsPayload($incharge),
            'achievements' => $this->achievementsPayload($incharge),
            'specialAchievements' => $this->specialAchievementsPayload($incharge),
            'activeTab' => 'overview',
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Incharge $incharge): array
    {
        return [
            'auditLogEndpoint' => Route::has('v1.incharges.audit-log.index')
                ? route('v1.incharges.audit-log.index', $incharge)
                : null,
            'incharge' => [
                'id' => $incharge->id,
                'created_at' => $incharge->created_at?->toDateTimeString(),
                'updated_at' => $incharge->updated_at?->toDateTimeString(),
                'deleted_at' => $incharge->deleted_at?->toDateTimeString(),
                'full_name' => $incharge->full_name,
                'pno' => $incharge->pno,
                'rank' => $incharge->rank,
                'designation' => $incharge->designation,
                'mobile' => $incharge->mobile,
                'email' => $incharge->email,
                'is_active' => $incharge->is_active,
                'remarks' => $incharge->remarks,
                'photo_path' => $incharge->photo_path,
            ],
            'sports' => Sport::query()
                ->where('organization_id', $incharge->organization_id)
                ->orderBy('name')
                ->get(['id', 'name']),
            'achievement_levels' => $this->achievementLevels(),
        ];
    }

    /** @return string[] */
    private function achievementLevels(): array
    {
        $levels = TournamentTier::query()
            ->orderByDesc('weight')
            ->orderBy('code')
            ->pluck('code')
            ->all();

        if ($levels === []) {
            return ['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER'];
        }

        return $levels;
    }

    /** @return array<int, array<string, mixed>> */
    private function assignments(Incharge $incharge): array
    {
        return $this->assignmentsPayload($incharge);
    }

    /** @return array<int, array<string, mixed>> */
    private function assignmentsPayload(Incharge $incharge): array
    {
        return TeamInchargeAssignment::query()
            ->where('incharge_id', $incharge->id)
            ->with([
                'team:id,name,sport_id,session_id,location_type,district_id,unit_id',
                'team.sport:id,name',
                'team.session:id,name',
                'team.district:id,name',
                'team.unit:id,name',
                'assignedBy:id,name',
                'removedBy:id,name',
            ])
            ->latest('assigned_at')
            ->get()
            ->map(fn (TeamInchargeAssignment $assignment): array => [
                'id' => $assignment->id,
                'full_name' => $assignment->full_name,
                'pno' => $assignment->pno,
                'rank' => $assignment->rank,
                'designation' => $assignment->designation,
                'mobile' => $assignment->mobile,
                'email' => $assignment->email,
                'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
                'removed_at' => $assignment->removed_at?->toDateTimeString(),
                'assignment_reason' => $assignment->assignment_reason,
                'removal_reason' => $assignment->removal_reason,
                'remarks' => $assignment->remarks,
                'is_current' => $assignment->is_current,
                'team' => $assignment->team ? [
                    'id' => $assignment->team->id,
                    'name' => $assignment->team->name,
                    'location_type' => $assignment->team->location_type,
                    'location_label' => $assignment->team->location_label,
                    'sport' => $assignment->team->sport ? ['id' => $assignment->team->sport->id, 'name' => $assignment->team->sport->name] : null,
                    'session' => $assignment->team->session ? ['id' => $assignment->team->session->id, 'name' => $assignment->team->session->name] : null,
                    'district' => $assignment->team->district ? ['id' => $assignment->team->district->id, 'name' => $assignment->team->district->name] : null,
                    'unit' => $assignment->team->unit ? ['id' => $assignment->team->unit->id, 'name' => $assignment->team->unit->name] : null,
                ] : null,
                'assigned_by' => $assignment->assignedBy ? ['id' => $assignment->assignedBy->id, 'name' => $assignment->assignedBy->name] : null,
                'removed_by' => $assignment->removedBy ? ['id' => $assignment->removedBy->id, 'name' => $assignment->removedBy->name] : null,
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function achievementsPayload(Incharge $incharge): array
    {
        $achievements = InchargeAchievement::query()
            ->where('incharge_id', $incharge->id)
            ->orderByDesc('event_date')
            ->orderByDesc('id')
            ->get();

        return [
                'summary' => [
                    'total' => $achievements->count(),
                ],
                'records' => $achievements
                    ->map(fn (InchargeAchievement $achievement): array => [
                        'id' => $achievement->id,
                        'period' => $achievement->period ?? 'POST_RECRUITMENT',
                        'level' => $achievement->level ?? 'OTHER',
                        'title' => $achievement->title,
                        'competition_details' => $achievement->competition_details
                            ?? $achievement->description,
                        'event_date' => $achievement->event_date?->toDateString()
                            ?? $achievement->achieved_on?->toDateString(),
                        'venue' => $achievement->venue,
                        'sport_discipline' => $achievement->sport_discipline,
                        'event' => $achievement->event,
                        'discipline' => $achievement->discipline,
                        'weight_category' => $achievement->weight_category,
                        'gender_class' => $achievement->gender_class,
                        'medal_type' => $achievement->medal_type,
                        'position' => $achievement->position,
                        'description' => $achievement->description,
                        'achieved_on' => $achievement->achieved_on?->toDateString(),
                        'remarks' => $achievement->remarks,
                    ])
                    ->all(),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function teamOptions(Incharge $incharge): array
    {
        return Team::query()
            ->where('organization_id', $incharge->organization_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($team): array => [
                'id' => (int) $team->id,
                'name' => (string) $team->name,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function specialAchievementsPayload(Incharge $incharge): array
    {
        $records = $incharge->specialAchievements()
            ->orderByDesc('awarded_on')
            ->orderByDesc('id')
            ->get()
            ->map(fn (InchargeSpecialAchievement $record): array => [
                'id' => $record->id,
                'achievement_type' => $record->achievement_type,
                'title' => $record->title,
                'awarded_on' => $record->awarded_on?->toDateString(),
                'issuing_authority' => $record->issuing_authority,
                'order_reference' => $record->order_reference,
                'order_document' => $record->order_document_path ? [
                    'path' => $record->order_document_path,
                    'url' => route('incharges.special-achievements.order-document.preview', [$incharge, $record]),
                    'preview_url' => route('incharges.special-achievements.order-document.preview', [$incharge, $record]),
                    'download_url' => route('incharges.special-achievements.order-document', [$incharge, $record]),
                    'original_name' => $record->order_document_original_name,
                    'mime_type' => $record->order_document_mime_type,
                    'size_bytes' => $record->order_document_size_bytes,
                ] : null,
                'place' => $record->place,
                'remarks' => $record->remarks,
            ])
            ->values()
            ->all();

        return [
            'records' => $records,
            'summary' => [
                'total' => count($records),
            ],
        ];
    }
}
