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
    public const ALIASES = [
        // Canonical codes
        'GD' => self::GD,
        'SPORTS_QUOTA' => self::SPORTS_QUOTA,

        // Ground Duty variations
        'GROUND_DUTY' => self::GD,
        'GROUND DUTY' => self::GD,
        'GROUND_DUTIES' => self::GD,
        'GROUND DUTIES' => self::GD,
        'GENERAL_DUTY' => self::GD,
        'GENERAL DUTY' => self::GD,
        'G_D' => self::GD,
        'G.D.' => self::GD,
        'G.D' => self::GD,
        'जीडी' => self::GD,
        'जी_डी' => self::GD,
        'जी.डी.' => self::GD,
        'जी डी' => self::GD,
        'ग्राउंड_ड्यूटी' => self::GD,
        'ग्राउंड ड्यूटी' => self::GD,
        'सामान्य' => self::GD,
        'सामान्य_ड्यूटी' => self::GD,
        'सामान्य ड्यूटी' => self::GD,

        // Sports Quota variations
        'SPORT_QUOTA' => self::SPORTS_QUOTA,
        'SPORT QUOTA' => self::SPORTS_QUOTA,
        'SPORTS' => self::SPORTS_QUOTA,
        'SPORT' => self::SPORTS_QUOTA,
        'SKILLED' => self::SPORTS_QUOTA,
        'KUSHAL' => self::SPORTS_QUOTA,
        'कुशल' => self::SPORTS_QUOTA,
        'कुशल_खिलाड़ी' => self::SPORTS_QUOTA,
        'कुशल खिलाड़ी' => self::SPORTS_QUOTA,
        'खेल_कोटा' => self::SPORTS_QUOTA,
        'खेल कोटा' => self::SPORTS_QUOTA,
        'स्पोर्ट्स_कोटा' => self::SPORTS_QUOTA,
        'स्पोर्ट्स कोटा' => self::SPORTS_QUOTA,
        'स्पोर्ट_कोटा' => self::SPORTS_QUOTA,
        'स्पोर्ट कोटा' => self::SPORTS_QUOTA,
    ];

    /** @var array<string, string> */
    private const LABEL_KEYS = [
        self::GD => 'GD',
        self::SPORTS_QUOTA => 'SPORTS_QUOTA',
    ];

    /**
     * Normalize a stored or user-provided player_category value to its canonical code.
     * Returns null for empty values and unknown codes.
     */
    public static function normalize(?string $category): ?string
    {
        if ($category === null) {
            return null;
        }

        $value = preg_replace('/^\xEF\xBB\xBF/', '', $category) ?? $category;

        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value, \Normalizer::FORM_C) ?: $value;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $upper = mb_strtoupper($value, 'UTF-8');

        if (array_key_exists($upper, self::ALIASES)) {
            return self::ALIASES[$upper];
        }

        $normalizedKey = preg_replace('/[\s\-\.\_\/]+/u', '_', $upper) ?? $upper;
        $normalizedKey = trim($normalizedKey, '_');

        if (array_key_exists($normalizedKey, self::ALIASES)) {
            return self::ALIASES[$normalizedKey];
        }

        return array_key_exists($upper, self::LABEL_KEYS) ? $upper : null;
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
