<?php

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExternalCoachDocument>
 */
class ExternalCoachDocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'external_coach_id' => ExternalCoach::factory(),
            'type' => 'aadhaar',
            'path' => 'external-coach-documents/1/'.fake()->uuid().'.pdf',
            'original_name' => 'aadhaar.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ];
    }
}
