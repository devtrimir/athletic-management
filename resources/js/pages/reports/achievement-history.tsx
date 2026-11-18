import { Head, Link, setLayoutProps, useHttp, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AchievementHistoryController from '@/actions/App/Http/Controllers/Api/V1/AchievementHistoryController';
import * as MemberController from '@/actions/App/Http/Controllers/MemberController';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import * as TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import type { ComboboxItem } from '@/components/combobox';
import {
    FilterPill,
    SearchableOptionList,
    TextFilterPill,
} from '@/components/data-table/filter-pill';
import {
    ListingLayout,
    ListingTable,
} from '@/components/data-table/listing-layout';
import {
    listingCellClass,
    listingHeadCellClass,
} from '@/components/data-table/table-primitives';
import { MemberPhotoPreview } from '@/components/members/member-photo-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
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
type Tier = { id: number; code: string; label_hi: string };
type Unit = { id: number; name: string };
type Tournament = { id: number; name: string; date_from: string | null };

type AchievementRow = {
    member: {
        id: number;
        member_code: string;
        pno: string | null;
        full_name: string;
        rank: string | null;
        photo_path: string | null;
    };
    tournament: {
        id: number;
        name: string;
        date_from: string | null;
        tier_label_hi: string | null;
        sport_name: string | null;
    };
    event: { id: number; name: string; discipline: string | null };
    session: { name: string };
    medal_type: string;
    position: number | null;
};

type ApiResponse = { data: AchievementRow[]; ranks: RankOption[] };

const ALL = 'all';

const MEDAL_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
    GOLD: 'default',
    SILVER: 'secondary',
    BRONZE: 'outline',
    MERIT: 'outline',
};

