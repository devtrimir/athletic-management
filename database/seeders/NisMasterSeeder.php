<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\NisMaster;
use Illuminate\Database\Seeder;

class NisMasterSeeder extends Seeder
{
    public function run(): void
    {
        $masters = [
            [
                'kind' => 'nis',
                'code' => 'NIS_6_WK_CERT',
                'name' => 'NIS 6 week certificate',
                'short_name' => '6 week certificate',
                'sort_order' => 1,
                'is_active' => true,
                'metadata' => [
                    'duration_weeks' => 6,
                    'duration_months' => 1.5,
                ],
            ],
            [
                'kind' => 'nis',
                'code' => 'NIS_DIPLOMA',
                'name' => 'NIS diploma',
                'short_name' => 'Diploma',
                'sort_order' => 2,
                'is_active' => true,
                'metadata' => [
                    'duration_weeks' => 52,
                    'duration_months' => 12,
                ],
            ],
        ];

        foreach ($masters as $master) {
            NisMaster::updateOrCreate(
                [
                    'kind' => $master['kind'],
                    'code' => $master['code'],
                ],
                $master,
            );
        }
    }
}
