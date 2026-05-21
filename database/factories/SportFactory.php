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
            ['name_hi' => 'हॉकी',         'name_en' => 'Hockey',       'category' => 'TEAM'],
            ['name_hi' => 'कबड्डी',       'name_en' => 'Kabaddi',      'category' => 'TEAM'],
            ['name_hi' => 'बॉक्सिंग',     'name_en' => 'Boxing',       'category' => 'COMBAT'],
            ['name_hi' => 'कुश्ती',       'name_en' => 'Wrestling',    'category' => 'COMBAT'],
            ['name_hi' => 'एथलेटिक्स',   'name_en' => 'Athletics',    'category' => 'INDIVIDUAL'],
            ['name_hi' => 'शूटिंग',       'name_en' => 'Shooting',     'category' => 'INDIVIDUAL'],
            ['name_hi' => 'स्विमिंग',     'name_en' => 'Swimming',     'category' => 'WATER'],
            ['name_hi' => 'वॉलीबॉल',      'name_en' => 'Volleyball',   'category' => 'TEAM'],
        ];

        $sport = fake()->unique()->randomElement($sports);

        return [
            'organization_id' => Organization::factory(),
            'name_hi' => $sport['name_hi'],
            'name_en' => $sport['name_en'],
            'category' => $sport['category'],
            'slug' => Str::slug($sport['name_en']),
        ];
    }
}
