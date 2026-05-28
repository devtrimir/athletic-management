import { Deferred, Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroyEvent,
    store as storeEvent,
    show as showEvent,
    update as updateEvent,
} from '@/actions/App/Http/Controllers/EventController';
import { destroy as destroyTournament, edit as editTournament, index as tournamentsIndex } from '@/actions/App/Http/Controllers/TournamentController';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    tier: { id: number; code: string; label: string } | null;
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

type EventForm = {
    sport_id: string;
    name_hi: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
};

const GENDER_CLASSES = ['M', 'F', 'MIXED', 'OPEN'] as const;

// ---------------------------------------------------------------------------
// Shared event form fields
// ---------------------------------------------------------------------------
function EventFormFields({
    data,
    setData,
    errors,
    sports,
    idPrefix,
}: {
    data: EventForm;
    setData: (field: keyof EventForm, value: string) => void;
    errors: Partial<Record<keyof EventForm, string>>;
    sports: Sport[];
    idPrefix: string;
}) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_sport_id`}>
                    {t('Sport')} <span className="text-destructive">*</span>
                </Label>
                <Combobox
                    id={`${idPrefix}_sport_id`}
                    value={data.sport_id}
                    onValueChange={(v) => setData('sport_id', v)}
                    items={sports.map((sp) => ({ value: String(sp.id), label: sp.name }))}
                    placeholder={t('Select sport')}
                    searchPlaceholder={t('Search sports…')}
                />
                <InputError message={errors.sport_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_gender_class`}>
                    {t('Gender class')} <span className="text-destructive">*</span>
                </Label>
                <Select value={data.gender_class} onValueChange={(v) => setData('gender_class', v)}>
                    <SelectTrigger id={`${idPrefix}_gender_class`}>
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
                <Label htmlFor={`${idPrefix}_name_hi`}>
                    {t('Event name (Hindi)')} <span className="text-destructive">*</span>
                </Label>
                <Input
                    id={`${idPrefix}_name_hi`}
                    value={data.name_hi}
                    onChange={(e) => setData('name_hi', e.target.value)}
                    maxLength={255}
                    required
                />
                <InputError message={errors.name_hi} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_discipline`}>{t('Discipline')}</Label>
                <Input
                    id={`${idPrefix}_discipline`}
                    value={data.discipline}
                    onChange={(e) => setData('discipline', e.target.value)}
                    maxLength={255}
                />
                <InputError message={errors.discipline} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_weight_category`}>{t('Weight category')}</Label>
                <Input
                    id={`${idPrefix}_weight_category`}
                    value={data.weight_category}
                    onChange={(e) => setData('weight_category', e.target.value)}
                    maxLength={100}
                />
                <InputError message={errors.weight_category} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Add Event Dialog
