<?php

namespace Database\Seeders;

use App\Models\Competition;
use App\Models\GameLevel;
use App\Models\Organization;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Database\Seeder;

/**
 * Game levels, their competitions, and points table Version 1 as written on the
 * unit's "Performance" sheet. Version 1 has no start date, so it covers every
 * tournament until a later version is published.
 *
 * Idempotent: existing levels, competitions and a Version 1 are left alone, so
 * running it again never overwrites what an admin has edited.
 */
class PointSchemeSeeder extends Seeder
{
    /** @var list<string> Order of the four points columns on the sheet: G, S, B, P. */
    private const RESULTS = ['GOLD', 'SILVER', 'BRONZE', 'PARTICIPATION'];

    /**
     * @return list<array{code: string, name_en: string, name_hi: string, points: list<int>, competitions: list<array{0: string, 1: string}>}>
     */
    public static function levels(): array
    {
        return [
            [
                'code' => 'OLYMPIC',
                'name_en' => 'Olympic Games',
                'name_hi' => 'ओलंपिक खेल',
                'points' => [100, 90, 80, 70],
                'competitions' => [['Olympic Games', 'ओलंपिक खेल']],
            ],
            [
                'code' => 'WORLD',
                'name_en' => 'World Cup / World Championship',
                'name_hi' => 'विश्व कप / विश्व चैंपियनशिप',
                'points' => [90, 80, 70, 60],
                'competitions' => [
                    ['World Cup', 'विश्व कप'],
                    ['World Championship', 'विश्व चैंपियनशिप'],
                ],
            ],
            [
                'code' => 'SENIOR_CONTINENTAL',
                'name_en' => 'Asian / Commonwealth (Senior)',
                'name_hi' => 'एशियाई / राष्ट्रमंडल (सीनियर)',
                'points' => [80, 70, 60, 50],
                'competitions' => [
                    ['Asian Games', 'एशियाई खेल'],
                    ['Commonwealth Games', 'राष्ट्रमंडल खेल'],
                    ['Commonwealth Championship', 'राष्ट्रमंडल चैंपियनशिप'],
                    ['Asian Championship (Senior)', 'एशियाई चैंपियनशिप (सीनियर)'],
                    ['Asia Cup', 'एशिया कप'],
                ],
            ],
            [
                'code' => 'YOUTH_JUNIOR_UNIVERSITY',
                'name_en' => 'Youth / Junior / University',
                'name_hi' => 'युवा / जूनियर / विश्वविद्यालय',
                'points' => [70, 60, 50, 40],
                'competitions' => [
                    ['Youth Olympic Games', 'युवा ओलंपिक खेल'],
                    ['Asian Championship (Junior)', 'एशियाई चैंपियनशिप (जूनियर)'],
                    ['Commonwealth Youth Games', 'राष्ट्रमंडल युवा खेल'],
                    ['South Asian Games', 'दक्षिण एशियाई खेल'],
                    ['World University Games', 'विश्व विश्वविद्यालय खेल'],
                    ['World University Championship', 'विश्व विश्वविद्यालय चैंपियनशिप'],
                ],
            ],
            [
                'code' => 'NATIONAL',
                'name_en' => 'National Games / Championship',
                'name_hi' => 'राष्ट्रीय खेल / चैंपियनशिप',
                'points' => [60, 50, 40, 30],
                'competitions' => [
                    ['National Games', 'राष्ट्रीय खेल'],
                    ['National Championship', 'राष्ट्रीय चैंपियनशिप'],
                ],
            ],
            [
                'code' => 'FEDERATION',
                'name_en' => 'Federation Cup / Inter-State / Inter-University',
                'name_hi' => 'फेडरेशन कप / अंतर-राज्यीय / अंतर-विश्वविद्यालय',
                'points' => [50, 40, 30, 20],
                'competitions' => [
                    ['Federation Cup (AIP)', 'फेडरेशन कप (एआईपी)'],
                    ['All India Inter-State Championship (Senior)', 'अखिल भारतीय अंतर-राज्यीय चैंपियनशिप (सीनियर)'],
                    ['All India Inter-University Championship', 'अखिल भारतीय अंतर-विश्वविद्यालय चैंपियनशिप'],
                    ['World School Games', 'विश्व स्कूल खेल'],
                    ['World University Games (U-19)', 'विश्व विश्वविद्यालय खेल (19 वर्ष से कम)'],
                ],
            ],
        ];
    }

    public function run(): void
    {
        Organization::query()->each(fn (Organization $organization) => $this->seedOrganization($organization));
    }

    public function seedOrganization(Organization $organization): void
    {
        $levelIds = [];

        foreach (self::levels() as $order => $level) {
            $model = GameLevel::withoutGlobalScope(BelongsToOrganization::class)->firstOrCreate(
                ['organization_id' => $organization->id, 'code' => $level['code']],
                ['name_en' => $level['name_en'], 'name_hi' => $level['name_hi'], 'sort_order' => $order + 1, 'is_active' => true],
            );
            $levelIds[$level['code']] = $model->id;

            foreach ($level['competitions'] as $position => [$nameEn, $nameHi]) {
                Competition::withoutGlobalScope(BelongsToOrganization::class)->firstOrCreate(
                    ['organization_id' => $organization->id, 'name_en' => $nameEn],
                    ['game_level_id' => $model->id, 'name_hi' => $nameHi, 'sort_order' => $position + 1, 'is_active' => true],
                );
            }
        }

        if (PointScheme::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $organization->id)
            ->where('version_number', 1)
            ->exists()) {
            return;
        }

        $scheme = PointScheme::withoutGlobalScope(BelongsToOrganization::class)->create([
            'organization_id' => $organization->id,
            'version_number' => 1,
            'name' => 'Version 1',
            'status' => PointScheme::STATUS_ACTIVE,
            'effective_from' => null,
            'published_at' => now(),
            'notes' => 'From the handwritten Performance points sheet. Applies to every tournament until a later version is published.',
        ]);

        foreach (self::levels() as $level) {
            foreach (self::RESULTS as $index => $result) {
                PointSchemeRow::create([
                    'point_scheme_id' => $scheme->id,
                    'game_level_id' => $levelIds[$level['code']],
                    'result' => $result,
                    'points' => $level['points'][$index],
                ]);
            }
        }
    }
}
