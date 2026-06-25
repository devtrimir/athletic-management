<?php

declare(strict_types=1);

namespace App\Support\Coaches;

use App\Http\Resources\CoachAliasResource;
use App\Http\Resources\CoachResource;
use App\Http\Resources\CoachStatusHistoryResource;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\TournamentTier;
use App\Services\AuditLogBuilder;

class CoachProfileData
{
    public function __construct(
        private readonly AuditLogBuilder $auditLogBuilder,
    ) {}

    /** @return array<string, mixed> */
    public function overview(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'overview',
        ];
    }

    /** @return array<string, mixed> */
    public function assignments(Coach $coach): array
    {
        $coach->loadMissing([
            'assignmentHistory' => fn ($query) => $query
                ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
                ->orderByDesc('is_current')
                ->orderByDesc('assigned_at')
                ->orderByDesc('id'),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'assignments',
            'coachTeams' => $this->assignmentsPayload($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function sports(Coach $coach): array
    {
        $coach->loadMissing([
            'sports' => fn ($query) => $query->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes']),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'sports',
            'sports' => Sport::query()
                ->select(['id', 'name', 'category'])
                ->where('organization_id', $coach->organization_id)
                ->orderBy('name')
                ->get(),
            'tiers' => TournamentTier::query()
                ->select(['id', 'code', 'label_hi', 'label_en', 'weight'])
                ->orderByDesc('weight')
                ->get(),
        ];
    }

    /** @return array<string, mixed> */
    public function certifications(Coach $coach): array
    {
        $coach->loadMissing('certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,metadata');

        return [
            ...$this->shell($coach),
            'activeTab' => 'certifications',
        ];
    }

    /** @return array<string, mixed> */
    public function events(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'events',
        ];
    }

    /** @return array<string, mixed> */
    public function achievements(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'achievements',
        ];
    }

    /** @return array<string, mixed> */
    public function performance(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'performance',
        ];
    }

    /** @return array<string, mixed> */
    public function promotions(Coach $coach): array
    {
        $coach->loadMissing([
            'promotions' => fn ($query) => $query
                ->with('recorder:id,name')
                ->orderByDesc('promotion_date')
                ->orderByDesc('id'),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'promotions',
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
        ];
    }

    /** @return array<string, mixed> */
    public function media(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'media',
        ];
    }

    /** @return array<string, mixed> */
    public function aliases(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'aliases',
            'aliases' => CoachAliasResource::collection($coach->aliases()->get())->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'changelog',
            'auditLog' => $this->auditLogBuilder->forCoach($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function status(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'status',
            'statusHistory' => CoachStatusHistoryResource::collection(
                $coach->statusHistory()->with('recorder')->get()
            )->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Coach $coach): array
    {
        $coach->loadMissing([
            'district:id,name',
            'unit:id,name,district_id',
            'nisMaster:id,kind,code,name,short_name',
            'tierMaster:id,code,label_hi,label_en,weight',
            'rankMaster:id,code,name,short_name',
            'designationMaster:id,code,name,short_name',
        ]);

        $coachData = (new CoachResource($coach))->resolve();
        $coachData['team_activity_status'] = $coach->hasActiveCurrentSessionTeamAssignment() ? 'active' : 'inactive';

        return [
            'coach' => $coachData,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function assignmentsPayload(Coach $coach): array
    {
        return $coach->assignmentHistory
            ->map(fn (CoachAssignment $coachAssignment): array => [
                'id' => $coachAssignment->id,
                'role' => $coachAssignment->role,
                'is_current' => (bool) $coachAssignment->is_current,
                'assigned_at' => $coachAssignment->assigned_at?->toDateTimeString(),
                'removed_at' => $coachAssignment->removed_at?->toDateTimeString(),
                'notes' => $coachAssignment->notes,
                'team' => $coachAssignment->team ? ['id' => $coachAssignment->team->id, 'name' => $coachAssignment->team->name] : null,
                'sport' => $coachAssignment->team?->sport ? ['id' => $coachAssignment->team->sport->id, 'name' => $coachAssignment->team->sport->name] : null,
                'session' => $coachAssignment->session ? ['id' => $coachAssignment->session->id, 'name' => $coachAssignment->session->name] : null,
            ])
            ->all();
    }
}
