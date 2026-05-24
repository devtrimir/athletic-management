import { Deferred, Head, setLayoutProps, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import { store as storeParticipants } from '@/actions/App/Http/Controllers/EventParticipantController';
import { show as showTournament, index as tournamentsIndex } from '@/actions/App/Http/Controllers/TournamentController';
import Heading from '@/components/heading';
import { MemberPicker  } from '@/components/member-picker';
import type {MemberOption} from '@/components/member-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type TournamentRef = { id: number; name_hi: string };

type EventProp = {
    id: number;
    name_hi: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    sport: { id: number; name: string } | null;
};

type AchievementRow = {
    medal_type: string | null;
    position: number | null;
    remarks: string | null;
};

type ParticipationRow = {
    id: number;
    position: number | null;
    member: {
        id: number;
        full_name_hi: string;
        member_code: string;
        pno: string | null;
    } | null;
    achievement: AchievementRow | null;
};

type GridRow = {
    member_id: number;
    full_name_hi: string;
    member_code: string;
    pno: string | null;
    position: string;
    medal_type: string;
    remarks: string;
};

const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const;

function participationToRow(p: ParticipationRow): GridRow {
    return {
        member_id: p.member?.id ?? 0,
        full_name_hi: p.member?.full_name_hi ?? '',
        member_code: p.member?.member_code ?? '',
        pno: p.member?.pno ?? null,
        position: p.position != null ? String(p.position) : '',
        medal_type: p.achievement?.medal_type ?? '',
        remarks: p.achievement?.remarks ?? '',
    };
}

function ParticipantsGrid({
    tournament,
    event,
    participations,
}: {
    tournament: TournamentRef;
    event: EventProp;
    participations: ParticipationRow[];
}) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<GridRow[]>(() => participations.map(participationToRow));
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);

    const { post, processing } = useForm({});

    function updateRow(idx: number, field: keyof GridRow, value: string) {
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    }

    function addMember() {
        if (!pickedMember) {
            return;
        }

        if (rows.some((r) => r.member_id === pickedMember.id)) {
            return;
        }

        setRows((prev) => [
            ...prev,
            {
                member_id: pickedMember.id,
                full_name_hi: pickedMember.full_name_hi,
                member_code: pickedMember.member_code,
                pno: pickedMember.pno,
                position: '',
                medal_type: '',
                remarks: '',
            },
        ]);
        setPickedMember(null);
    }

    function removeRow(idx: number) {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    }

    function save() {
        const participants = rows.map((r) => ({
            member_id: r.member_id,
            position: r.position ? parseInt(r.position, 10) : null,
            medal_type: r.medal_type || null,
            remarks: r.remarks || null,
        }));

        post(storeParticipants.url(tournament.id, event.id), {
            data: { participants },
        } as Parameters<typeof post>[1]);
    }

    return (
        <div className="space-y-6">
            {/* Add participant */}
            <div className="rounded-xl border bg-card p-4">
                <Label className="mb-3 block text-sm font-medium">{t('Add participant')}</Label>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <MemberPicker
                            value={pickedMember}
                            onChange={setPickedMember}
                            placeholder={t('Search member…')}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addMember}
                        disabled={!pickedMember}
                    >
                        {t('Add')}
                    </Button>
                </div>
            </div>

            {/* Grid */}
            {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('No participants yet.')}</p>
            ) : (
                <div className="rounded-xl border bg-card overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>{t('Member')}</TableHead>
                                <TableHead className="w-28">{t('Position')}</TableHead>
                                <TableHead className="w-36">{t('Medal')}</TableHead>
                                <TableHead>{t('Remarks')}</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={row.member_id}>
                                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">{row.full_name_hi}</div>
                                        <div className="text-muted-foreground text-xs">
                                            {row.member_code}
                                            {row.pno ? ` · ${row.pno}` : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={row.position}
                                            onChange={(e) => updateRow(idx, 'position', e.target.value)}
                                            className="h-8 w-24"
                                            placeholder="—"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={row.medal_type || 'none'}
                                            onValueChange={(v) => updateRow(idx, 'medal_type', v === 'none' ? '' : v)}
                                        >
                                            <SelectTrigger className="h-8 w-32">
                                                <SelectValue placeholder={t('No medal')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('No medal')}</SelectItem>
                                                {MEDAL_TYPES.map((m) => (
                                                    <SelectItem key={m} value={m}>{t(m)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={row.remarks}
                                            onChange={(e) => updateRow(idx, 'remarks', e.target.value)}
                                            className="h-8"
                                            placeholder="—"
                                            maxLength={255}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-destructive hover:text-destructive"
                                            onClick={() => removeRow(idx)}
                                        >
                                            ✕
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Button onClick={save} disabled={processing || rows.length === 0}>
                {processing ? t('Saving…') : t('Save participants')}
            </Button>
        </div>
    );
}

export default function EventsShow({
    tournament,
    event,
    participations,
}: {
    tournament: TournamentRef;
    event: EventProp;
    participations?: ParticipationRow[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name_hi, href: showTournament.url(tournament.id) },
            { title: event.name_hi },
        ],
    });

    return (
        <>
            <Head title={event.name_hi} />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Heading variant="small" title={event.name_hi} />
                        <div className="flex flex-wrap gap-2">
                            {event.sport && <Badge variant="secondary">{event.sport.name}</Badge>}
                            <Badge variant="outline">{t(event.gender_class)}</Badge>
                            {event.discipline && <Badge variant="outline">{event.discipline}</Badge>}
                            {event.weight_category && <Badge variant="outline">{event.weight_category}</Badge>}
                        </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <a href={showEvent.url(tournament.id, event.id)}>{t('Refresh')}</a>
                    </Button>
                </div>

                <Deferred data="participations" fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
                    <ParticipantsGrid
                        tournament={tournament}
                        event={event}
                        participations={participations ?? []}
                    />
                </Deferred>
            </div>
        </>
    );
}

