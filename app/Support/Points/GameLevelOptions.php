<?php

declare(strict_types=1);

namespace App\Support\Points;

use App\Models\GameLevel;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;

class GameLevelOptions
{
    /**
     * Active game levels for a dropdown, each labelled with the points version in force today and
     * showing its Gold/Silver/Bronze/Participation points (a hint: a tournament is scored with the
     * version in force on its own start date).
     *
     * @return list<array{id: int, label: string, description: string|null}>
     */
    public static function forOrganization(int $orgId): array
    {
        $column = app()->getLocale() === 'en' ? 'name_en' : 'name_hi';
        $scheme = PointScheme::withoutGlobalScopes()->where('organization_id', $orgId)->inForceOn(now()->toDateString())->first();
        $initials = ['GOLD' => 'G', 'SILVER' => 'S', 'BRONZE' => 'B', 'PARTICIPATION' => 'P'];
        $byLevel = [];

        foreach (PointSchemeRow::where('point_scheme_id', $scheme?->id)->get() as $row) {
            $byLevel[$row->game_level_id][$row->result] = $row->points;
        }

        $options = [];

        foreach (GameLevel::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get() as $level) {
            $options[] = [
                'id' => $level->id,
                'label' => $level->{$column}.($scheme ? ' · '.__('Version').' '.$scheme->version_number : ''),
                'description' => isset($byLevel[$level->id])
                    ? implode(' · ', array_map(fn (string $result, string $initial): string => $initial.($byLevel[$level->id][$result] ?? 0), array_keys($initials), $initials))
                    : null,
            ];
        }

        return $options;
    }
}
