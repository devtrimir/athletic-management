export const PLAYER_CATEGORIES = ['GD', 'SPORTS_QUOTA'] as const;

export type PlayerCategoryCode = (typeof PLAYER_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, PlayerCategoryCode> = {
    GD: 'GD',
    GROUND_DUTY: 'GD',
    GROUND_DUTIES: 'GD',
    GENERAL_DUTY: 'GD',
    G_D: 'GD',
    जीडी: 'GD',
    जी_डी: 'GD',
    ग्राउंड_ड्यूटी: 'GD',
    सामान्य: 'GD',
    सामान्य_ड्यूटी: 'GD',

    SPORTS_QUOTA: 'SPORTS_QUOTA',
    SPORT_QUOTA: 'SPORTS_QUOTA',
    SPORTS: 'SPORTS_QUOTA',
    SPORT: 'SPORTS_QUOTA',
    SKILLED: 'SPORTS_QUOTA',
    KUSHAL: 'SPORTS_QUOTA',
    कुशल: 'SPORTS_QUOTA',
    कुशल_खिलाड़ी: 'SPORTS_QUOTA',
    खेल_कोटा: 'SPORTS_QUOTA',
    स्पोर्ट्स_कोटा: 'SPORTS_QUOTA',
    स्पोर्ट_कोटा: 'SPORTS_QUOTA',
};

/**
 * Normalize a stored or user-provided player_category value to a canonical code.
 * Handles singular 'Sport Quota', legacy 'SKILLED', Hindi terms, and raw codes.
 */
export function normalizePlayerCategory(
    category: string | null | undefined,
): PlayerCategoryCode | null {
    if (!category) {
        return null;
    }

    const trimmed = category.trim();
    if (trimmed === '') {
        return null;
    }

    const normalized = trimmed.normalize('NFC');
    const upper = normalized.toUpperCase();

    if (upper in CATEGORY_ALIASES) {
        return CATEGORY_ALIASES[upper];
    }

    const key = upper.replace(/[\s\-._/]+/g, '_').replace(/^_+|_+$/g, '');

    if (key in CATEGORY_ALIASES) {
        return CATEGORY_ALIASES[key];
    }

    return (PLAYER_CATEGORIES as readonly string[]).includes(upper)
        ? (upper as PlayerCategoryCode)
        : null;
}

/**
 * Resolve a player_category code to its display label (GD -> Ground Duty,
 * SPORTS_QUOTA -> Sports Quota) through the active translation. Unknown
 * values fall back to the trimmed raw value.
 */
export function playerCategoryLabel(
    category: string | null | undefined,
    t: (key: string) => string,
): string {
    const code = normalizePlayerCategory(category);

    if (code !== null) {
        return t(code);
    }

    return category?.trim() ?? '';
}
