import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type MedalCounts = {
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
};

type SessionSummaryRow = {
    session: { id: number; name: string };
    points: number;
    participation_count: number;
    achievement_count: number;
    award_count: number;
    medals: MedalCounts;
};

type LedgerRow = {
    participation_id: number;
    session: { id: number | null; name: string | null };
    sport: { id: number; name: string } | null;
    tournament: {
        id: number;
        name: string;
        date_from: string | null;
        tier: {
            id: number;
            code: string;
            label_hi: string;
            label_en: string;
            weight: number;
        } | null;
    } | null;
    event: { id: number; name: string } | null;
    achievement: {
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
    } | null;
    awards: Array<{
        id: number;
        award_type: string;
        title: string;
        points: number;
    }>;
    scoring: {
        participation_points: number;
        medal_points: number;
        tier_bonus_points: number;
        award_points: number;
        total_points: number;
    };
};

type FilteredSessionSummaryRow = {
    session: { id: number | null; name: string | null };
    points: number;
    participation_count: number;
    achievement_count: number;
    award_count: number;
    medals: MedalCounts;
};

type TierGroup = {
    key: string;
    label: string;
    weight: number;
    rows: LedgerRow[];
};

export type MemberPerformanceData = {
    summary: {
        overall_points: number;
        current_session_points: number;
        overall_rank: number | null;
        current_session_rank: number | null;
        participation_count: number;
        achievement_count: number;
        award_count: number;
        medals: MedalCounts;
        current_session: { id: number; name: string } | null;
    };
    sessions: SessionSummaryRow[];
    ledger: LedgerRow[];
};

const ALL = 'all';
const CURRENT = 'current';

function medalLabel(row: LedgerRow): string {
    if (row.achievement === null) {
        return '—';
    }

    return row.achievement.position !== null
        ? `${row.achievement.medal_type} #${row.achievement.position}`
        : row.achievement.medal_type;
}

function awardLabel(row: LedgerRow): string {
    if (row.awards.length === 0) {
        return '—';
    }

    return row.awards
        .map((award) => `${award.title} (${award.points})`)
        .join(', ');
}

function emptyMedals(): MedalCounts {
    return {
        GOLD: 0,
        SILVER: 0,
        BRONZE: 0,
        MERIT: 0,
    };
}

function tierMeta(
    row: LedgerRow,
    t: (key: string) => string,
): { key: string; label: string; weight: number } {
    const tier = row.tournament?.tier;

    if (tier === null || tier === undefined) {
        return {
            key: 'NO_TIER',
            label: t('No tier'),
            weight: -1,
        };
    }

    return {
        key: String(tier.id),
        label: tier.label_hi,
        weight: tier.weight,
    };
}

