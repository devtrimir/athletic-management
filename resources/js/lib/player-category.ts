export const PLAYER_CATEGORIES = ['GD', 'SPORTS_QUOTA'] as const;

export type PlayerCategoryCode = (typeof PLAYER_CATEGORIES)[number];

/**
 * Normalize a stored player_category value to a canonical code. Legacy
 * imports may carry 'SKILLED', which is treated as SPORTS_QUOTA.
 */
export function normalizePlayerCategory(
    category: string | null | undefined,
): PlayerCategoryCode | null {
    const value = category?.trim().toUpperCase() ?? '';

    if (value === '') {
        return null;
    }

    if (value === 'SKILLED') {
        return 'SPORTS_QUOTA';
    }

    return (PLAYER_CATEGORIES as readonly string[]).includes(value)
        ? (value as PlayerCategoryCode)
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
