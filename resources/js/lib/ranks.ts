export type RankOption = {
    code: string;
    name: string;
    name_en?: string | null;
    short_name: string | null;
};

/**
 * Resolve a free-text rank value (e.g. `members.rank`) against the ranks
 * master. Always returns the stored rank name; codes and locale are ignored.
 */
export function resolveRankLabel(
    rankValue: string | null | undefined,
    ranks: RankOption[],
    locale: string,
): string {
    void locale;

    if (!rankValue) {
        return '';
    }

    const normalized = rankValue.trim().toLowerCase();
    const match = ranks.find(
        (rank) =>
            rank.code.trim().toLowerCase() === normalized ||
            rank.name.trim().toLowerCase() === normalized ||
            rank.name_en?.trim().toLowerCase() === normalized ||
            rank.short_name?.trim().toLowerCase() === normalized,
    );

    if (!match) {
        return rankValue;
    }

    return match.name;
}
