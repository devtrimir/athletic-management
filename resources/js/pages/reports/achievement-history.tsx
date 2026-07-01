import { Head, Link, setLayoutProps, useHttp } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AchievementHistoryController from '@/actions/App/Http/Controllers/Api/V1/AchievementHistoryController';
import * as MemberController from '@/actions/App/Http/Controllers/MemberController';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import * as TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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

type ApiResponse = { data: AchievementRow[] };

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
}) {
    const { t } = useTranslation();

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
    const [memberNameInput, setMemberNameInput] = useState<string>(
        filters.member_name ?? '',
    );
    const [memberName, setMemberName] = useState<string>(
        filters.member_name ?? '',
    );
    const [pnoInput, setPnoInput] = useState<string>(filters.pno ?? '');
    const [pno, setPno] = useState<string>(filters.pno ?? '');
    const [eventNameInput, setEventNameInput] = useState<string>(
        filters.event_name ?? '',
    );
    const [eventName, setEventName] = useState<string>(
        filters.event_name ?? '',
    );
    const [rows, setRows] = useState<AchievementRow[]>(data);
    const [selectedRow, setSelectedRow] = useState<AchievementRow | null>(null);
    const isFirstRender = useRef(true);
    const { get } = useHttp<Record<string, never>, ApiResponse>({});

    useEffect(() => {
        const timer = setTimeout(() => setMemberName(memberNameInput), 400);

        return () => clearTimeout(timer);
    }, [memberNameInput]);

    useEffect(() => {
        const timer = setTimeout(() => setPno(pnoInput), 400);

        return () => clearTimeout(timer);
    }, [pnoInput]);

    useEffect(() => {
        const timer = setTimeout(() => setEventName(eventNameInput), 400);

        return () => clearTimeout(timer);
    }, [eventNameInput]);

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
        setMemberNameInput('');
        setMemberName('');
        setPnoInput('');
        setPno('');
        setEventNameInput('');
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

    return (
        <>
            <Head title={t('Achievement History')} />

            <div className="space-y-6">
                <Heading title={t('Achievement History')} />

                {/* Filters */}
                <div className="space-y-3 rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap gap-3">
                        <Select value={sessionId} onValueChange={setSessionId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sessions')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Sessions')}
                                </SelectItem>
                                {sessions.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Combobox
                            value={tournamentId}
                            onValueChange={setTournamentId}
                            items={tournamentItems}
                            placeholder={t('All Tournaments')}
                            className="w-56"
                        />

                        <Combobox
                            value={sportId}
                            onValueChange={setSportId}
                            items={sportItems}
                            placeholder={t('All Sports')}
                            className="w-44"
                        />

                        <Select value={tierId} onValueChange={setTierId}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('All Tiers')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Tiers')}
                                </SelectItem>
                                {tiers.map((tier) => (
                                    <SelectItem
                                        key={tier.id}
                                        value={String(tier.id)}
                                    >
                                        {tier.label_hi}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={unitId} onValueChange={setUnitId}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('All Units')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Units')}
                                </SelectItem>
                                {units.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            className="h-9 w-52"
                            placeholder={t('Member name')}
                            value={memberNameInput}
                            onChange={(e) => setMemberNameInput(e.target.value)}
                        />
                        <Input
                            className="h-9 w-36"
                            placeholder={t('PNO')}
                            value={pnoInput}
                            onChange={(e) => setPnoInput(e.target.value)}
                        />
                        <Input
                            className="h-9 w-52"
                            placeholder={t('Event name')}
                            value={eventNameInput}
                            onChange={(e) => setEventNameInput(e.target.value)}
                        />
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                            >
                                <X className="mr-1 size-3.5" />
                                {t('Clear filters')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Count */}
                <p className="text-sm text-muted-foreground">
                    {rows.length} {t('records')}
                </p>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Member')}</TableHead>
                            <TableHead>{t('PNO / Rank')}</TableHead>
                            <TableHead>{t('Medal')}</TableHead>
                            <TableHead>{t('Position')}</TableHead>
                            <TableHead>{t('Tournament')}</TableHead>
                            <TableHead>{t('Tier / Sport')}</TableHead>
                            <TableHead>{t('Event')}</TableHead>
                            <TableHead>{t('Session')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground"
                                >
                                    {t('No results.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, idx) => (
                                <TableRow
                                    key={`${row.member.id}-${row.tournament.id}-${row.event.id}-${idx}`}
                                    className="cursor-pointer"
                                    onClick={() => setSelectedRow(row)}
                                >
                                    <TableCell>
                                        {row.member.full_name}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {[row.member.pno, row.member.rank]
                                            .filter(Boolean)
                                            .join(' / ')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                MEDAL_VARIANT[row.medal_type] ??
                                                'outline'
                                            }
                                        >
                                            {t(row.medal_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {row.position != null
                                            ? `#${row.position}`
                                            : '—'}
                                    </TableCell>
                                    <TableCell>{row.tournament.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {[
                                            row.tournament.tier_label_hi,
                                            row.tournament.sport_name,
                                        ]
                                            .filter(Boolean)
                                            .join(' / ')}
                                    </TableCell>
                                    <TableCell>{row.event.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {row.session.name}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

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
                                    {t('Code')}:{' '}
                                    {selectedRow.member.member_code}
                                    {selectedRow.member.pno
                                        ? ` · ${t('PNO')}: ${selectedRow.member.pno}`
                                        : ''}
                                    {selectedRow.member.rank
                                        ? ` · ${t('Rank')}: ${selectedRow.member.rank}`
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
                                    {selectedRow.position != null && (
                                        <span className="text-muted-foreground">
                                            #{selectedRow.position}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
