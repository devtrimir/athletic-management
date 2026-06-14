<?php

namespace Database\Factories;

use App\Models\District;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<District>
 */
class DistrictFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // UP district names (Hindi / romanised) for realistic seeds
        $districts = [
            ['name' => 'लखनऊ',     'code' => 'LKO'],
            ['name' => 'आगरा',        'code' => 'AGR'],
            ['name' => 'वाराणसी',    'code' => 'VNS'],
            ['name' => 'कानपुर',      'code' => 'KNP'],
            ['name' => 'प्रयागराज',   'code' => 'PRY'],
            ['name' => 'मेरठ',      'code' => 'MRT'],
            ['name' => 'गाज़ियाबाद',  'code' => 'GZB'],
            ['name' => 'बरेली',    'code' => 'BRL'],
        ];

        $district = fake()->unique()->randomElement($districts);

        return [
            'name' => $district['name'],
            'state' => 'Uttar Pradesh',
            'code' => $district['code'],
        ];
    }
}
