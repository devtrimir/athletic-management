import { Head, router, setLayoutProps, useHttp } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import Heading from '@/components/heading';
import type { MemberOption } from '@/components/member-picker';
import { MemberPerformanceTab } from '@/components/members/member-performance-tab';
import type { MemberPerformanceData } from '@/components/members/member-performance-tab';
import { MembersMultiSelect } from '@/components/members-multi-select';
import { OptionMultiSelect } from '@/components/option-multi-select';
import type { MultiSelectOption } from '@/components/option-multi-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label_hi: string; label_en: string };
type Unit = { id: number; name: string };
type District = { id: number; name: string };
type ReportMeta = { key: string; name: string };
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
    awards: Array<{ id: number; title: string; points: number }>;
    scoring: { total_points: number };
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
}) {
    const { t } = useTranslation();
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
            { title: report.name },
        ],
    });

    const [sessionIds, setSessionIds] = useState<string[]>(
        filters.session_ids?.map(String) ?? [],
    );
    const [sportIds, setSportIds] = useState<string[]>(
        filters.sport_ids?.map(String) ?? [],
    );
    const [tierIds, setTierIds] = useState<string[]>(
        filters.tier_ids?.map(String) ?? [],
    );
    const [unitIds, setUnitIds] = useState<string[]>(
        filters.unit_ids?.map(String) ?? [],
    );
    const [districtIds, setDistrictIds] = useState<string[]>(
        filters.district_ids?.map(String) ?? [],
    );
    const [selectedMembers, setSelectedMembers] =
        useState<MemberOption[]>(selectedMembersProp);
    const [limit, setLimit] = useState<string>(
        filters.limit ? String(filters.limit) : '50',
    );
    const [memberName, setMemberName] = useState<string>(
        filters.member_name ?? '',
    );
    const [pno, setPno] = useState<string>(filters.pno ?? '');
    const [fromDate, setFromDate] = useState<string>(filters.from_date ?? '');
    const [toDate, setToDate] = useState<string>(filters.to_date ?? '');
    const [groupBy, setGroupBy] = useState<string>(
        filters.group_by ?? data.group_by ?? 'overall',
    );
    const [subgroupBy, setSubgroupBy] = useState<string>(
        filters.subgroup_by ?? data.subgroup_by ?? 'none',
    );
    const [rankingScope, setRankingScope] = useState<string>(
        filters.ranking_scope ?? data.ranking_scope ?? 'within_group',
    );
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
        null,
    );
    const [detail, setDetail] = useState<MemberPerformanceDetail | null>(null);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownTitle, setDrilldownTitle] = useState('');
    const [drilldownRows, setDrilldownRows] = useState<DrilldownRow[]>([]);

    const hasActiveFilters = useMemo(
        () =>
            sessionIds.length > 0 ||
            sportIds.length > 0 ||
            tierIds.length > 0 ||
            unitIds.length > 0 ||
            districtIds.length > 0 ||
            selectedMembers.length > 0 ||
            memberName !== '' ||
            pno !== '' ||
            fromDate !== '' ||
            toDate !== '' ||
            limit !== '50' ||
            groupBy !== 'overall' ||
            subgroupBy !== 'none' ||
            rankingScope !== 'within_group',
        [
            districtIds.length,
            fromDate,
            groupBy,
            limit,
            memberName,
            pno,
            rankingScope,
            selectedMembers.length,
            sessionIds.length,
            sportIds.length,
            subgroupBy,
            tierIds.length,
            toDate,
            unitIds.length,
        ],
    );

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

    function buildParams(): Record<string, string | string[]> {
        const params: Record<string, string | string[]> = {
            limit,
            group_by: groupBy,
            subgroup_by: subgroupBy,
            ranking_scope: rankingScope,
            page: '1',
        };

        if (sessionIds.length > 0) {
            params['session_ids'] = sessionIds;
        }

        if (sportIds.length > 0) {
            params['sport_ids'] = sportIds;
        }

        if (tierIds.length > 0) {
            params['tier_ids'] = tierIds;
        }

        if (unitIds.length > 0) {
            params['unit_ids'] = unitIds;
        }

        if (districtIds.length > 0) {
            params['district_ids'] = districtIds;
        }

        if (selectedMembers.length > 0) {
            params['member_ids'] = selectedMembers.map((member) =>
                String(member.id),
            );
        }

        if (memberName.trim() !== '') {
            params['member_name'] = memberName.trim();
        }

        if (pno.trim() !== '') {
            params['pno'] = pno.trim();
        }

        if (fromDate !== '') {
            params['from_date'] = fromDate;
        }

        if (toDate !== '') {
            params['to_date'] = toDate;
        }

        return params;
    }

    function applyFilters() {
        router.get(ReportController.show(report.key).url, buildParams(), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setSessionIds([]);
        setSportIds([]);
        setTierIds([]);
        setUnitIds([]);
        setDistrictIds([]);
        setSelectedMembers([]);
        setLimit('50');
        setMemberName('');
        setPno('');
        setFromDate('');
        setToDate('');
        setGroupBy('overall');
        setSubgroupBy('none');
        setRankingScope('within_group');

        router.get(
            ReportController.show(report.key).url,
            {
                limit: '50',
                group_by: 'overall',
                subgroup_by: 'none',
                ranking_scope: 'within_group',
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
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
                className={`w-full text-right tabular-nums hover:underline ${strong ? 'font-semibold' : ''}`}
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
            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">{t('Rank')}</TableHead>
                            <TableHead>{t('Member')}</TableHead>
                            <TableHead>{t('District')}</TableHead>
                            <TableHead>{t('Unit')}</TableHead>
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
                                {t('Gold')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('Silver')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('Bronze')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('Merit')}
                            </TableHead>
                            <TableHead className="text-right">
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
                                <TableCell>{row.rank ?? '—'}</TableCell>
                                <TableCell>
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
                                        {[row.member.pno, row.member.rank]
                                            .filter(Boolean)
                                            .join(' / ') || '—'}
                                    </div>
                                </TableCell>
                                <TableCell>
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
                                <TableCell>
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
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Participations')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'participations',
                                        value: row.participation_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Achievements')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'achievements',
                                        value: row.achievement_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Awards')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'awards',
                                        value: row.award_count,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Gold')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'GOLD',
                                        value: row.GOLD,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Silver')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'SILVER',
                                        value: row.SILVER,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Bronze')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'BRONZE',
                                        value: row.BRONZE,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {metricCell({
                                        title: `${row.member.full_name} · ${t('Merit')}`,
                                        dimension,
                                        dimensionId,
                                        metric: 'MERIT',
                                        value: row.MERIT,
                                        memberId: row.member.id,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
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

    return (
        <>
            <Head title={report.name} />

            <div className="space-y-6 px-4 py-6">
                <h1 className="sr-only">{report.name}</h1>
                <Heading
                    title={report.name}
                    description={t(
                        'Review ranked player performance across points, medals, participation, and awards.',
                    )}
                />

                <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <OptionMultiSelect
                            value={sessionIds}
                            onValueChange={setSessionIds}
                            options={sessionOptions}
                            placeholder={t('All Sessions')}
                            className="w-[180px]"
                        />
                        <OptionMultiSelect
                            value={sportIds}
                            onValueChange={setSportIds}
                            options={sportOptions}
                            placeholder={t('All Sports')}
                            className="w-[180px]"
                        />
                        <OptionMultiSelect
                            value={tierIds}
                            onValueChange={setTierIds}
                            options={tierOptions}
                            placeholder={t('All Tiers')}
                            className="w-[180px]"
                        />
                        <OptionMultiSelect
                            value={districtIds}
                            onValueChange={setDistrictIds}
                            options={districtOptions}
                            placeholder={t('All Districts')}
                            className="w-[180px]"
                        />
                        <OptionMultiSelect
                            value={unitIds}
                            onValueChange={setUnitIds}
                            options={unitOptions}
                            placeholder={t('All Units')}
                            className="w-[180px]"
                        />
                        <Select value={limit} onValueChange={setLimit}>
                            <SelectTrigger className="h-9 w-[92px]">
                                <SelectValue placeholder={t('Top N')} />
                            </SelectTrigger>
                            <SelectContent>
                                {LIMIT_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <MembersMultiSelect
                            value={selectedMembers}
                            onValueChange={setSelectedMembers}
                            className="w-full sm:w-[320px]"
                        />
                        <Input
                            value={memberName}
                            onChange={(event) =>
                                setMemberName(event.target.value)
                            }
                            placeholder={t('Search by name or PNO…')}
                            className="h-9 w-full sm:w-[220px]"
                        />
                        <Input
                            value={pno}
                            onChange={(event) => setPno(event.target.value)}
                            placeholder={t('Search by PNO…')}
                            className="h-9 w-full sm:w-[180px]"
                        />
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(event) =>
                                setFromDate(event.target.value)
                            }
                            aria-label={t('Date from')}
                            className="h-9 w-full sm:w-[150px]"
                        />
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                            aria-label={t('Date to')}
                            className="h-9 w-full sm:w-[150px]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={groupBy} onValueChange={setGroupBy}>
                            <SelectTrigger className="h-9 w-[160px]">
                                <SelectValue placeholder={t('Group by')} />
                            </SelectTrigger>
                            <SelectContent>
                                {GROUP_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={subgroupBy}
                            onValueChange={setSubgroupBy}
                        >
                            <SelectTrigger className="h-9 w-[160px]">
                                <SelectValue placeholder={t('No subgroup')} />
                            </SelectTrigger>
                            <SelectContent>
                                {SUBGROUP_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={rankingScope}
                            onValueChange={setRankingScope}
                        >
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue placeholder={t('Within group')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="within_group">
                                    {t('Within group')}
                                </SelectItem>
                                <SelectItem value="overall">
                                    {t('Overall')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button className="h-9 px-3" onClick={applyFilters}>
                            {t('Search')}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-9 px-3"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                        >
                            {t('Clear filters')}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Points')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {data.summary.points}
                        </div>
                    </div>
                    <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Participations')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {data.summary.participation_count}
                        </div>
                    </div>
                    <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Achievements')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {data.summary.achievement_count}
                        </div>
                    </div>
                    <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">
                            {t('Awards')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {data.summary.award_count}
                        </div>
                    </div>
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
                                                dimensionId: group.dimension_id,
                                                metric: 'points',
                                            })
                                        }
                                    >
                                        {t('Points')}: {group.summary.points}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded border px-2 py-1 hover:bg-muted"
                                        onClick={() =>
                                            openDrilldown({
                                                title: `${group.label} · ${t('Achievements')}`,
                                                dimension: group.dimension,
                                                dimensionId: group.dimension_id,
                                                metric: 'achievements',
                                            })
                                        }
                                    >
                                        {t('Achievements')}:{' '}
                                        {group.summary.achievement_count}
                                    </button>
                                </div>
                            </div>

                            {group.subgroups && group.subgroups.length > 0 ? (
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

                {data.pagination.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>
                            {data.pagination.from !== null
                                ? t('Showing :from–:to of :total')
                                      .replace(
                                          ':from',
                                          String(data.pagination.from),
                                      )
                                      .replace(
                                          ':to',
                                          String(data.pagination.to ?? ''),
                                      )
                                      .replace(
                                          ':total',
                                          String(data.pagination.total),
                                      )
                                : ''}
                        </span>
                        <div className="flex items-center gap-1">
                            {data.pagination.links.map((link, index) =>
                                link.url ? (
                                    <Button
                                        key={index}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
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
                )}
            </div>

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
                                ? [detail.member.pno, detail.member.rank]
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

                                    {drilldownRows.map((row) => (
                                        <TableRow key={row.participation_id}>
                                            <TableCell>
                                                {row.member.full_name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {row.session.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {row.sport.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {row.tournament?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {row.event?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {row.achievement?.medal_type ??
                                                    '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {row.awards.length === 0
                                                    ? '—'
                                                    : row.awards
                                                          .map(
                                                              (award) =>
                                                                  `${award.title} (${award.points})`,
                                                          )
                                                          .join(', ')}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {row.scoring.total_points}
                                            </TableCell>
                                        </TableRow>
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
