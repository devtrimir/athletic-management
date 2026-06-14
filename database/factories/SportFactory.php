<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Sport>
 */
class SportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sports = [
            ['name' => 'हॉकी',       'category' => 'TEAM'],
            ['name' => 'कबड्डी',      'category' => 'TEAM'],
            ['name' => 'बॉक्सिंग',       'category' => 'COMBAT'],
            ['name' => 'कुश्ती',    'category' => 'COMBAT'],
            ['name' => 'एथलेटिक्स',    'category' => 'INDIVIDUAL'],
            ['name' => 'शूटिंग',     'category' => 'INDIVIDUAL'],
            ['name' => 'स्विमिंग',     'category' => 'WATER'],
            ['name' => 'वॉलीबॉल',   'category' => 'TEAM'],
        ];

        $sport = fake()->unique()->randomElement($sports);

        return [
            'organization_id' => Organization::factory(),
            'name' => $sport['name'],
            'category' => $sport['category'],
            'slug' => Str::slug($sport['name']),
        ];
    }
}
