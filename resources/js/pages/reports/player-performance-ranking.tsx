import {
    Head,
    router,
    setLayoutProps,
    useHttp,
    usePage,
} from '@inertiajs/react';
import { Fragment, useState } from 'react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import {
    DateRangePill,
    FilterPill,
    MultiOptionList,
    OptionList,
    TextFilterPill,
    dateRangePresets,
} from '@/components/data-table/filter-pill';
import { ListingLayout } from '@/components/data-table/listing-layout';
import {
    listingCellClass,
    listingHeadCellClass,
    listingTableClass,
} from '@/components/data-table/table-primitives';
import type { MemberOption } from '@/components/member-picker';
import { MemberPerformanceTab } from '@/components/members/member-performance-tab';
import type { MemberPerformanceData } from '@/components/members/member-performance-tab';
import { MembersMultiSelect } from '@/components/members-multi-select';
import type { MultiSelectOption } from '@/components/option-multi-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import type { RankOption } from '@/lib/ranks';
import { resolveRankLabel } from '@/lib/ranks';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label_hi: string; label_en: string };
type Unit = { id: number; name: string };
type District = { id: number; name: string };
type ReportMeta = {
    key: string;
    name?: string;
    name_en?: string;
    name_hi?: string;
};
type PaginationLink = { url: string | null; label: string; active: boolean };

type MetricSummary = {
    points: number;
    participation_count: number;
    achievement_count: number;
    award_count: number;
    medals: {
        GOLD: number;
        SILVER: number;
        BRONZE: number;
        MERIT: number;
    };
};

type MemberSummaryRow = {
    rank: number | null;
    member: {
        id: number;
        full_name: string;
        member_code: string | null;
        pno: string | null;
        rank: string | null;
        district: { id: number; name: string } | null;
        unit: { id: number; name: string } | null;
    };
    participation_count: number;
    achievement_count: number;
    award_count: number;
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
    total_points: number;
};

type GroupSection = {
    key: string;
    label: string;
    dimension: string;
    dimension_id: number | null;
    summary: MetricSummary;
    rows: MemberSummaryRow[];
    subgroups?: GroupSection[];
};

type ReportData = {
    summary: MetricSummary;
    groups: GroupSection[];
    group_by: string;
    subgroup_by: string | null;
    ranking_scope: string;
    pagination: {
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        per_page: number;
    };
};

type Filters = {
    session_ids: number[];
    sport_ids: number[];
    tier_ids: number[];
    unit_ids: number[];
    district_ids: number[];
    member_ids: number[];
    limit?: number | null;
    member_name?: string | null;
    pno?: string | null;
    from_date?: string | null;
    to_date?: string | null;
    group_by?: string | null;
    subgroup_by?: string | null;
    ranking_scope?: string | null;
    page?: number | null;
};

type MemberPerformanceDetail = {
    member: {
        id: number;
        full_name: string;
        member_code: string;
        pno: string | null;
        rank: string | null;
    };
    performance: MemberPerformanceData;
};

type DrilldownRow = {
    participation_id: number;
    member: {
        id: number;
        full_name: string | null;
        pno: string | null;
        rank: string | null;
    };
    session: { id: number | null; name: string | null };
    sport: { id: number | null; name: string | null };
    tournament: {
        id: number | null;
        name: string | null;
        date_from: string | null;
        tier: { id: number | null; label_hi: string | null } | null;
    } | null;
    event: { id: number | null; name: string | null } | null;
    achievement: { medal_type: string | null; position: number | null } | null;
    awards: Array<{ id: number; title: string }>;
    scoring: {
        total_points: number;
        game_level: string | null;
        version: number | null;
    };
};

type DrilldownResponse = {
    rows: DrilldownRow[];
    summary: { count: number };
};

const LIMIT_OPTIONS = ['10', '25', '50', '100'];
const GROUP_OPTIONS = [
    { value: 'overall', label: 'Overall' },
    { value: 'sport', label: 'Sport' },
    { value: 'session', label: 'Session' },
    { value: 'tier', label: 'Tier' },
    { value: 'district', label: 'District' },
    { value: 'unit', label: 'Unit' },
    { value: 'member', label: 'Member' },
];
const SUBGROUP_OPTIONS = [
    { value: 'none', label: 'No subgroup' },
    ...GROUP_OPTIONS.filter((option) => option.value !== 'overall'),
];

