<?php

declare(strict_types=1);

use App\Models\Incharge;
use App\Models\InchargeAchievement;
use App\Models\Sport;

test('incharge achievement store requires manage permission', function (): void {
    $user = rcUser('incharges.view');
    $incharge = Incharge::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('incharges.achievements.store', $incharge), [
            'title' => 'Test',
            'level' => 'NATIONAL',
            'event_date' => '2020-01-01',
            'sport_id' => $sport->id,
            'event_type' => 'team',
        ])
        ->assertForbidden();
});

test('incharge achievement store validates required fields', function (): void {
    $user = rcUser('incharges.view', 'incharges.manageSpecialAchievements');
    $incharge = Incharge::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('incharges.achievements', $incharge))
        ->post(route('incharges.achievements.store', $incharge), [
            'title' => '',
            'sport_id' => '',
            'event_date' => '',
            'event_type' => '',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors(['title', 'sport_id', 'event_date', 'event_type']);

    expect(InchargeAchievement::query()->count())->toBe(0);
});

test('incharge achievement store validates sport belongs to organization', function (): void {
    $user = rcUser('incharges.view', 'incharges.manageSpecialAchievements');
    $incharge = Incharge::factory()->create(['organization_id' => $user->organization_id]);
    $otherSport = Sport::factory()->create();

    $this->actingAs($user)
        ->from(route('incharges.achievements', $incharge))
        ->post(route('incharges.achievements.store', $incharge), [
            'title' => 'Test achievement',
            'period' => 'POST_RECRUITMENT',
            'level' => 'NATIONAL',
            'event_date' => '2020-01-15',
            'sport_id' => $otherSport->id,
            'event_type' => 'team',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors(['sport_id']);

    expect(InchargeAchievement::query()->count())->toBe(0);
});

test('can create and update an incharge achievement with new fields', function (): void {
    $user = rcUser('incharges.view', 'incharges.manageSpecialAchievements');
    $incharge = Incharge::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('incharges.achievements.store', $incharge), [
            'title' => 'All India Police Tournament',
            'period' => 'POST_RECRUITMENT',
            'level' => 'NATIONAL',
            'competition_details' => 'All India Police Tournament details',
            'event_date' => '2017-09-12',
            'venue' => 'Lucknow',
            'sport_id' => $sport->id,
            'event' => '400 meter race',
            'medal_type' => 'GOLD',
            'event_type' => 'team',
            'position' => '1',
            'achieved_on' => '2017-09-21',
            'remarks' => 'test remark',
        ])
        ->assertRedirect(route('incharges.achievements', $incharge));

    $achievement = InchargeAchievement::query()->firstOrFail();

    expect($achievement->incharge_id)->toBe($incharge->id)
        ->and($achievement->organization_id)->toBe($user->organization_id)
        ->and($achievement->title)->toBe('All India Police Tournament')
        ->and($achievement->sport_id)->toBe($sport->id)
        ->and($achievement->event_type)->toBe('team')
        ->and($achievement->period)->toBe('POST_RECRUITMENT')
        ->and($achievement->medal_type)->toBe('GOLD');

    $newSport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->patch(route('incharges.achievements.update', [$incharge, $achievement]), [
            'title' => 'Updated title',
            'period' => 'PRE_RECRUITMENT',
            'level' => 'STATE',
            'event_date' => '2018-08-10',
            'sport_id' => $newSport->id,
            'event_type' => 'individual',
        ])
        ->assertRedirect(route('incharges.achievements', $incharge));

    $achievement->refresh();

    expect($achievement->title)->toBe('Updated title')
        ->and($achievement->period)->toBe('PRE_RECRUITMENT')
        ->and($achievement->sport_id)->toBe($newSport->id)
        ->and($achievement->event_type)->toBe('individual');
});
