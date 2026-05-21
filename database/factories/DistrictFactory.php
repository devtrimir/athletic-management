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
            ['name_hi' => 'लखनऊ',    'name_en' => 'Lucknow',     'code' => 'LKO'],
            ['name_hi' => 'आगरा',     'name_en' => 'Agra',        'code' => 'AGR'],
            ['name_hi' => 'वाराणसी',  'name_en' => 'Varanasi',    'code' => 'VNS'],
            ['name_hi' => 'कानपुर',   'name_en' => 'Kanpur',      'code' => 'KNP'],
            ['name_hi' => 'प्रयागराज', 'name_en' => 'Prayagraj',   'code' => 'PRY'],
            ['name_hi' => 'मेरठ',     'name_en' => 'Meerut',      'code' => 'MRT'],
            ['name_hi' => 'गाज़ियाबाद', 'name_en' => 'Ghaziabad',  'code' => 'GZB'],
            ['name_hi' => 'बरेली',    'name_en' => 'Bareilly',    'code' => 'BRL'],
        ];

        $district = fake()->unique()->randomElement($districts);

        return [
            'name_hi' => $district['name_hi'],
            'name_en' => $district['name_en'],
            'state' => 'Uttar Pradesh',
            'code' => $district['code'],
        ];
    }
}