export default function PlayerPerformanceRanking({
    report,
    data,
    filters,
    sessions,
    sports,
    tiers,
    units,
    districts,
    selected_members: selectedMembersProp,
    ranks,
}: {
    report: ReportMeta;
    data: ReportData;
    filters: Filters;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
    districts: District[];
    selected_members: MemberOption[];
    ranks: RankOption[];
}) {
    const { t } = useTranslation();
    const reportTitle =
        report.name ?? report.name_en ?? report.name_hi ?? t('Report');
    const { locale } = usePage().props as { locale: string };
    const { get: getMemberDetail, processing: detailLoading } = useHttp<
        Record<string, never>,
        MemberPerformanceDetail
    >({});
    const { get: getDrilldown, processing: drilldownLoading } = useHttp<
        Record<string, never>,
        DrilldownResponse
    >({});

    setLayoutProps({
        breadcrumbs: [
            { title: t('Reports'), href: ReportController.index().url },
            { title: reportTitle },
        ],
    });

    const selectedMembers = selectedMembersProp;
    const current = {
        session_ids: filters.session_ids?.map(String) ?? [],
        sport_ids: filters.sport_ids?.map(String) ?? [],
        tier_ids: filters.tier_ids?.map(String) ?? [],
        unit_ids: filters.unit_ids?.map(String) ?? [],
        district_ids: filters.district_ids?.map(String) ?? [],
        member_ids: selectedMembers.map((member) => String(member.id)),
        limit: filters.limit ? String(filters.limit) : '50',
        member_name: filters.member_name ?? '',
        pno: filters.pno ?? '',
        from_date: filters.from_date ?? '',
        to_date: filters.to_date ?? '',
        group_by: filters.group_by ?? data.group_by ?? 'overall',
        subgroup_by: filters.subgroup_by ?? data.subgroup_by ?? 'none',
        ranking_scope:
            filters.ranking_scope ?? data.ranking_scope ?? 'within_group',
    };
    type Current = typeof current;
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
        null,
    );
    const [detail, setDetail] = useState<MemberPerformanceDetail | null>(null);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownTitle, setDrilldownTitle] = useState('');
    const [drilldownRows, setDrilldownRows] = useState<DrilldownRow[]>([]);

    const hasActiveFilters =
        current.session_ids.length > 0 ||
        current.sport_ids.length > 0 ||
        current.tier_ids.length > 0 ||
        current.unit_ids.length > 0 ||
        current.district_ids.length > 0 ||
        current.member_ids.length > 0 ||
        current.member_name !== '' ||
        current.pno !== '' ||
        current.from_date !== '' ||
        current.to_date !== '' ||
        current.limit !== '50' ||
        current.group_by !== 'overall' ||
        current.subgroup_by !== 'none' ||
        current.ranking_scope !== 'within_group';

    const sessionOptions: MultiSelectOption[] = sessions.map((session) => ({
        value: String(session.id),
        label: session.name,
    }));
    const sportOptions: MultiSelectOption[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
    }));
    const tierOptions: MultiSelectOption[] = tiers.map((tier) => ({
        value: String(tier.id),
        label: tier.label_hi,
    }));
    const unitOptions: MultiSelectOption[] = units.map((unit) => ({
        value: String(unit.id),
        label: unit.name,
    }));
    const districtOptions: MultiSelectOption[] = districts.map((district) => ({
        value: String(district.id),
        label: district.name,
    }));

    function buildParams(
        patch: Partial<Current> = {},
    ): Record<string, string | string[]> {
        const merged = { ...current, ...patch };
        const params: Record<string, string | string[]> = {
            limit: merged.limit,
            group_by: merged.group_by,
            subgroup_by: merged.subgroup_by,
            ranking_scope: merged.ranking_scope,
            page: '1',
        };

        for (const key of [
            'session_ids',
            'sport_ids',
            'tier_ids',
            'unit_ids',
            'district_ids',
            'member_ids',
        ] as const) {
            if (merged[key].length > 0) {
                params[key] = merged[key];
            }
        }

        for (const key of [
            'member_name',
            'pno',
            'from_date',
            'to_date',
        ] as const) {
            if (merged[key].trim() !== '') {
                params[key] = merged[key].trim();
            }
        }

        return params;
    }

    function apply(patch: Partial<Current>) {
        router.get(ReportController.show(report.key).url, buildParams(patch), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        router.get(
            ReportController.show(report.key).url,
            {
                limit: '50',
                group_by: 'overall',
                subgroup_by: 'none',
                ranking_scope: 'within_group',
            },
            { replace: true, preserveScroll: true, preserveState: true },
        );
    }

    function openMemberDetail(memberId: number) {
        setSelectedMemberId(memberId);
        setDetailOpen(true);
        setDetail(null);

        getMemberDetail(
            ReportController.memberPerformanceDetail(
                { key: report.key, member: memberId },
                { query: buildParams() },
            ).url,
            {
                onSuccess: (response) => {
                    setDetail(response as unknown as MemberPerformanceDetail);
                },
                onError: () => {
                    setDetail(null);
                },
            },
        );
    }

    function openDrilldown({
        title,
        dimension,
        dimensionId,
        metric,
        memberId,
    }: {
        title: string;
        dimension: string;
        dimensionId?: number | null;
        metric: string;
        memberId?: number | null;
    }) {
        setDrilldownTitle(title);
        setDrilldownRows([]);
        setDrilldownOpen(true);

        const query: Record<string, string | string[]> = {
            ...buildParams(),
            dimension,
            metric,
        };

        if (dimensionId !== null && dimensionId !== undefined) {
            query['dimension_id'] = String(dimensionId);
        }

        if (memberId !== null && memberId !== undefined) {
            query['member_id'] = String(memberId);
        }

        getDrilldown(
            ReportController.playerPerformanceDrilldown(report.key, {
                query,
            }).url,
            {
                onSuccess: (response) => {
                    setDrilldownRows(
                        (response as unknown as DrilldownResponse).rows ?? [],
                    );
                },
                onError: () => {
                    setDrilldownRows([]);
                },
            },
        );
    }

    function metricCell({
        title,
        dimension,
        dimensionId,
        metric,
        value,
        memberId,
        strong = false,
    }: {
        title: string;
        dimension: string;
        dimensionId?: number | null;
        metric: string;
        value: number;
        memberId?: number | null;
        strong?: boolean;
    }) {
        return (
            <button
                type="button"
                className={`w-full tabular-nums hover:underline ${strong ? 'font-semibold' : ''}`}
                onClick={() =>
                    openDrilldown({
                        title,
                        dimension,
                        dimensionId,
                        metric,
                        memberId,
                    })
                }
            >
                {value}
            </button>
        );
    }

    function renderRows(
        rows: MemberSummaryRow[],
        dimension: string,
        dimensionId: number | null,
        label: string,
    ) {
        return (
            <div className="overflow-x-auto rounded-xl border bg-card">
                <Table
                    className={`${listingTableClass} min-w-[960px] [&_td]:text-center [&_th]:text-center`}
                >
                    <colgroup>
                        <col style={{ width: 56 }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        {Array.from({ length: 8 }, (_, i) => (
                            <col key={i} />
                        ))}
                    </colgroup>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className={listingHeadCellClass}>
                                {t('Rank')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Member')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('District')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Unit')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Participations')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Achievements')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Awards')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Gold')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Silver')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Bronze')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Merit')}
                            </TableHead>
                            <TableHead className={listingHeadCellClass}>
                                {t('Points')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={12}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    {t('No records found')}
                                </TableCell>
                            </TableRow>
                        )}

                        {rows.map((row) => (
                            <TableRow
                                key={`${dimension}-${dimensionId}-${row.member.id}`}
                            >
                                <TableCell className={listingCellClass}>
                                    {row.rank ?? '—'}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    <button
                                        type="button"
                                        className="text-left font-medium text-primary hover:underline"
                                        onClick={() =>
                                            openMemberDetail(row.member.id)
                                        }
                                    >
                                        {row.member.full_name}
                                    </button>
                                    <div className="text-xs text-muted-foreground">
                                        {[
                                            row.member.pno,
                                            row.member.rank
                                                ? resolveRankLabel(
                                                      row.member.rank,
                                                      ranks,
                                                      locale,
                                                  )
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' / ') || '—'}
                                    </div>
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    <button
                                        type="button"
                                        className="text-left hover:underline"
                                        onClick={() =>
                                            openDrilldown({
                                                title: `${row.member.district?.name ?? t('District')} · ${label}`,
                                                dimension: 'district',
                                                dimensionId:
                                                    row.member.district?.id ??
                                                    null,
                                                metric: 'all',
                                                memberId: row.member.id,
                                            })
                                        }
                                    >
                                        {row.member.district?.name ?? '—'}
                                    </button>
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    <button
                                        type="button"
                                        className="text-left hover:underline"
                                        onClick={() =>
                                            openDrilldown({
                                                title: `${row.member.unit?.name ?? t('Unit')} · ${label}`,
                                                dimension: 'unit',
                                                dimensionId:
                                                    row.member.unit?.id ?? null,
                                                metric: 'all',
                                                memberId: row.member.id,
                                            })
                                        }
                                    >
                                        {row.member.unit?.name ?? '—'}
                                    </button>
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Participations')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'participations',
                                        value: row.participation_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Achievements')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'achievements',
                                        value: row.achievement_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Awards')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'awards',
                                        value: row.award_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Gold')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'GOLD',
                                        value: row.GOLD,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Silver')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'SILVER',
                                        value: row.SILVER,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Bronze')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'BRONZE',
                                        value: row.BRONZE,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Merit')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'MERIT',
                                        value: row.MERIT,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className={listingCellClass}>
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Points')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'points',
                                        value: row.total_points,
                                        memberId: row.member.id,
                                        strong: true,
                                    })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    function multiLabel(
        options: MultiSelectOption[],
        selected: string[],
    ): string | undefined {
        if (selected.length === 0) {
            return undefined;
        }

        return selected.length === 1
            ? options.find((o) => o.value === selected[0])?.label
            : String(selected.length);
    }

    const paginationFooter =
        data.pagination.last_page > 1 ? (
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                    {data.pagination.from !== null
                        ? t('Showing :from–:to of :total')
                              .replace(':from', String(data.pagination.from))
                              .replace(':to', String(data.pagination.to ?? ''))
                              .replace(':total', String(data.pagination.total))
                        : ''}
                </span>
                <div className="flex items-center gap-1">
                    {data.pagination.links.map((link, index) =>
                        link.url ? (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 min-w-8 px-2"
                                onClick={() =>
                                    router.get(
                                        link.url!,
                                        {},
                                        { preserveState: true },
                                    )
                                }
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ) : (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="h-8 min-w-8 px-2"
                                disabled
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ),
                    )}
                </div>
            </div>
        ) : null;

    const drilldownGroups = Object.values(
        drilldownRows.reduce<
            Record<
                string,
                { label: string; points: number; rows: DrilldownRow[] }
            >
        >((groups, row) => {
            const label = row.scoring.game_level ?? t('Not classified');
            const group = (groups[label] ??= { label, points: 0, rows: [] });
            group.points += row.scoring.total_points;
            group.rows.push(row);

            return groups;
        }, {}),
    ).sort((left, right) => right.points - left.points);

    return (
        <>
            <Head title={reportTitle} />

            <ListingLayout
                title={reportTitle}
                description={t(
                    'Review ranked player performance across points, medals, participation, and awards.',
                )}
                filters={
                    <>
                        {(
                            [
                                ['session_ids', 'Sessions', sessionOptions],
                                ['sport_ids', 'Sports', sportOptions],
                                ['tier_ids', 'Tiers', tierOptions],
                                ['district_ids', 'Districts', districtOptions],
                                ['unit_ids', 'Units', unitOptions],
                            ] as const
                        ).map(([key, label, options]) => (
                            <FilterPill
                                key={key}
                                label={t(label)}
                                activeLabel={multiLabel(options, current[key])}
                                onClear={() => apply({ [key]: [] })}
                            >
                                <MultiOptionList
                                    options={options}
                                    value={current[key]}
                                    searchPlaceholder={t('Search…')}
                                    onChange={(value) =>
                                        apply({ [key]: value })
                                    }
                                />
                            </FilterPill>
                        ))}
                        <FilterPill
                            label={t('Members')}
                            activeLabel={
                                selectedMembers.length > 0
                                    ? String(selectedMembers.length)
                                    : undefined
                            }
                            onClear={() => apply({ member_ids: [] })}
                        >
                            <div className="w-72 p-3">
                                <MembersMultiSelect
                                    value={selectedMembers}
                                    onValueChange={(members) =>
                                        apply({
                                            member_ids: members.map((member) =>
                                                String(member.id),
                                            ),
                                        })
                                    }
                                />
                            </div>
                        </FilterPill>
                        <TextFilterPill
                            label={t('Name')}
                            value={current.member_name}
                            placeholder={t('Search by name or PNO…')}
                            onApply={(value) => apply({ member_name: value })}
                        />
                        <TextFilterPill
                            label={t('PNO')}
                            value={current.pno}
                            placeholder={t('Search by PNO…')}
                            onApply={(value) => apply({ pno: value })}
                        />
                        <DateRangePill
                            label={t('Date')}
                            from={current.from_date}
                            to={current.to_date}
                            onChange={(from, to) =>
                                apply({ from_date: from, to_date: to })
                            }
                            presets={dateRangePresets(t)}
                        />
                        {(
                            [
                                [
                                    'limit',
                                    'Top',
                                    LIMIT_OPTIONS.map((v) => ({
                                        value: v,
                                        label: v,
                                    })),
                                    '50',
                                ],
                                [
                                    'group_by',
                                    'Group by',
                                    GROUP_OPTIONS.map((o) => ({
                                        value: o.value,
                                        label: t(o.label),
                                    })),
                                    'overall',
                                ],
                                [
                                    'subgroup_by',
                                    'Subgroup',
                                    SUBGROUP_OPTIONS.map((o) => ({
                                        value: o.value,
                                        label: t(o.label),
                                    })),
                                    'none',
                                ],
                                [
                                    'ranking_scope',
                                    'Ranking',
                                    [
                                        {
                                            value: 'within_group',
                                            label: t('Within group'),
                                        },
                                        {
                                            value: 'overall',
                                            label: t('Overall'),
                                        },
                                    ],
                                    'within_group',
                                ],
                            ] as const
                        ).map(([key, label, options, fallback]) => (
                            <FilterPill
                                key={key}
                                label={t(label)}
                                activeLabel={
                                    current[key] !== fallback
                                        ? options.find(
                                              (o) => o.value === current[key],
                                          )?.label
                                        : undefined
                                }
                                onClear={() => apply({ [key]: fallback })}
                            >
                                <OptionList
                                    options={[...options]}
                                    value={current[key]}
                                    onSelect={(value) =>
                                        apply({ [key]: value ?? fallback })
                                    }
                                />
                            </FilterPill>
                        ))}
                    </>
                }
                hasFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                footer={paginationFooter}
            >
                <div className="h-full space-y-4 overflow-y-auto pr-1">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {(
                            [
                                ['Points', data.summary.points],
                                [
                                    'Participations',
                                    data.summary.participation_count,
                                ],
                                [
                                    'Achievements',
                                    data.summary.achievement_count,
                                ],
                                ['Awards', data.summary.award_count],
                            ] as const
                        ).map(([label, value]) => (
                            <div
                                key={label}
                                className="flex items-baseline justify-between rounded-xl border bg-card px-3 py-2"
                            >
                                <span className="text-xs text-muted-foreground">
                                    {t(label)}
                                </span>
                                <span className="text-lg font-semibold tabular-nums">
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-5">
                        {data.groups.length === 0 && (
                            <div className="rounded-lg border py-10 text-center text-muted-foreground">
                                {t('No records found')}
                            </div>
                        )}

                        {data.groups.map((group) => (
                            <section key={group.key} className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        className="text-left text-base font-semibold hover:underline"
                                        onClick={() =>
                                            openDrilldown({
                                                title: group.label,
                                                dimension: group.dimension,
                                                dimensionId: group.dimension_id,
                                                metric: 'all',
                                            })
                                        }
                                    >
                                        {group.label}
                                    </button>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <button
                                            type="button"
                                            className="rounded border px-2 py-1 hover:bg-muted"
                                            onClick={() =>
                                                openDrilldown({
                                                    title: `${group.label} · ${t('Points')}`,
                                                    dimension: group.dimension,
                                                    dimensionId:
                                                        group.dimension_id,
                                                    metric: 'points',
                                                })
                                            }
                                        >
                                            {t('Points')}:{' '}
                                            {group.summary.points}
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded border px-2 py-1 hover:bg-muted"
                                            onClick={() =>
                                                openDrilldown({
                                                    title: `${group.label} · ${t('Achievements')}`,
                                                    dimension: group.dimension,
                                                    dimensionId:
                                                        group.dimension_id,
                                                    metric: 'achievements',
                                                })
                                            }
                                        >
                                            {t('Achievements')}:{' '}
                                            {group.summary.achievement_count}
                                        </button>
                                    </div>
                                </div>

                                {group.subgroups &&
                                group.subgroups.length > 0 ? (
                                    <div className="space-y-4">
                                        {group.subgroups.map((subgroup) => (
                                            <div
                                                key={subgroup.key}
                                                className="space-y-2"
                                            >
                                                <button
                                                    type="button"
                                                    className="text-left text-sm font-medium hover:underline"
                                                    onClick={() =>
                                                        openDrilldown({
                                                            title: `${group.label} · ${subgroup.label}`,
                                                            dimension:
                                                                subgroup.dimension,
                                                            dimensionId:
                                                                subgroup.dimension_id,
                                                            metric: 'all',
                                                        })
                                                    }
                                                >
                                                    {subgroup.label}
                                                </button>
                                                {renderRows(
                                                    subgroup.rows ?? [],
                                                    subgroup.dimension,
                                                    subgroup.dimension_id,
                                                    subgroup.label,
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    renderRows(
                                        group.rows ?? [],
                                        group.dimension,
                                        group.dimension_id,
                                        group.label,
                                    )
                                )}
                            </section>
                        ))}
                    </div>
                </div>
            </ListingLayout>

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);

                    if (!open) {
                        setSelectedMemberId(null);
                        setDetail(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"
                    aria-describedby="member-performance-detail"
                >
                    <DialogHeader>
                        <DialogTitle>
                            {detail?.member.full_name ??
                                t('Performance details')}
                        </DialogTitle>
                        <DialogDescription id="member-performance-detail">
                            {detail?.member
                                ? [
                                      detail.member.pno,
                                      detail.member.rank
                                          ? resolveRankLabel(
                                                detail.member.rank,
                                                ranks,
                                                locale,
                                            )
                                          : null,
                                  ]
                                      .filter(Boolean)
                                      .join(' / ') || t('Member')
                                : t('Player performance details')}
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading && selectedMemberId !== null && (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    )}

                    {!detailLoading && detail !== null && (
                        <MemberPerformanceTab
                            performance={detail.performance}
                            showFilters={false}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>{drilldownTitle}</DialogTitle>
                        <DialogDescription>
                            {t('Supporting performance rows')}
                        </DialogDescription>
                    </DialogHeader>

                    {drilldownLoading && (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    )}

                    {!drilldownLoading && (
                        <div className="overflow-hidden rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Member')}</TableHead>
                                        <TableHead>{t('Session')}</TableHead>
                                        <TableHead>{t('Sport')}</TableHead>
                                        <TableHead>{t('Tournament')}</TableHead>
                                        <TableHead>{t('Event')}</TableHead>
                                        <TableHead>{t('Medal')}</TableHead>
                                        <TableHead>{t('Awards')}</TableHead>
                                        <TableHead className="text-right">
                                            {t('Points')}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drilldownRows.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="py-8 text-center text-muted-foreground"
                                            >
                                                {t('No records found')}
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {drilldownGroups.map((group) => (
                                        <Fragment key={group.label}>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell
                                                    colSpan={7}
                                                    className="font-medium"
                                                >
                                                    {group.label}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">
                                                    {group.points}
                                                </TableCell>
                                            </TableRow>
                                            {group.rows.map((row) => (
                                                <TableRow
                                                    key={row.participation_id}
                                                >
                                                    <TableCell>
                                                        {row.member.full_name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.session.name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.sport.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.tournament?.name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.event?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.achievement
                                                            ?.medal_type ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {row.awards.length === 0
                                                            ? '—'
                                                            : row.awards
                                                                  .map(
                                                                      (award) =>
                                                                          award.title,
                                                                  )
                                                                  .join(', ')}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {
                                                            row.scoring
                                                                .total_points
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