export function MemberPerformanceTab({
    performance,
    showFilters = true,
}: {
    performance?: MemberPerformanceData;
    showFilters?: boolean;
}) {
    const { t } = useTranslation();
    const compactMode = showFilters === false;
    const [sessionFilter, setSessionFilter] = useState<string>(ALL);
    const [sportFilter, setSportFilter] = useState<string>(ALL);
    const [tierFilter, setTierFilter] = useState<string>(ALL);
    const [medalFilter, setMedalFilter] = useState<string>(ALL);
    const [awardFilter, setAwardFilter] = useState<string>(ALL);
    const [viewFilter, setViewFilter] = useState<string>(ALL);
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const ledger = useMemo(() => performance?.ledger ?? [], [performance]);
    const currentSessionId = performance?.summary.current_session?.id ?? null;

    const sessionOptions = useMemo(
        () =>
            ledger.reduce<Array<{ id: string; name: string }>>((carry, row) => {
                if (row.session.id === null || row.session.name === null) {
                    return carry;
                }

                if (
                    carry.some((option) => option.id === String(row.session.id))
                ) {
                    return carry;
                }

                carry.push({
                    id: String(row.session.id),
                    name: row.session.name,
                });

                return carry;
            }, []),
        [ledger],
    );

    const sportOptions = useMemo(
        () =>
            ledger.reduce<Array<{ id: string; name: string }>>((carry, row) => {
                if (row.sport === null) {
                    return carry;
                }

                if (
                    carry.some((option) => option.id === String(row.sport?.id))
                ) {
                    return carry;
                }

                carry.push({
                    id: String(row.sport.id),
                    name: row.sport.name,
                });

                return carry;
            }, []),
        [ledger],
    );

    const tierOptions = useMemo(
        () =>
            ledger.reduce<Array<{ id: string; name: string }>>((carry, row) => {
                const tier = row.tournament?.tier;

                if (tier === null || tier === undefined) {
                    return carry;
                }

                if (carry.some((option) => option.id === String(tier.id))) {
                    return carry;
                }

                carry.push({
                    id: String(tier.id),
                    name: tier.label_hi,
                });

                return carry;
            }, []),
        [ledger],
    );

    const awardOptions = useMemo(
        () =>
            ledger.reduce<Array<{ id: string; name: string }>>((carry, row) => {
                for (const award of row.awards) {
                    if (
                        carry.some((option) => option.id === award.award_type)
                    ) {
                        continue;
                    }

                    carry.push({
                        id: award.award_type,
                        name: award.title,
                    });
                }

                return carry;
            }, []),
        [ledger],
    );

    const filteredLedger = useMemo(
        () =>
            ledger.filter((row) => {
                if (sessionFilter === CURRENT) {
                    if (row.session.id !== currentSessionId) {
                        return false;
                    }
                } else if (
                    sessionFilter !== ALL &&
                    String(row.session.id) !== sessionFilter
                ) {
                    return false;
                }

                if (
                    sportFilter !== ALL &&
                    String(row.sport?.id ?? '') !== sportFilter
                ) {
                    return false;
                }

                if (
                    tierFilter !== ALL &&
                    String(row.tournament?.tier?.id ?? '') !== tierFilter
                ) {
                    return false;
                }

                if (medalFilter === 'none' && row.achievement !== null) {
                    return false;
                }

                if (
                    medalFilter !== ALL &&
                    medalFilter !== 'none' &&
                    row.achievement?.medal_type !== medalFilter
                ) {
                    return false;
                }

                if (
                    awardFilter !== ALL &&
                    !row.awards.some(
                        (award) => award.award_type === awardFilter,
                    )
                ) {
                    return false;
                }

                if (viewFilter === 'medals' && row.achievement === null) {
                    return false;
                }

                if (viewFilter === 'awards' && row.awards.length === 0) {
                    return false;
                }

                if (
                    viewFilter === 'participation_only' &&
                    (row.achievement !== null || row.awards.length > 0)
                ) {
                    return false;
                }

                if (
                    dateFromFilter &&
                    (!row.tournament?.date_from ||
                        row.tournament.date_from < dateFromFilter)
                ) {
                    return false;
                }

                if (
                    dateToFilter &&
                    (!row.tournament?.date_from ||
                        row.tournament.date_from > dateToFilter)
                ) {
                    return false;
                }

                return true;
            }),
        [
            awardFilter,
            currentSessionId,
            dateFromFilter,
            dateToFilter,
            medalFilter,
            ledger,
            sessionFilter,
            sportFilter,
            tierFilter,
            viewFilter,
        ],
    );

    const filteredSummary = useMemo(() => {
        const medals = emptyMedals();

        for (const row of filteredLedger) {
            const medalType = row.achievement?.medal_type;

            if (medalType !== undefined && medalType in medals) {
                medals[medalType as keyof MedalCounts] += 1;
            }
        }

        return {
            points: filteredLedger.reduce(
                (sum, row) => sum + row.scoring.total_points,
                0,
            ),
            participation_count: filteredLedger.length,
            achievement_count: filteredLedger.filter(
                (row) => row.achievement !== null,
            ).length,
            award_count: filteredLedger.reduce(
                (sum, row) => sum + row.awards.length,
                0,
            ),
            medals,
        };
    }, [filteredLedger]);

    const filteredSessions = useMemo(() => {
        const grouped = new Map<string, FilteredSessionSummaryRow>();

        for (const row of filteredLedger) {
            const key = String(row.session.id ?? '0');
            const current = grouped.get(key) ?? {
                session: row.session,
                points: 0,
                participation_count: 0,
                achievement_count: 0,
                award_count: 0,
                medals: emptyMedals(),
            };

            current.points += row.scoring.total_points;
            current.participation_count += 1;
            current.achievement_count += row.achievement === null ? 0 : 1;
            current.award_count += row.awards.length;

            if (
                row.achievement?.medal_type &&
                row.achievement.medal_type in current.medals
            ) {
                current.medals[
                    row.achievement.medal_type as keyof MedalCounts
                ] += 1;
            }

            grouped.set(key, current);
        }

        return Array.from(grouped.values()).sort(
            (left, right) => (right.session.id ?? 0) - (left.session.id ?? 0),
        );
    }, [filteredLedger]);

    const groupedLedger = useMemo(() => {
        const groups = new Map<string, TierGroup>();

        for (const row of filteredLedger) {
            const tier = tierMeta(row, t);
            const current = groups.get(tier.key) ?? {
                key: tier.key,
                label: tier.label,
                weight: tier.weight,
                rows: [],
            };

            current.rows.push(row);
            groups.set(tier.key, current);
        }

        return Array.from(groups.values()).sort(
            (left, right) => right.weight - left.weight,
        );
    }, [filteredLedger, t]);

    if (performance === undefined) {
        return null;
    }

    const compactTableClasses = compactMode
        ? '[&_th]:px-2 [&_th]:py-2 [&_th]:text-[11px] [&_td]:px-2 [&_td]:py-2 [&_td]:text-xs'
        : '';

    return (
        <div className="space-y-6">
            {showFilters && (
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold">{t('Filters')}</h3>
                    <div className="flex flex-wrap gap-3">
                        <Select
                            value={sessionFilter}
                            onValueChange={setSessionFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sessions')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Sessions')}
                                </SelectItem>
                                <SelectItem value={CURRENT}>
                                    {t('Current Session')}
                                </SelectItem>
                                {sessionOptions.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id}
                                    >
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={sportFilter}
                            onValueChange={setSportFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sports')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Sports')}
                                </SelectItem>
                                {sportOptions.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id}
                                    >
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={tierFilter}
                            onValueChange={setTierFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Tiers')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Tiers')}
                                </SelectItem>
                                {tierOptions.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id}
                                    >
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={medalFilter}
                            onValueChange={setMedalFilter}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('All medals')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All medals')}
                                </SelectItem>
                                <SelectItem value="GOLD">
                                    {t('GOLD')}
                                </SelectItem>
                                <SelectItem value="SILVER">
                                    {t('SILVER')}
                                </SelectItem>
                                <SelectItem value="BRONZE">
                                    {t('BRONZE')}
                                </SelectItem>
                                <SelectItem value="MERIT">
                                    {t('MERIT')}
                                </SelectItem>
                                <SelectItem value="none">
                                    {t('No medal')}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={awardFilter}
                            onValueChange={setAwardFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All awards')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All awards')}
                                </SelectItem>
                                {awardOptions.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id}
                                    >
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={viewFilter}
                            onValueChange={setViewFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All rows')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All rows')}
                                </SelectItem>
                                <SelectItem value="medals">
                                    {t('Achievements')}
                                </SelectItem>
                                <SelectItem value="awards">
                                    {t('Awards')}
                                </SelectItem>
                                <SelectItem value="participation_only">
                                    {t('Participation only')}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            value={dateFromFilter}
                            onChange={(event) =>
                                setDateFromFilter(event.target.value)
                            }
                            className="w-40"
                            aria-label={t('Date from')}
                        />

                        <Input
                            type="date"
                            value={dateToFilter}
                            onChange={(event) =>
                                setDateToFilter(event.target.value)
                            }
                            className="w-40"
                            aria-label={t('Date to')}
                        />
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('Performance')}</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Points')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {filteredSummary.points}
                        </div>
                    </div>

                    <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Current Session')}
                        </div>
                        <div className="truncate text-sm font-medium">
                            {performance.summary.current_session?.name ?? '—'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            {t('Current session points')}{' '}
                            <span className="font-medium text-foreground tabular-nums">
                                {sessionFilter === CURRENT
                                    ? filteredSummary.points
                                    : performance.summary
                                          .current_session_points}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Overall rank')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {performance.summary.overall_rank ?? '—'}
                        </div>
                    </div>

                    <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Current session rank')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {performance.summary.current_session_rank ?? '—'}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('Participations')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.participation_count}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('Achievements')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.achievement_count}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('Awards')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.award_count}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('GOLD')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.medals.GOLD}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('SILVER')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.medals.SILVER}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('BRONZE')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.medals.BRONZE}
                        </div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {t('MERIT')}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                            {filteredSummary.medals.MERIT}
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('Session totals')}</h3>
                <div
                    className={`overflow-x-auto rounded-md border ${compactTableClasses}`}
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Session')}</TableHead>
                                <TableHead className="text-right">
                                    {t('Participations')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('Achievements')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('Awards')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('GOLD')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('SILVER')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('BRONZE')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('MERIT')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('Points')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSessions.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="py-6 text-center text-sm text-muted-foreground"
                                    >
                                        {t('No performance data yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSessions.map((row) => (
                                    <TableRow
                                        key={
                                            row.session.id ??
                                            `session-${row.points}`
                                        }
                                    >
                                        <TableCell className="font-medium">
                                            {row.session.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.participation_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.achievement_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.award_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.medals.GOLD}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.medals.SILVER}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.medals.BRONZE}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.medals.MERIT}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">
                                            {row.points}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('Event ledger')}</h3>
                {groupedLedger.length === 0 ? (
                    <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
                        {t('No performance data yet.')}
                    </div>
                ) : (
                    groupedLedger.map((group) => (
                        <div key={group.key} className="space-y-2">
                            <h4 className="text-sm font-medium">
                                {group.label}
                            </h4>
                            <div
                                className={`overflow-x-auto rounded-md border ${compactTableClasses}`}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t('Session')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Tournament')}
                                            </TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>{t('Event')}</TableHead>
                                            <TableHead>{t('Medal')}</TableHead>
                                            <TableHead>{t('Awards')}</TableHead>
                                            <TableHead className="text-right">
                                                {t('Participation points')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Medal points')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Tier bonus')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Award points')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Points')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.rows.map((row) => (
                                            <TableRow
                                                key={row.participation_id}
                                            >
                                                <TableCell>
                                                    {row.session.name ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.tournament?.name ??
                                                        '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.sport?.name ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.event?.name ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {medalLabel(row)}
                                                </TableCell>
                                                <TableCell className="max-w-64 text-sm">
                                                    {awardLabel(row)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {
                                                        row.scoring
                                                            .participation_points
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {row.scoring.medal_points}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {
                                                        row.scoring
                                                            .tier_bonus_points
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {row.scoring.award_points}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">
                                                    {row.scoring.total_points}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
