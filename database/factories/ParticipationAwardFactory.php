<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\ParticipationAward;
use App\Models\Sport;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParticipationAward>
 */
class ParticipationAwardFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $organization = Organization::factory()->create();
        $sport = Sport::factory()->create(['organization_id' => $organization->id]);
        $member = Member::factory()->create(['organization_id' => $organization->id]);
        $tournament = Tournament::factory()->forOrganization($organization)->create([
            'sport_id' => $sport->id,
        ]);
        $event = Event::factory()->forTournament($tournament)->create();
        $participation = Participation::factory()->forEvent($event)->create([
            'member_id' => $member->id,
            'session_id' => $tournament->session_id,
        ]);

        $awardType = fake()->randomElement([
            'BEST_PLAYER',
            'BEST_ATHLETE',
            'BEST_GOALKEEPER',
            'MAN_OF_THE_MATCH',
            'COMMENDATION',
            'OTHER',
        ]);

        return [
            'organization_id' => $organization->id,
            'participation_id' => $participation->id,
            'award_type' => $awardType,
            'title' => match ($awardType) {
                'BEST_PLAYER' => 'Best Player',
                'BEST_ATHLETE' => 'Best Athlete',
                'BEST_GOALKEEPER' => 'Best Goalkeeper',
                'MAN_OF_THE_MATCH' => 'Man of the Match',
                'COMMENDATION' => 'Commendation',
                default => fake()->sentence(3),
            },
            'points_override' => fake()->optional(0.2)->numberBetween(1, 25),
            'remarks' => fake()->optional(0.4)->sentence(),
        ];
    }

    public function forParticipation(Participation $participation): static
    {
        $organizationId = Member::withoutGlobalScopes()
            ->findOrFail($participation->member_id)
            ->organization_id;

        return $this->state([
            'organization_id' => $organizationId,
            'participation_id' => $participation->id,
        ]);
    }
}
