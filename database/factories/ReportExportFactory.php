<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\ReportExport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportExport> */
class ReportExportFactory extends Factory
{
    protected $model = ReportExport::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'organization_id' => $organization,
            'user_id' => User::factory()->for($organization),
            'report_type' => 'medals',
            'format' => 'pdf',
            'status' => ReportExport::STATUS_PENDING,
            'filters' => [],
            'options' => ['sections' => ['detail'], 'orientation' => 'landscape', 'group_by' => 'tier'],
        ];
    }
}
