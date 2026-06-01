<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\MediaFile;
use App\Models\Participation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MediaFile>
 */
class MediaFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $participation = Participation::factory()->create();
        $ext = fake()->randomElement(['jpg', 'png', 'webp']);
        $mime = match ($ext) {
            'jpg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
        };

        $orgId = $participation->member()->withoutGlobalScopes()->value('organization_id') ?? 1;

        return [
            'organization_id' => $orgId,
            'mediable_type' => Participation::class,
            'mediable_id' => $participation->id,
            'disk' => 'public',
            'path' => "org_{$orgId}/tournaments/0/events/0/members/{$participation->member_id}/".fake()->uuid().".{$ext}",
            'original_name' => fake()->word().".{$ext}",
            'mime_type' => $mime,
            'size_bytes' => fake()->numberBetween(50_000, 5_000_000),
            'caption_hi' => fake()->optional(0.4)->sentence(4),
            'uploaded_by' => User::factory()->create(['organization_id' => $orgId])->id,
        ];
    }

    /**
     * Media attached to a specific Participation.
     */
    public function forParticipation(Participation $participation): static
    {
        return $this->state(fn () => [
            'organization_id' => $participation->member()->withoutGlobalScopes()->value('organization_id'),
            'mediable_type' => Participation::class,
            'mediable_id' => $participation->id,
        ]);
    }
}