// ---------------------------------------------------------------------------
function AddEventDialog({
    open,
    onOpenChange,
    tournament,
    sports,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: Tournament;
    sports: Sport[];
}) {
    const { t } = useTranslation();
    const { data, setData, post, errors, processing, reset } = useForm<EventForm>({
        sport_id: tournament.sport ? String(tournament.sport.id) : '',
        name_hi: '',
        discipline: '',
        weight_category: '',
        gender_class: 'M',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeEvent.url(tournament.id), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Add event')}</DialogTitle>
                    <DialogDescription>{t('Add a new event to this tournament.')}</DialogDescription>
                </DialogHeader>
                <form id="add-event-form" onSubmit={handleSubmit}>
                    <EventFormFields
                        data={data}
                        setData={(field, value) => setData(field, value)}
                        errors={errors}
                        sports={sports}
                        idPrefix="add_ev"
                    />
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="add-event-form" disabled={processing}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {processing ? t('Saving…') : t('Add event')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Edit Event Dialog
// ---------------------------------------------------------------------------
function EditEventDialog({
    event,
    tournament,
    sports,
    onClose,
}: {
    event: EventRow | null;
    tournament: Tournament;
    sports: Sport[];
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { data, setData, patch, errors, processing, reset } = useForm<EventForm>({
        sport_id: event?.sport ? String(event.sport.id) : '',
        name_hi: event?.name_hi ?? '',
        discipline: event?.discipline ?? '',
        weight_category: event?.weight_category ?? '',
        gender_class: event?.gender_class ?? 'M',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!event) {
            return;
        }

        patch(updateEvent.url({ tournament: tournament.id, event: event.id }), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Dialog open={event !== null} onOpenChange={(open) => {
 if (!open) {
 onClose();
}
}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Edit event')}</DialogTitle>
                    <DialogDescription>{event?.name_hi}</DialogDescription>
                </DialogHeader>
                <form id="edit-event-form" onSubmit={handleSubmit}>
                    <EventFormFields
                        data={data}
                        setData={(field, value) => setData(field, value)}
                        errors={errors}
                        sports={sports}
                        idPrefix="edit_ev"
                    />
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="edit-event-form" disabled={processing}>
                        {processing ? t('Saving…') : t('Save changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Confirm Delete Dialog (generic)
// ---------------------------------------------------------------------------
function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    processing,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    processing?: boolean;
}) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        {t('Cancel')}
                    </Button>
                    <Button variant="destructive" type="button" onClick={onConfirm} disabled={processing}>
                        {processing ? t('Deleting…') : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
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

    const [addEventOpen, setAddEventOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
    const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null);
    const [deleteTournamentOpen, setDeleteTournamentOpen] = useState(false);

    const { delete: deleteEventForm, processing: deletingEventProcessing } = useForm({});
    const { delete: deleteTournamentForm, processing: deletingTournamentProcessing } = useForm({});

    function handleDeleteEvent() {
        if (!deletingEvent) {
            return;
        }

        deleteEventForm(destroyEvent.url({ tournament: tournament.id, event: deletingEvent.id }), {
            onSuccess: () => setDeletingEvent(null),
        });
    }

    function handleDeleteTournament() {
        deleteTournamentForm(destroyTournament.url(tournament.id), {
            onSuccess: () => setDeleteTournamentOpen(false),
        });
    }

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
                                <Badge variant="secondary">{tournament.tier.label}</Badge>
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
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTournamentOpen(true)}
                        >
                            {t('Delete')}
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
                                {detail(t('Tier'), tournament.tier?.label)}
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
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {t('Manage the events for this tournament.')}
                            </p>
                            <Button size="sm" onClick={() => setAddEventOpen(true)}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add event')}
                            </Button>
                        </div>
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
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={showEvent.url({ tournament: tournament.id, event: ev.id })}>{t('View')}</Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                title={t('Edit event')}
                                                                onClick={() => setEditingEvent(ev)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span className="sr-only">{t('Edit event')}</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                title={t('Delete event')}
                                                                onClick={() => setDeletingEvent(ev)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">{t('Delete event')}</span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Deferred>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialogs */}
            <AddEventDialog
                open={addEventOpen}
                onOpenChange={setAddEventOpen}
                tournament={tournament}
                sports={sports}
            />
            <EditEventDialog
                event={editingEvent}
                tournament={tournament}
                sports={sports}
                onClose={() => setEditingEvent(null)}
            />
            <ConfirmDeleteDialog
                open={deletingEvent !== null}
                onOpenChange={(open) => {
 if (!open) {
 setDeletingEvent(null);
}
}}
                title={t('Delete event')}
                description={t('This will permanently delete the event and all its participations. This action cannot be undone.')}
                confirmLabel={t('Delete event')}
                onConfirm={handleDeleteEvent}
                processing={deletingEventProcessing}
            />
            <ConfirmDeleteDialog
                open={deleteTournamentOpen}
                onOpenChange={setDeleteTournamentOpen}
                title={t('Delete tournament')}
                description={t('This will permanently delete the tournament and all its events and participations. This action cannot be undone.')}
                confirmLabel={t('Delete tournament')}
                onConfirm={handleDeleteTournament}
                processing={deletingTournamentProcessing}
            />
        </>
    );
}
