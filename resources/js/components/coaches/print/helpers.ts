import { formatDate, formatDateRange } from '@/lib/dates';
import type {
    Coach,
    CoachPromotion,
    PromotionEvidenceTableRow,
    TournamentTierInfo,
} from './types';

export function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
}

export function humanize(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export { formatDate };

export function formatTournamentDateRange(tournament: {
    date_from?: string | null;
    date_to?: string | null;
}): string {
    return formatDateRange(tournament.date_from, tournament.date_to, ' - ', '');
}

export function genderLabel(value: string | null | undefined): string {
    if (value === 'M') {
        return 'Male';
    }

    if (value === 'F') {
        return 'Female';
    }

    if (value === 'O') {
        return 'Other';
    }

    return value ?? '';
}

export function rankLabel(coach: Coach): string {
    return (
        coach.rank_master?.name ??
        coach.rank_master?.short_name ??
        coach.rank_master?.code ??
        ''
    );
}

const TIER_FALLBACKS: Record<string, { en: string; hi: string }> = {
    INTERNATIONAL: { en: 'International', hi: 'अंतरराष्ट्रीय' },
    NATIONAL: { en: 'National', hi: 'राष्ट्रीय' },
    AIPSC: { en: 'All India Police (AIPSC)', hi: 'अखिल भारतीय पुलिस (AIPSC)' },
    STATE: { en: 'State', hi: 'राज्य' },
    ZONAL: { en: 'Zonal', hi: 'क्षेत्रीय' },
    OTHER: { en: 'Other', hi: 'अन्य' },
};

export function tierLabel(
    tier: TournamentTierInfo | null | undefined,
    locale: string,
    t: (key: string) => string,
): string | null {
    if (!tier) {
        return null;
    }

    const configured =
        locale === 'en'
            ? (tier.tier_label_en ?? tier.tier_label)
            : (tier.tier_label_hi ?? tier.tier_label);

    if (configured) {
        return configured;
    }

    if (tier.tier_code) {
        const codeUpper = tier.tier_code.toUpperCase();
        const fallback = TIER_FALLBACKS[codeUpper];

        if (fallback) {
            return locale === 'en' ? fallback.en : fallback.hi;
        }

        const translated = t(tier.tier_code);

        return translated === tier.tier_code
            ? humanize(tier.tier_code)
            : translated;
    }

    return null;
}

export function hasAnyValue<T>(
    items: T[],
    extractor: (item: T) => unknown,
): boolean {
    return items.some((item) => hasValue(extractor(item)));
}

export function genderClassLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string | null {
    if (!value) {
        return null;
    }

    const labels: Record<string, string> = {
        F: 'Female',
        M: 'Male',
        MIXED: 'Mixed',
        OPEN: 'Open',
        O: 'Other',
    };

    return t(labels[value.toUpperCase()] ?? humanize(value));
}

export function hasPromotionFields(row: CoachPromotion): boolean {
    const hasRankChange = !!(
        row.from_rank &&
        row.to_rank &&
        row.from_rank !== row.to_rank
    );

    return !!(row.promotion_date || hasRankChange || row.reason || row.remarks);
}

export function hasRewardFields(row: CoachPromotion): boolean {
    return !!(
        row.cash_reward_amount ||
        row.cash_reward_date ||
        row.cash_reward_reference ||
        row.cash_reward_remarks
    );
}

export function promotionEvidenceKey(
    evidence: CoachPromotion['evidences'][number],
): string {
    if (evidence.tournament?.id && evidence.event?.id) {
        return `event:${evidence.tournament.id}:${evidence.event.id}`;
    }

    return `evidence:${evidence.id}`;
}

export function medalCountsResultLabel(
    medalCounts: Record<string, number> | undefined,
    locale: string,
    t: (key: string) => string,
): string | null {
    if (!medalCounts) {
        return null;
    }

    const parts = (['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const)
        .filter((medal) => (medalCounts[medal] ?? 0) > 0)
        .map((medal) => {
            const label = locale === 'hi' ? t(medal) : humanize(medal);
            const count = medalCounts[medal];

            return count > 1 ? `${label}: ${count}` : label;
        });

    return parts.length > 0 ? parts.join(', ') : null;
}

export function promotionEvidenceTableRows(
    row: CoachPromotion,
    locale: string,
    t: (key: string) => string,
): PromotionEvidenceTableRow[] {
    const rows = new Map<string, PromotionEvidenceTableRow>();

    for (const evidence of row.evidences) {
        const result =
            medalCountsResultLabel(evidence.medal_counts, locale, t) ??
            (evidence.achievement?.medal_type
                ? t(evidence.achievement.medal_type) ===
                  evidence.achievement.medal_type
                    ? humanize(evidence.achievement.medal_type)
                    : t(evidence.achievement.medal_type)
                : evidence.achievement?.position != null
                  ? `${t('Position')}: ${evidence.achievement.position}`
                  : null);

        const eventType = evidence.event?.event_type
            ? evidence.event.event_type === 'team'
                ? t('Team')
                : t('Individual')
            : evidence.team
              ? t('Team')
              : null;

        rows.set(promotionEvidenceKey(evidence), {
            key: promotionEvidenceKey(evidence),
            session: evidence.session?.name,
            tournament: evidence.tournament?.name ?? evidence.summary,
            venue: evidence.tournament?.venue,
            date: evidence.tournament
                ? formatTournamentDateRange(evidence.tournament)
                : '',
            tier: tierLabel(evidence.tournament, locale, t),
            event: evidence.event?.name,
            eventType,
            gender: genderClassLabel(evidence.event?.gender_class, t),
            result,
            players: evidence.players,
        });
    }

    return Array.from(rows.values());
}

export function computeRowSpans<T>(
    rows: T[],
    keyFn: (row: T) => string,
): number[] {
    const spans = new Array(rows.length).fill(1);
    let i = 0;

    while (i < rows.length) {
        let j = i + 1;

        while (j < rows.length && keyFn(rows[j]) === keyFn(rows[i])) {
            spans[j] = 0;
            j++;
        }

        spans[i] = j - i;
        i = j;
    }

    return spans;
}

export function groupPromotionEvidenceRows(
    rows: PromotionEvidenceTableRow[],
): { key: string; rows: PromotionEvidenceTableRow[] }[] {
    const groups: { key: string; rows: PromotionEvidenceTableRow[] }[] = [];
    const groupIndexByKey = new Map<string, number>();

    for (const row of rows) {
        const key = [
            row.session,
            row.tournament,
            row.venue,
            row.date,
            row.tier,
        ].join('|');

        const existingIndex = groupIndexByKey.get(key);

        if (existingIndex !== undefined) {
            groups[existingIndex].rows.push(row);
            continue;
        }

        groupIndexByKey.set(key, groups.length);
        groups.push({ key, rows: [row] });
    }

    return groups;
}
