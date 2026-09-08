<?php

declare(strict_types=1);

namespace App\Support\Members;

/**
 * Single authority for resolving member player_category codes (GD, SPORTS_QUOTA)
 * to display labels. Labels live in the en/hi JSON translation files, so this
 * resolver only normalizes codes (legacy 'SKILLED' maps to SPORTS_QUOTA) and
 * routes to the right translation key. GD means Ground Duty.
 */
class PlayerCategory
{
    public const GD = 'GD';

    public const SPORTS_QUOTA = 'SPORTS_QUOTA';

    /** @var array<string, string> */
    private const LABEL_KEYS = [
        self::GD => 'GD',
        self::SPORTS_QUOTA => 'SPORTS_QUOTA',
    ];

    /**
     * Normalize a stored player_category value to its canonical code.
     * Returns null for empty values and unknown codes.
     */
    public static function normalize(?string $category): ?string
    {
        $value = $category !== null ? mb_strtoupper(trim($category)) : '';

        if ($value === '') {
            return null;
        }

        if ($value === 'SKILLED') {
            return self::SPORTS_QUOTA;
        }

        return array_key_exists($value, self::LABEL_KEYS) ? $value : null;
    }

    /**
     * Resolve a player_category value to its translated display label
     * (GD -> Ground Duty, SPORTS_QUOTA -> Sports Quota). Unknown values fall
     * back to the trimmed raw value; empty values return null.
     */
    public static function label(?string $category): ?string
    {
        $code = self::normalize($category);

        if ($code !== null) {
            return __(self::LABEL_KEYS[$code]);
        }

        if ($category !== null && trim($category) !== '') {
            return trim($category);
        }

        return null;
    }
}
