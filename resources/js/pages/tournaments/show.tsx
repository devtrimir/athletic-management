import { Deferred, Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { store as storeEvent, show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import { destroy as destroyTournament, edit as editTournament, index as tournamentsIndex } from '@/actions/App/Http/Controllers/TournamentController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Tournament = {
    id: number;
    name_hi: string;
    venue: string | null;
    date_from: string | null;
    date_to: string | null;
    raw_date_text: string | null;
    session: { id: number; name: string } | null;
    tier: { id: number; code: string; label_hi: string } | null;
    sport: { id: number; name: string } | null;
};

type EventRow = {
    id: number;
    name_hi: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    participations_count: number;
    sport: { id: number; name: string } | null;
};

type Sport = { id: number; name: string };

type AddEventForm = {
    sport_id: string;
    name_hi: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
};

const GENDER_CLASSES = ['M', 'F', 'MIXED', 'OPEN'] as const;

function AddEventPanel({ tournament, sports }: { tournament: Tournament; sports: Sport[] }) {
    const { t } = useTranslation();
    const { data, setData, post, errors, processing, reset } = useForm<AddEventForm>({
        sport_id: tournament.sport ? String(tournament.sport.id) : '',
        name_hi: '',
        discipline: '',
        weight_category: '',
        gender_class: 'M',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeEvent.url(tournament.id), { onSuccess: () => reset() });
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-medium">{t('Add event')}</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="ev_sport_id">
                        {t('Sport')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={data.sport_id} onValueChange={(v) => setData('sport_id', v)}>
                        <SelectTrigger id="ev_sport_id">
                            <SelectValue placeholder={t('Select sport')} />
                        </SelectTrigger>
                        <SelectContent>
                            {sports.map((sp) => (
                                <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.sport_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="ev_gender_class">
                        {t('Gender class')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={data.gender_class} onValueChange={(v) => setData('gender_class', v)}>
                        <SelectTrigger id="ev_gender_class">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GENDER_CLASSES.map((g) => (
                                <SelectItem key={g} value={g}>{t(g)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.gender_class} />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="ev_name_hi">
                        {t('Event name (Hindi)')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="ev_name_hi"
                        value={data.name_hi}
                        onChange={(e) => setData('name_hi', e.target.value)}
                        maxLength={255}
                        required
                    />
                    <InputError message={errors.name_hi} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="ev_discipline">{t('Discipline')}</Label>
                    <Input
                        id="ev_discipline"
                        value={data.discipline}
                        onChange={(e) => setData('discipline', e.target.value)}
                        maxLength={255}
                    />
                    <InputError message={errors.discipline} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="ev_weight_category">{t('Weight category')}</Label>
                    <Input
                        id="ev_weight_category"
                        value={data.weight_category}
                        onChange={(e) => setData('weight_category', e.target.value)}
                        maxLength={100}
                    />
                    <InputError message={errors.weight_category} />
                </div>
            </div>

            <Button type="submit" size="sm" disabled={processing}>
                <Plus className="mr-1.5 h-4 w-4" />
                {processing ? t('Saving…') : t('Add event')}
            </Button>
        </form>
    );
}

export default function TournamentsShow({
    tournament,
    sports,
    events,
}: {
    tournament: Tournament;
    sports: Sport[];
    events?: EventRow[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name_hi },
        ],
    });

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
        </div>
    );

    return (
        <>
            <Head title={tournament.name_hi} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{tournament.name_hi}</h1>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {tournament.tier && (
                                <Badge variant="secondary">{tournament.tier.label_hi}</Badge>
                            )}
                            {tournament.session && (
                                <Badge variant="outline">{tournament.session.name}</Badge>
                            )}
                            {tournament.sport && (
                                <Badge variant="outline">{tournament.sport.name}</Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editTournament.url(tournament.id)}>{t('Edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="sm" asChild>
                            <Link
                                href={destroyTournament.url(tournament.id)}
                                method="delete"
                                as="button"
                            >
                                {t('Delete')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="events">{t('Events')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <Heading variant="small" title={t('Overview')} />
                            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(t('Tier'), tournament.tier?.label_hi)}
                                {detail(t('Session'), tournament.session?.name)}
                                {detail(t('Sport'), tournament.sport?.name)}
                                {detail(t('Venue'), tournament.venue)}
                                {detail(t('Date from'), tournament.date_from)}
                                {detail(t('Date to'), tournament.date_to)}
                                {detail(t('Raw date text'), tournament.raw_date_text)}
                            </dl>
                        </div>
                    </TabsContent>

                    {/* Events */}
                    <TabsContent value="events" className="space-y-4">
                        <Deferred data="events" fallback={
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                                ))}
                            </div>
                        }>
                            <div className="overflow-hidden rounded-xl border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead>{t('Event name (Hindi)')}</TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>{t('Gender class')}</TableHead>
                                            <TableHead>{t('Discipline')}</TableHead>
                                            <TableHead>{t('Weight category')}</TableHead>
                                            <TableHead className="text-right">{t('Participations')}</TableHead>
                                            <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(events ?? []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                                    {t('No events yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (events ?? []).map((ev) => (
                                                <TableRow key={ev.id}>
                                                    <TableCell className="font-medium">{ev.name_hi}</TableCell>
                                                    <TableCell className="text-muted-foreground">{ev.sport?.name ?? '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{t(ev.gender_class)}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{ev.discipline ?? '—'}</TableCell>
                                                    <TableCell className="text-muted-foreground">{ev.weight_category ?? '—'}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{ev.participations_count}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={showEvent.url({ tournament: tournament.id, event: ev.id })}>{t('View')}</Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Deferred>

                        <AddEventPanel tournament={tournament} sports={sports} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