export default function AchievementHistory({
    data,
    filters,
    sessions,
    sports,
    tiers,
    units,
    tournaments,
    ranks,
}: {
    data: AchievementRow[];
    filters: {
        session_id: number | null;
        sport_id: number | null;
        unit_id: number | null;
        tier_id: number | null;
        member_name: string | null;
        pno: string | null;
        tournament_id: number | null;
        event_name: string | null;
    };
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
    tournaments: Tournament[];
    ranks: RankOption[];
}) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale: string };

    setLayoutProps({
        breadcrumbs: [
            { title: t('Reports'), href: ReportController.index.url() },
            { title: t('Achievement History') },
        ],
    });

    const [sessionId, setSessionId] = useState<string>(
        filters.session_id ? String(filters.session_id) : ALL,
    );
    const [sportId, setSportId] = useState<string>(
        filters.sport_id ? String(filters.sport_id) : '',
    );
    const [tierId, setTierId] = useState<string>(
        filters.tier_id ? String(filters.tier_id) : ALL,
    );
    const [unitId, setUnitId] = useState<string>(
        filters.unit_id ? String(filters.unit_id) : ALL,
    );
    const [tournamentId, setTournamentId] = useState<string>(
        filters.tournament_id ? String(filters.tournament_id) : '',
    );
    const [memberName, setMemberName] = useState<string>(
        filters.member_name ?? '',
    );
    const [pno, setPno] = useState<string>(filters.pno ?? '');
    const [eventName, setEventName] = useState<string>(
        filters.event_name ?? '',
    );
    const [rows, setRows] = useState<AchievementRow[]>(data);
    const [rankOptions, setRankOptions] = useState<RankOption[]>(ranks);
    const [selectedRow, setSelectedRow] = useState<AchievementRow | null>(null);
    const isFirstRender = useRef(true);
    const { get } = useHttp<Record<string, never>, ApiResponse>({});

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const params: Record<string, string> = {};

        if (sessionId !== ALL) {
            params['session_id'] = sessionId;
        }

        if (sportId) {
            params['sport_id'] = sportId;
        }

        if (tierId !== ALL) {
            params['tier_id'] = tierId;
        }

        if (unitId !== ALL) {
            params['unit_id'] = unitId;
        }

        if (tournamentId) {
            params['tournament_id'] = tournamentId;
        }

        if (memberName) {
            params['member_name'] = memberName;
        }

        if (pno) {
            params['pno'] = pno;
        }

        if (eventName) {
            params['event_name'] = eventName;
        }

        get(AchievementHistoryController.url({ query: params }), {
            onSuccess: (res) => {
                const r = res as unknown as ApiResponse;
                setRows(r?.data ?? []);
                setRankOptions(r?.ranks ?? ranks);
            },
            onError: () => setRows([]),
        });
    }, [
        sessionId,
        sportId,
        tierId,
        unitId,
        tournamentId,
        memberName,
        pno,
        eventName,
        get,
        ranks,
    ]);

    const hasFilters =
        sessionId !== ALL ||
        sportId !== '' ||
        tierId !== ALL ||
        unitId !== ALL ||
        tournamentId !== '' ||
        memberName !== '' ||
        pno !== '' ||
        eventName !== '';

    function clearFilters() {
        setSessionId(ALL);
        setSportId('');
        setTierId(ALL);
        setUnitId(ALL);
        setTournamentId('');
        setMemberName('');
        setPno('');
        setEventName('');
    }

    const sportItems: ComboboxItem[] = sports.map((s) => ({
        value: String(s.id),
        label: s.name,
    }));
    const tournamentItems: ComboboxItem[] = tournaments.map((tour) => ({
        value: String(tour.id),
        label: tour.name,
    }));

    const single = (
        label: string,
        items: ComboboxItem[],
        value: string,
        set: (value: string) => void,
    ) => (
        <FilterPill
            label={label}
            activeLabel={items.find((item) => item.value === value)?.label}
            onClear={() => set('')}
        >
            <SearchableOptionList
                options={items}
                value={value || undefined}
                searchPlaceholder={t('Search…')}
                onSelect={(next) => set(next ?? '')}
            />
        </FilterPill>
    );
    const sessionItems: ComboboxItem[] = sessions.map((s) => ({
        value: String(s.id),
        label: s.name,
    }));
    const tierItems: ComboboxItem[] = tiers.map((tier) => ({
        value: String(tier.id),
        label: tier.label_hi,
    }));
    const unitItems: ComboboxItem[] = units.map((u) => ({
        value: String(u.id),
        label: u.name,
    }));
    const noneToAll = (value: string) => (value === '' ? ALL : value);

    return (
        <>
            <Head title={t('Achievement History')} />

            <ListingLayout
                title={t('Achievement History')}
                description={t('Medals won by members across tournaments.')}
                filters={
                    <>
                        {single(
                            t('Session'),
                            sessionItems,
                            sessionId === ALL ? '' : sessionId,
                            (value) => setSessionId(noneToAll(value)),
                        )}
                        {single(
                            t('Tournament'),
                            tournamentItems,
                            tournamentId,
                            setTournamentId,
                        )}
                        {single(t('Sport'), sportItems, sportId, setSportId)}
                        {single(
                            t('Tier'),
                            tierItems,
                            tierId === ALL ? '' : tierId,
                            (value) => setTierId(noneToAll(value)),
                        )}
                        {single(
                            t('Unit'),
                            unitItems,
                            unitId === ALL ? '' : unitId,
                            (value) => setUnitId(noneToAll(value)),
                        )}
                        <TextFilterPill
                            label={t('Member name')}
                            value={memberName}
                            placeholder={t('Member name')}
                            onApply={setMemberName}
                        />
                        <TextFilterPill
                            label={t('PNO')}
                            value={pno}
                            placeholder={t('PNO')}
                            onApply={setPno}
                        />
                        <TextFilterPill
                            label={t('Event name')}
                            value={eventName}
                            placeholder={t('Event name')}
                            onApply={setEventName}
                        />
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clearFilters}
                resultCount={rows.length}
            >
                <ListingTable minWidth={1100} centered>
                    <colgroup>
                        <col style={{ width: 56 }} />
                        <col style={{ width: 64 }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: 90 }} />
                        <col />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: 90 }} />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                            {[
                                'S. No.',
                                'Photo',
                                'Member',
                                'PNO / Rank',
                                'Medal',
                                'Tournament',
                                'Tier / Sport',
                                'Event',
                                'Session',
                            ].map((label) => (
                                <TableHead
                                    key={label}
                                    className={`${listingHeadCellClass} bg-muted/50`}
                                >
                                    {t(label)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {t('No results.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, idx) => (
                                <TableRow
                                    key={`${row.member.id}-${row.tournament.id}-${row.event.id}-${idx}`}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() => setSelectedRow(row)}
                                >
                                    <TableCell className={listingCellClass}>
                                        {idx + 1}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <div className="flex justify-center">
                                            <MemberPhotoPreview
                                                photoPath={
                                                    row.member.photo_path
                                                }
                                                name={row.member.full_name}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className={`${listingCellClass} font-medium`}
                                    >
                                        {row.member.full_name}
                                    </TableCell>
                                    <TableCell
                                        className={`${listingCellClass} text-muted-foreground`}
                                    >
                                        {[
                                            row.member.pno,
                                            row.member.rank
                                                ? resolveRankLabel(
                                                      row.member.rank,
                                                      rankOptions,
                                                      locale,
                                                  )
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' / ')}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <Badge
                                            variant={
                                                MEDAL_VARIANT[row.medal_type] ??
                                                'outline'
                                            }
                                        >
                                            {t(row.medal_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {row.tournament.name}
                                    </TableCell>
                                    <TableCell
                                        className={`${listingCellClass} text-muted-foreground`}
                                    >
                                        {[
                                            row.tournament.tier_label_hi,
                                            row.tournament.sport_name,
                                        ]
                                            .filter(Boolean)
                                            .join(' / ')}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {row.event.name}
                                    </TableCell>
                                    <TableCell
                                        className={`${listingCellClass} text-muted-foreground`}
                                    >
                                        {row.session.name}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </ListingTable>
            </ListingLayout>

            {/* Detail Dialog */}
            <Dialog
                open={selectedRow !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedRow(null);
                    }
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Achievement History')}</DialogTitle>
                    </DialogHeader>
                    {selectedRow && (
                        <div className="space-y-4 text-sm">
                            {/* Member */}
                            <div className="space-y-1">
                                <p className="font-semibold">{t('Member')}</p>
                                <p className="text-base">
                                    {selectedRow.member.full_name}
                                </p>
                                <p className="text-muted-foreground">
                                    {selectedRow.member.pno
                                        ? `${t('PNO')}: ${selectedRow.member.pno}`
                                        : ''}
                                    {selectedRow.member.rank
                                        ? `${selectedRow.member.pno ? ' · ' : ''}${t('Rank')}: ${resolveRankLabel(
                                              selectedRow.member.rank,
                                              rankOptions,
                                              locale,
                                          )}`
                                        : ''}
                                </p>
                                <Button
                                    asChild
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0"
                                >
                                    <Link
                                        href={MemberController.show.url(
                                            selectedRow.member.id,
                                        )}
                                    >
                                        {t('View profile')} →
                                    </Link>
                                </Button>
                            </div>

                            {/* Tournament */}
                            <div className="space-y-1">
                                <p className="font-semibold">
                                    {t('Tournament')}
                                </p>
                                <p>{selectedRow.tournament.name}</p>
                                <p className="text-muted-foreground">
                                    {[
                                        selectedRow.tournament.tier_label_hi,
                                        selectedRow.tournament.sport_name,
                                        selectedRow.tournament.date_from,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                                <Button
                                    asChild
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0"
                                >
                                    <Link
                                        href={TournamentController.show.url(
                                            selectedRow.tournament.id,
                                        )}
                                    >
                                        {t('View')} →
                                    </Link>
                                </Button>
                            </div>

                            {/* Event */}
                            <div className="space-y-1">
                                <p className="font-semibold">{t('Event')}</p>
                                <p>{selectedRow.event.name}</p>
                                <p className="text-muted-foreground">
                                    {[
                                        selectedRow.event.discipline,
                                        selectedRow.session.name,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>

                            {/* Achievement */}
                            <div className="space-y-1">
                                <p className="font-semibold">
                                    {t('Achievement')}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            MEDAL_VARIANT[
                                                selectedRow.medal_type
                                            ] ?? 'outline'
                                        }
                                    >
                                        {t(selectedRow.medal_type)}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
