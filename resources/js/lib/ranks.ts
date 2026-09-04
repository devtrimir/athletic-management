export type RankOption = {
    code: string;
    name: string;
    name_en?: string | null;
    short_name: string | null;
};

/**
 * Resolve a free-text rank value (e.g. `members.rank`) against the ranks
 * master, localized by the given locale. Case-insensitive match on `name_en`
 * and `short_name`; falls back to the raw value when nothing matches.
 */
export function resolveRankLabel(
    rankValue: string | null | undefined,
    ranks: RankOption[],
    locale: string,
): string {
    if (!rankValue) {
        return '';
    }

    const normalized = rankValue.trim().toLowerCase();
    const match = ranks.find(
        (rank) =>
            rank.name_en?.trim().toLowerCase() === normalized ||
            rank.short_name?.trim().toLowerCase() === normalized,
    );

    if (!match) {
        return rankValue;
    }

    return locale === 'hi'
        ? (match.name ?? match.name_en ?? match.short_name ?? rankValue)
        : (match.name_en ?? match.short_name ?? match.name ?? rankValue);
}
