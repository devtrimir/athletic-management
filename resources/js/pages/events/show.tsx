import { Deferred, Head, Link, router, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Camera, Images, List, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroyEvent,
    update as updateEvent,
} from '@/actions/App/Http/Controllers/EventController';
import {
    destroy as destroyParticipant,
    store as storeParticipants,
    update as updateParticipant,
} from '@/actions/App/Http/Controllers/EventParticipantController';
import { index as tournamentsIndex, show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
import { ParticipationMediaSheet } from '@/components/members/participation-media-sheet';
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
import { useTranslation } from '@/hooks/use-translation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TournamentRef = { id: number; name: string };
type Sport = { id: number; name: string };

type EventProp = {
    id: number;
    sport_id: number | null;
    name: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    sport: { id: number; name: string } | null;
};

type ParticipationRow = {
    id: number;
    position: number | null;
    media_files_count: number;
    member: {
        id: number;
        full_name: string;
        pno: string | null;
    } | null;
    achievement: {
        medal_type: string | null;
        position: number | null;
        remarks: string | null;
    } | null;
};

type EventForm = {
    sport_id: string;
    name: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
};

type ParticipantForm = {
    position: string;
    medal_type: string;
    remarks: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const;
const GENDER_CLASSES = ['M', 'F', 'MIXED', 'OPEN'] as const;
const PLAYER_CATEGORIES = ['GD', 'SPORTS_QUOTA'] as const;
const PLAYER_LEVELS = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'] as const;
const PLAYER_STATUSES = ['ACTIVE', 'RESIGNED', 'DISMISSED'] as const;

const MEDAL_CLASSES: Record<string, string> = {
    GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SILVER: 'bg-gray-100 text-gray-700 border-gray-200',
    BRONZE: 'bg-orange-100 text-orange-700 border-orange-200',
    MERIT: 'bg-blue-100 text-blue-700 border-blue-200',
};

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
                            <SelectItem key={g} value={g}>
                                {t(g)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.gender_class} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${idPrefix}_name`}>
                    {t('Event name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                    id={`${idPrefix}_name`}
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    maxLength={255}
                    required
                />
                <InputError message={errors.name} />
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
// Edit Event Dialog
// ---------------------------------------------------------------------------

function EditEventDialog({
    open,
    onOpenChange,
    tournament,
    event,
    sports,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: TournamentRef;
    event: EventProp;
    sports: Sport[];
}) {
    const { t } = useTranslation();
    const { data, setData, patch, errors, processing, reset } = useForm<EventForm>({
        sport_id: event.sport_id ? String(event.sport_id) : '',
        name: event.name,
        discipline: event.discipline ?? '',
        weight_category: event.weight_category ?? '',
        gender_class: event.gender_class,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(updateEvent.url({ tournament: tournament.id, event: event.id }), {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Edit event')}</DialogTitle>
                    <DialogDescription>{event.name}</DialogDescription>
                </DialogHeader>
                <form id="edit-event-form" onSubmit={handleSubmit}>
                    <EventFormFields
                        data={data}
                        setData={(f, v) => setData(f, v)}
                        errors={errors}
                        sports={sports}
                        idPrefix="ev"
                    />
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
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
// Generic Confirm Delete Dialog
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
// Participant form fields (shared between Add and Edit dialogs)
// ---------------------------------------------------------------------------

function ParticipantFormFields({
    data,
    setData,
    errors,
    idPrefix,
}: {
    data: ParticipantForm;
    setData: (field: keyof ParticipantForm, value: string) => void;
    errors: Partial<Record<keyof ParticipantForm, string>>;
    idPrefix: string;
}) {
    const { t } = useTranslation();

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_position`}>{t('Position')}</Label>
                <Input
                    id={`${idPrefix}_position`}
                    type="number"
                    min={1}
                    value={data.position}
                    onChange={(e) => setData('position', e.target.value)}
                    placeholder="—"
                    className="h-9"
                />
                <InputError message={errors.position} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_medal_type`}>{t('Medal')}</Label>
                <Select
                    value={data.medal_type || 'none'}
                    onValueChange={(v) => setData('medal_type', v === 'none' ? '' : v)}
                >
                    <SelectTrigger id={`${idPrefix}_medal_type`} className="h-9">
                        <SelectValue placeholder={t('No medal')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('No medal')}</SelectItem>
                        {MEDAL_TYPES.map((m) => (
                            <SelectItem key={m} value={m}>
                                {t(m)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.medal_type} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${idPrefix}_remarks`}>{t('Remarks')}</Label>
                <Input
                    id={`${idPrefix}_remarks`}
                    value={data.remarks}
                    onChange={(e) => setData('remarks', e.target.value)}
                    maxLength={500}
                    placeholder="—"
                />
                <InputError message={errors.remarks} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Filter chip (inline Select pill with clear button)
// ---------------------------------------------------------------------------

function FilterChip({
    active,
    label,
    options,
    value,
    onSelect,
    onClear,
}: {
    active: boolean;
    label: string;
    options: readonly string[];
    value: string;
    onSelect: (v: string) => void;
    onClear: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-0.5">
            <Select value={value || '__all__'} onValueChange={(v) => onSelect(v === '__all__' ? '' : v)}>
                <SelectTrigger
                    className={`h-7 gap-1 rounded-full border px-3 text-xs font-medium ${
                        active
                            ? 'border-primary/40 bg-primary/8 text-primary'
                            : 'border-input bg-background text-muted-foreground'
                    }`}
                >
                    <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{label}</SelectItem>
                    {options.map((o) => (
                        <SelectItem key={o} value={o}>
                            {t(o)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {active && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                    aria-label={t('Clear filter')}
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Add Participant Dialog
// ---------------------------------------------------------------------------

function AddParticipantDialog({
    open,
    onOpenChange,
    tournament,
    event,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: TournamentRef;
    event: EventProp;
}) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStatus, setFilterStatus] = useState('ACTIVE');

    const { data, setData, errors, reset } = useForm<ParticipantForm>({
        position: '',
        medal_type: '',
        remarks: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const extraFilters: Record<string, string> = {};

    if (filterCategory) {
extraFilters.player_category = filterCategory;
}

    if (filterLevel) {
extraFilters.player_level = filterLevel;
}

    if (filterStatus) {
extraFilters.current_status = filterStatus;
}

    function handleClose() {
        reset();
        setPickedMember(null);
        setFilterCategory('');
        setFilterLevel('');
        setFilterStatus('ACTIVE');
        onOpenChange(false);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!pickedMember) {
            return;
        }

        setSubmitting(true);
        router.post(
            storeParticipants.url({ tournament: tournament.id, event: event.id }),
            {
                participants: [
                    {
                        member_id: pickedMember.id,
                        position: data.position ? parseInt(data.position, 10) : null,
                        medal_type: data.medal_type || null,
                        remarks: data.remarks || null,
                    },
                ],
            },
            {
                onSuccess: () => handleClose(),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(o) => {
 if (!o) {
handleClose();
}
}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Add participant')}</DialogTitle>
                    <DialogDescription>{event.name}</DialogDescription>
                </DialogHeader>

                <form id="add-participant-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Member picker with filter chips */}
                    <div className="space-y-2">
                        <Label>{t('Athlete')}</Label>
                        <div className="flex flex-wrap gap-2">
                            <FilterChip
                                active={!!filterCategory}
                                label={t('Category')}
                                options={PLAYER_CATEGORIES}
                                value={filterCategory}
                                onSelect={setFilterCategory}
                                onClear={() => setFilterCategory('')}
                            />
                            <FilterChip
                                active={!!filterLevel}
                                label={t('Level')}
                                options={PLAYER_LEVELS}
                                value={filterLevel}
                                onSelect={setFilterLevel}
                                onClear={() => setFilterLevel('')}
                            />
                            <FilterChip
                                active={!!filterStatus}
                                label={t('Status')}
                                options={PLAYER_STATUSES}
                                value={filterStatus}
                                onSelect={setFilterStatus}
                                onClear={() => setFilterStatus('')}
                            />
                        </div>
                        <MemberPicker
                            value={pickedMember}
                            onChange={setPickedMember}
                            placeholder={t('Search by name or P.No…')}
                            extraFilters={extraFilters}
                        />
                    </div>

                    <ParticipantFormFields
                        data={data}
                        setData={(f, v) => setData(f, v)}
                        errors={errors}
                        idPrefix="add_p"
                    />
                </form>

                <DialogFooter>
                    <Button variant="outline" type="button" onClick={handleClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="add-participant-form" disabled={submitting || !pickedMember}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {submitting ? t('Saving…') : t('Add participant')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Edit Participant Dialog
// ---------------------------------------------------------------------------

function EditParticipantDialog({
    participation,
    tournament,
    event,
    onClose,
}: {
    participation: ParticipationRow | null;
    tournament: TournamentRef;
    event: EventProp;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { data, setData, patch, errors, processing, reset } = useForm<ParticipantForm>({
        position: participation?.position != null ? String(participation.position) : '',
        medal_type: participation?.achievement?.medal_type ?? '',
        remarks: participation?.achievement?.remarks ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!participation) {
return;
}

        patch(
            updateParticipant.url({
                tournament: tournament.id,
                event: event.id,
                participation: participation.id,
            }),
            {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            },
        );
    }

    return (
        <Dialog open={participation !== null} onOpenChange={(o) => {
 if (!o) {
onClose();
}
}}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Edit participant')}</DialogTitle>
                    <DialogDescription>{participation?.member?.full_name}</DialogDescription>
                </DialogHeader>
                <form id="edit-participant-form" onSubmit={handleSubmit}>
                    <ParticipantFormFields
                        data={data}
                        setData={(f, v) => setData(f, v)}
                        errors={errors}
                        idPrefix="edit_p"
                    />
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="edit-participant-form" disabled={processing}>
                        {processing ? t('Saving…') : t('Save changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Medal Badge
// ---------------------------------------------------------------------------

function MedalBadge({ medal }: { medal: string | null }) {
    const { t } = useTranslation();

    if (!medal) {
return <span className="text-muted-foreground text-xs">—</span>;
}

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MEDAL_CLASSES[medal] ?? ''}`}
        >
            {t(medal)}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Participants list (deferred child)
// ---------------------------------------------------------------------------

function ParticipantsList({
    participations,
    tournament,
    event,
    canUpload,
    canDelete,
}: {
    participations: ParticipationRow[];
    tournament: TournamentRef;
    event: EventProp;
    canUpload: boolean;
    canDelete: boolean;
}) {
    const { t } = useTranslation();
    const [editingParticipation, setEditingParticipation] = useState<ParticipationRow | null>(null);
    const [deletingParticipation, setDeletingParticipation] = useState<ParticipationRow | null>(null);
    const [mediaParticipation, setMediaParticipation] = useState<ParticipationRow | null>(null);
    const { delete: deleteParticipant, processing: deletingProcessing } = useForm({});

    function handleDelete() {
        if (!deletingParticipation) {
return;
}

        deleteParticipant(
            destroyParticipant.url({
                tournament: tournament.id,
                event: event.id,
                participation: deletingParticipation.id,
            }),
            { onSuccess: () => setDeletingParticipation(null) },
        );
    }

    if (participations.length === 0) {
        return (
            <p className="text-muted-foreground py-8 text-center text-sm">{t('No participants yet.')}</p>
        );
    }

    return (
        <>
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-slate-300 bg-slate-100 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                            <TableHead className="w-12 border-r border-slate-300 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('S.No.')}
                            </TableHead>
                            <TableHead className="min-w-56 border-r border-slate-300 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('Member name')}
                            </TableHead>
                            <TableHead className="w-36 border-r border-slate-300 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('PNO')}
                            </TableHead>
                            <TableHead className="w-24 border-r border-slate-300 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('Position')}
                            </TableHead>
                            <TableHead className="w-32 border-r border-slate-300 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('Medal')}
                            </TableHead>
                            <TableHead className="min-w-48 border-r border-slate-300 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                {t('Remarks')}
                            </TableHead>
                            <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                                {t('Actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participations.map((p, idx) => (
                            <TableRow
                                key={p.id}
                                className="border-b border-slate-200 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/60"
                            >
                                <TableCell className="border-r border-slate-200 text-center text-xs tabular-nums text-muted-foreground dark:border-slate-800">
                                    {idx + 1}
                                </TableCell>
                                <TableCell className="border-r border-slate-200 py-2 dark:border-slate-800">
                                    <div className="text-sm font-medium">
                                        {p.member?.full_name ?? '—'}
                                    </div>
                                </TableCell>
                                <TableCell className="border-r border-slate-200 py-2 text-sm tabular-nums dark:border-slate-800">
                                    {p.member?.pno ?? (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="border-r border-slate-200 py-2 text-center tabular-nums dark:border-slate-800">
                                    {p.position ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="border-r border-slate-200 py-2 dark:border-slate-800">
                                    <MedalBadge medal={p.achievement?.medal_type ?? null} />
                                </TableCell>
                                <TableCell className="max-w-[260px] border-r border-slate-200 py-2 text-sm text-muted-foreground dark:border-slate-800">
                                    <span className="line-clamp-2">
                                    {p.achievement?.remarks || '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                                variant="ghost"
                                                size="icon"
                                                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title={t('Photos')}
                                                onClick={() => setMediaParticipation(p)}
                                            >
                                                {(canUpload || canDelete) ? (
                                                    <Camera className="h-4 w-4" />
                                                ) : (
                                                    <Images className="h-4 w-4" />
                                                )}
                                                {p.media_files_count > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                                                        {p.media_files_count > 9 ? '9+' : p.media_files_count}
                                                    </span>
                                                )}
                                                <span className="sr-only">{t('Photos')}</span>
                                            </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title={t('Edit participant')}
                                            onClick={() => setEditingParticipation(p)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">{t('Edit participant')}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            title={t('Remove participant')}
                                            onClick={() => setDeletingParticipation(p)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Remove participant')}</span>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <EditParticipantDialog
                key={editingParticipation?.id ?? 'none'}
                participation={editingParticipation}
                tournament={tournament}
                event={event}
                onClose={() => setEditingParticipation(null)}
            />
            <ConfirmDeleteDialog
                open={deletingParticipation !== null}
                onOpenChange={(o) => {
 if (!o) {
setDeletingParticipation(null);
}
}}
                title={t('Remove participant')}
                description={t('This will permanently delete the participation and any medal record. This action cannot be undone.')}
                confirmLabel={t('Remove')}
                onConfirm={handleDelete}
                processing={deletingProcessing}
            />
            {mediaParticipation && (
                <ParticipationMediaSheet
                    participationId={mediaParticipation.id}
                    memberName={mediaParticipation.member?.full_name ?? ''}
                    open={mediaParticipation !== null}
                    onOpenChange={(o) => {
 if (!o) {
setMediaParticipation(null);
}
}}
                    canUpload={canUpload}
                    canDelete={canDelete}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EventsShow({
    tournament,
    event,
    sports,
    participations,
}: {
    tournament: TournamentRef;
    event: EventProp;
    sports: Sport[];
    participations?: ParticipationRow[];
}) {
    const { t } = useTranslation();
    const permissions = usePage().props.auth.permissions;
    const canUploadMedia = permissions.includes('media.upload');
    const canDeleteMedia = permissions.includes('media.delete');
    const [editEventOpen, setEditEventOpen] = useState(false);
    const [deleteEventOpen, setDeleteEventOpen] = useState(false);
    const [addParticipantOpen, setAddParticipantOpen] = useState(false);
    const { delete: deleteEventForm, processing: deletingEventProcessing } = useForm({});

    function handleDeleteEvent() {
        deleteEventForm(destroyEvent.url({ tournament: tournament.id, event: event.id }), {
            onSuccess: () => setDeleteEventOpen(false),
        });
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name, href: showTournament.url(tournament.id) },
            { title: event.name },
        ],
    });

    const participantCount = participations?.length ?? 0;

    return (
        <>
            <Head title={event.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={tournamentsIndex()}>
                                <List className="mr-1.5 h-4 w-4" />
                                {t('All tournaments')}
                            </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={showTournament(tournament.id)}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Tournament overview')}
                            </Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{tournament.name}</p>
                            <Heading variant="small" title={event.name} />
                            <div className="flex flex-wrap gap-2">
                                {event.sport && <Badge variant="secondary">{event.sport.name}</Badge>}
                                <Badge variant="outline">{t(event.gender_class)}</Badge>
                                {event.discipline && <Badge variant="outline">{event.discipline}</Badge>}
                                {event.weight_category && <Badge variant="outline">{event.weight_category}</Badge>}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditEventOpen(true)}>
                                <Pencil className="mr-1.5 h-4 w-4" />
                                {t('Edit')}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteEventOpen(true)}>
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                {t('Delete')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Participants section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold">{t('Participants')}</h2>
                            {participations !== undefined && (
                                <p className="text-muted-foreground text-sm">
                                    {participantCount}{' '}
                                    {t(participantCount === 1 ? 'participant' : 'participants')}
                                </p>
                            )}
                        </div>
                        <Button size="sm" onClick={() => setAddParticipantOpen(true)}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('Add participant')}
                        </Button>
                    </div>

                    <Deferred data="participations" fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
                        <ParticipantsList
                            participations={participations ?? []}
                            tournament={tournament}
                            event={event}
                            canUpload={canUploadMedia}
                            canDelete={canDeleteMedia}
                        />
                    </Deferred>
                </div>
            </div>

            {/* Dialogs */}
            <EditEventDialog
                open={editEventOpen}
                onOpenChange={setEditEventOpen}
                tournament={tournament}
                event={event}
                sports={sports}
            />
            <ConfirmDeleteDialog
                open={deleteEventOpen}
                onOpenChange={setDeleteEventOpen}
                title={t('Delete event')}
                description={t('This will permanently delete the event and all its participations. This action cannot be undone.')}
                confirmLabel={t('Delete event')}
                onConfirm={handleDeleteEvent}
                processing={deletingEventProcessing}
            />
            <AddParticipantDialog
                open={addParticipantOpen}
                onOpenChange={setAddParticipantOpen}
                tournament={tournament}
                event={event}
            />
        </>
    );
}
