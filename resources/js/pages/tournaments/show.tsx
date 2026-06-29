import { Head, Link, router, setLayoutProps, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    Dumbbell,
    Eye,
    Info,
    MapPin,
    Medal,
    Pencil,
    Plus,
    Search,
    Trash2,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import {
    destroy as destroyEvent,
    store as storeEvent,
    show as showEvent,
    update as updateEvent,
} from '@/actions/App/Http/Controllers/EventController';
import {
    destroy as destroyTournament,
    edit as editTournament,
    index as tournamentsIndex,
    show as showTournament,
} from '@/actions/App/Http/Controllers/TournamentController';
import { events as tournamentEvents } from '@/actions/App/Http/Controllers/TournamentProfileTabController';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Tournament = {
    id: number;
    name: string;
    venue: string | null;
    date_from: string | null;
    date_to: string | null;
    raw_date_text: string | null;
    created_at: string | null;
    events_count: number;
    participants_count: number;
    teams_count: number;
    medals_count: number;
    session: { id: number; name: string } | null;
    tier: { id: number; code: string; label: string } | null;
    sport: { id: number; name: string } | null;
};

type EventRow = {
    id: number;
    name: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    sport_event_variant_id: number | null;
    event_source: string;
    provisional_reason: string | null;
    participations_count: number;
    can_update_structure: boolean;
    teams_count: number;
    medals_count: number;
    sport: { id: number; name: string } | null;
};

type Sport = { id: number; name: string };
type EventVariant = {
    id: number;
    sport_id: number;
    sport_name: string;
    label: string;
    name: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    gender_label: string | null;
    format: string | null;
    result_type: string | null;
    measurement_unit: string | null;
    measurement_symbol: string | null;
    min_participants: number | null;
    max_participants: number | null;
    substitute_allowed: boolean;
    substitute_limit: number | null;
    is_team_based: boolean;
    is_medal_event: boolean;
};
type EventFilters = {
    q?: string | null;
    sport_id?: string | null;
    gender_class?: string | null;
    participation_status?: string | null;
};

type EventForm = {
    event_mode: 'official' | 'provisional';
    sport_event_variant_id: string;
    sport_event_variant_ids: string[];
    sport_id: string;
    name: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
    provisional_reason: string;
};

const GENDER_CLASSES = ['M', 'F', 'MIXED', 'OPEN'] as const;
const GENDER_CLASS_LABELS: Record<(typeof GENDER_CLASSES)[number], string> = {
    M: 'Men',
    F: 'Women',
    MIXED: 'Mixed',
    OPEN: 'Open',
};

function genderClassLabel(value: string, t: (key: string) => string): string {
    return t(
        GENDER_CLASS_LABELS[value as keyof typeof GENDER_CLASS_LABELS] ?? value,
    );
}

function eventBadgeClass(kind: 'sport' | 'class' | 'count' | 'detail'): string {
    const base =
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium';

    switch (kind) {
        case 'sport':
            return `${base} border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300`;
        case 'class':
            return `${base} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300`;
        case 'count':
            return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300`;
        case 'detail':
            return `${base} border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300`;
    }
}

function participantRange(min: number | null, max: number | null): string {
    if (min === null && max === null) {
        return '—';
    }

    if (min !== null && max !== null && min === max) {
        return String(min);
    }

    return `${min ?? '—'}-${max ?? '—'}`;
}

function eventVariantOption(variant: EventVariant, t: (key: string) => string) {
    const participantText = participantRange(
        variant.min_participants,
        variant.max_participants,
    );
    const details = [
        variant.gender_label ?? genderClassLabel(variant.gender_class, t),
        variant.result_type,
        variant.measurement_symbol ?? variant.measurement_unit,
        participantText !== '—'
            ? `${t('Participants')}: ${participantText}`
            : null,
        variant.substitute_allowed
            ? `${t('Substitutes')}: ${variant.substitute_limit ?? t('Allowed')}`
            : null,
    ].filter(Boolean);

    return {
        value: String(variant.id),
        label: variant.label,
        badge: variant.is_team_based ? t('Team') : t('Individual'),
        badgeTone: variant.is_team_based
            ? ('team' as const)
            : ('individual' as const),
        group: [variant.sport_name, variant.format ?? t('Events')]
            .filter(Boolean)
            .join(' / '),
        description: details.join(' · '),
    };
}

// ---------------------------------------------------------------------------
// Shared event form fields
// ---------------------------------------------------------------------------
function EventFormFields({
    data,
    setData,
    errors,
    sports,
    eventVariants,
    idPrefix,
    allowMultipleOfficial = false,
    existingVariantIds = [],
}: {
    data: EventForm;
    setData: (values: Partial<EventForm>) => void;
    errors: Partial<
        Record<keyof EventForm | 'sport_event_variant_ids.0', string>
    >;
    sports: Sport[];
    eventVariants: EventVariant[];
    idPrefix: string;
    allowMultipleOfficial?: boolean;
    existingVariantIds?: number[];
}) {
    const { t } = useTranslation();
    const [variantSearch, setVariantSearch] = useState('');
    const selectedVariant = eventVariants.find(
        (variant) => String(variant.id) === data.sport_event_variant_id,
    );
    const filteredVariants = eventVariants.filter((variant) => {
        const sportMatches =
            !data.sport_id || String(variant.sport_id) === data.sport_id;
        const search = variantSearch.trim().toLowerCase();
        const searchMatches =
            search === '' ||
            [
                variant.label,
                variant.name,
                variant.sport_name,
                variant.discipline,
                variant.weight_category,
                variant.gender_label,
                variant.format,
            ]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(search));

        return sportMatches && searchMatches;
    });
    const selectedVariantIds = new Set(data.sport_event_variant_ids);
    const existingVariantIdSet = new Set(
        existingVariantIds.map((id) => String(id)),
    );
    const selectedVariants = eventVariants.filter((variant) =>
        selectedVariantIds.has(String(variant.id)),
    );

    function selectSport(value: string) {
        const updates: Partial<EventForm> = { sport_id: value };

        if (
            data.sport_event_variant_id &&
            !eventVariants.some(
                (variant) =>
                    String(variant.id) === data.sport_event_variant_id &&
                    String(variant.sport_id) === value,
            )
        ) {
            updates.sport_event_variant_id = '';
        }

        if (data.sport_event_variant_ids.length > 0) {
            updates.sport_event_variant_ids =
                data.sport_event_variant_ids.filter((id) =>
                    eventVariants.some(
                        (variant) =>
                            String(variant.id) === id &&
                            String(variant.sport_id) === value,
                    ),
                );
        }

        setData(updates);
    }

    function selectVariant(value: string) {
        const variant = eventVariants.find((item) => String(item.id) === value);

        if (variant) {
            setData({
                sport_event_variant_id: value,
                sport_id: String(variant.sport_id),
                name: variant.name,
                discipline: variant.discipline ?? '',
                weight_category: variant.weight_category ?? '',
                gender_class: variant.gender_class,
            });
        } else {
            setData({ sport_event_variant_id: value });
        }
    }

    function toggleVariant(value: string) {
        if (existingVariantIdSet.has(value)) {
            return;
        }

        const variant = eventVariants.find((item) => String(item.id) === value);
        const next = selectedVariantIds.has(value)
            ? data.sport_event_variant_ids.filter((id) => id !== value)
            : [...data.sport_event_variant_ids, value];

        const updates: Partial<EventForm> = {
            sport_event_variant_ids: next,
            sport_event_variant_id: next[0] ?? '',
        };

        if (variant && next.length === 1) {
            updates.sport_id = String(variant.sport_id);
            updates.name = variant.name;
            updates.discipline = variant.discipline ?? '';
            updates.weight_category = variant.weight_category ?? '';
            updates.gender_class = variant.gender_class;
        }

        setData(updates);
    }

    function useOfficialMode() {
        setData({ event_mode: 'official' });
    }

    function useProvisionalMode() {
        const updates: Partial<EventForm> = { event_mode: 'provisional' };

        if (!data.provisional_reason) {
            updates.provisional_reason = t(
                'Reference event not available in master data',
            );
        }

        if (selectedVariant) {
            updates.sport_id = String(selectedVariant.sport_id);
            updates.name = selectedVariant.name;
            updates.discipline = selectedVariant.discipline ?? '';
            updates.weight_category = selectedVariant.weight_category ?? '';
            updates.gender_class = selectedVariant.gender_class;
        }

        setData(updates);
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex rounded-lg border bg-muted/20 p-1 sm:col-span-2">
                <Button
                    type="button"
                    variant={
                        data.event_mode === 'official' ? 'default' : 'ghost'
                    }
                    className="flex-1"
                    disabled={eventVariants.length === 0}
                    onClick={useOfficialMode}
                >
                    {t('Official event')}
                </Button>
                <Button
                    type="button"
                    variant={
                        data.event_mode === 'provisional' ? 'default' : 'ghost'
                    }
                    className="flex-1"
                    onClick={useProvisionalMode}
                >
                    {t('Provisional event')}
                </Button>
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_sport_id`}>
                    {t('Sport')} <span className="text-destructive">*</span>
                </Label>
                <Combobox
                    id={`${idPrefix}_sport_id`}
                    value={data.sport_id}
                    onValueChange={selectSport}
                    items={sports.map((sp) => ({
                        value: String(sp.id),
                        label: sp.name,
                    }))}
                    placeholder={t('Select sport')}
                    searchPlaceholder={t('Search sports…')}
                />
                <InputError message={errors.sport_id} />
            </div>

            {data.event_mode === 'official' ? (
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`${idPrefix}_sport_event_variant_id`}>
                        {t('Official event')}{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    {allowMultipleOfficial ? (
                        <div className="rounded-lg border bg-background">
                            <div className="border-b p-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id={`${idPrefix}_sport_event_variant_id`}
                                        value={variantSearch}
                                        onChange={(event) =>
                                            setVariantSearch(event.target.value)
                                        }
                                        placeholder={t(
                                            'Search official events…',
                                        )}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-3">
                                {filteredVariants.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        {t('No official events found.')}
                                    </p>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {filteredVariants.map((variant) => {
                                            const value = String(variant.id);
                                            const checked =
                                                selectedVariantIds.has(value);
                                            const disabled =
                                                existingVariantIdSet.has(value);

                                            return (
                                                <label
                                                    key={variant.id}
                                                    className={`flex gap-3 rounded-md border p-3 text-sm transition ${
                                                        disabled
                                                            ? 'cursor-not-allowed border-muted bg-muted/30 opacity-60'
                                                            : 'cursor-pointer hover:bg-muted/40'
                                                    } ${
                                                        checked
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border'
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onCheckedChange={() =>
                                                            toggleVariant(value)
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span className="min-w-0 space-y-1">
                                                        <span className="block font-medium">
                                                            {variant.label}
                                                        </span>
                                                        {disabled ? (
                                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                                                {t(
                                                                    'Already added',
                                                                )}
                                                            </span>
                                                        ) : null}
                                                        <span className="block text-xs text-muted-foreground">
                                                            {[
                                                                variant.sport_name,
                                                                variant.discipline,
                                                                variant.weight_category,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' / ')}
                                                        </span>
                                                        <span className="block text-xs text-muted-foreground">
                                                            {[
                                                                variant.gender_label ??
                                                                    genderClassLabel(
                                                                        variant.gender_class,
                                                                        t,
                                                                    ),
                                                                variant.format,
                                                                variant.result_type,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                <span>
                                    {data.sport_event_variant_ids.length}{' '}
                                    {t('selected')}
                                </span>
                                {data.sport_event_variant_ids.length > 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setData({
                                                sport_event_variant_ids: [],
                                                sport_event_variant_id: '',
                                            });
                                        }}
                                    >
                                        {t('Clear')}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <Combobox
                            id={`${idPrefix}_sport_event_variant_id`}
                            value={data.sport_event_variant_id}
                            onValueChange={selectVariant}
                            items={filteredVariants.map((variant) =>
                                eventVariantOption(variant, t),
                            )}
                            placeholder={t('Select official event')}
                            searchPlaceholder={t('Search official events…')}
                            emptyMessage={t('No official events found.')}
                            popoverClassName="w-[min(760px,calc(100vw-2rem))]"
                        />
                    )}
                    <InputError message={errors.sport_event_variant_id} />
                    <InputError message={errors.sport_event_variant_ids} />
                    <InputError message={errors['sport_event_variant_ids.0']} />
                </div>
            ) : null}

            {allowMultipleOfficial &&
            data.event_mode === 'official' &&
            selectedVariants.length > 0 ? (
                <div className="rounded-lg border bg-muted/20 p-3 sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        {t('Selected official events')}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {selectedVariants.map((variant) => (
                            <div
                                key={variant.id}
                                className="rounded-md border bg-background p-2"
                            >
                                <div className="font-medium">
                                    {variant.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {[
                                        variant.gender_label ??
                                            genderClassLabel(
                                                variant.gender_class,
                                                t,
                                            ),
                                        variant.format,
                                        variant.result_type,
                                        participantRange(
                                            variant.min_participants,
                                            variant.max_participants,
                                        ) !== '—'
                                            ? `${t('Participants')}: ${participantRange(
                                                  variant.min_participants,
                                                  variant.max_participants,
                                              )}`
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {!allowMultipleOfficial &&
            selectedVariant &&
            data.event_mode === 'official' ? (
                <div className="rounded-lg border bg-muted/20 p-3 sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        {t('Official event details')}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <span>
                            {t('Gender')}:{' '}
                            {selectedVariant.gender_label ??
                                genderClassLabel(
                                    selectedVariant.gender_class,
                                    t,
                                )}
                        </span>
                        <span>
                            {t('Format')}: {selectedVariant.format ?? '—'}
                        </span>
                        <span>
                            {t('Result type')}:{' '}
                            {selectedVariant.result_type ?? '—'}
                        </span>
                        <span>
                            {t('Participants')}:{' '}
                            {participantRange(
                                selectedVariant.min_participants,
                                selectedVariant.max_participants,
                            )}
                        </span>
                        <span>
                            {t('Unit')}:{' '}
                            {selectedVariant.measurement_symbol ??
                                selectedVariant.measurement_unit ??
                                '—'}
                        </span>
                        <span>
                            {t('Substitutes')}:{' '}
                            {selectedVariant.substitute_allowed
                                ? (selectedVariant.substitute_limit ??
                                  t('Allowed'))
                                : t('No')}
                        </span>
                    </div>
                </div>
            ) : null}

            {data.event_mode === 'provisional' ? (
                <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        {t(
                            'Use provisional entry only when the official event is not available in sport master data.',
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor={`${idPrefix}_gender_class`}>
                            {t('Gender class')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={data.gender_class}
                            onValueChange={(v) => setData({ gender_class: v })}
                        >
                            <SelectTrigger id={`${idPrefix}_gender_class`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {GENDER_CLASSES.map((g) => (
                                    <SelectItem key={g} value={g}>
                                        {genderClassLabel(g, t)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.gender_class} />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`${idPrefix}_name`}>
                            {t('Event name')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`${idPrefix}_name`}
                            value={data.name}
                            onChange={(e) => setData({ name: e.target.value })}
                            maxLength={255}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor={`${idPrefix}_discipline`}>
                            {t('Discipline')}
                        </Label>
                        <Input
                            id={`${idPrefix}_discipline`}
                            value={data.discipline}
                            onChange={(e) =>
                                setData({ discipline: e.target.value })
                            }
                            maxLength={255}
                        />
                        <InputError message={errors.discipline} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor={`${idPrefix}_weight_category`}>
                            {t('Weight category')}
                        </Label>
                        <Input
                            id={`${idPrefix}_weight_category`}
                            value={data.weight_category}
                            onChange={(e) =>
                                setData({ weight_category: e.target.value })
                            }
                            maxLength={100}
                        />
                        <InputError message={errors.weight_category} />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`${idPrefix}_provisional_reason`}>
                            {t('Reason')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`${idPrefix}_provisional_reason`}
                            value={data.provisional_reason}
                            onChange={(e) =>
                                setData({
                                    provisional_reason: e.target.value,
                                })
                            }
                            maxLength={1000}
                            placeholder={t(
                                'Reference event not available in master data',
                            )}
                        />
                        <InputError message={errors.provisional_reason} />
                    </div>
                </>
            ) : null}
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
    eventVariants = [],
    events = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: Tournament;
    sports: Sport[];
    eventVariants?: EventVariant[];
    events?: EventRow[];
}) {
    const { t } = useTranslation();
    const existingVariantIds = events
        .map((event) => event.sport_event_variant_id)
        .filter((id): id is number => id !== null);
    const { data, setData, post, errors, processing, reset } =
        useForm<EventForm>({
            event_mode: eventVariants.length > 0 ? 'official' : 'provisional',
            sport_event_variant_id: '',
            sport_event_variant_ids: [],
            sport_id: tournament.sport ? String(tournament.sport.id) : '',
            name: '',
            discipline: '',
            weight_category: '',
            gender_class: 'M',
            provisional_reason: '',
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

    function updateFields(values: Partial<EventForm>) {
        setData({
            ...data,
            ...values,
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('Add event')}</DialogTitle>
                    <DialogDescription>
                        {t('Add a new event to this tournament.')}
                    </DialogDescription>
                </DialogHeader>
                <form id="add-event-form" onSubmit={handleSubmit}>
                    <EventFormFields
                        data={data}
                        setData={updateFields}
                        errors={errors}
                        sports={sports}
                        eventVariants={eventVariants}
                        idPrefix="add_ev"
                        allowMultipleOfficial
                        existingVariantIds={existingVariantIds}
                    />
                </form>
                <DialogFooter>
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="add-event-form"
                        disabled={processing}
                    >
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
    eventVariants = [],
    onClose,
}: {
    event: EventRow | null;
    tournament: Tournament;
    sports: Sport[];
    eventVariants?: EventVariant[];
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { data, setData, patch, errors, processing, reset } =
        useForm<EventForm>({
            event_mode: event?.sport_event_variant_id
                ? 'official'
                : 'provisional',
            sport_event_variant_id: event?.sport_event_variant_id
                ? String(event.sport_event_variant_id)
                : '',
            sport_event_variant_ids: [],
            sport_id: event?.sport ? String(event.sport.id) : '',
            name: event?.name ?? '',
            discipline: event?.discipline ?? '',
            weight_category: event?.weight_category ?? '',
            gender_class: event?.gender_class ?? 'M',
            provisional_reason: event?.provisional_reason ?? '',
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

    function updateFields(values: Partial<EventForm>) {
        setData({
            ...data,
            ...values,
        });
    }

    return (
        <Dialog
            open={event !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('Edit event')}</DialogTitle>
                    <DialogDescription>{event?.name}</DialogDescription>
                </DialogHeader>
                <form id="edit-event-form" onSubmit={handleSubmit}>
                    <EventFormFields
                        data={data}
                        setData={updateFields}
                        errors={errors}
                        sports={sports}
                        eventVariants={eventVariants}
                        idPrefix="edit_ev"
                    />
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="edit-event-form"
                        disabled={processing}
                    >
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
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                    >
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
    activeTab,
    sports,
    eventVariants = [],
    eventFilters = {},
    events,
}: {
    tournament: Tournament;
    activeTab: 'overview' | 'events';
    sports: Sport[];
    eventVariants?: EventVariant[];
    eventFilters?: EventFilters;
    events?: EventRow[];
}) {
    const { t } = useTranslation();

    const [addEventOpen, setAddEventOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
    const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null);
    const [deleteTournamentOpen, setDeleteTournamentOpen] = useState(false);

    const { delete: deleteEventForm, processing: deletingEventProcessing } =
        useForm({});
    const {
        delete: deleteTournamentForm,
        processing: deletingTournamentProcessing,
    } = useForm({});

    function handleDeleteEvent() {
        if (!deletingEvent) {
            return;
        }

        deleteEventForm(
            destroyEvent.url({
                tournament: tournament.id,
                event: deletingEvent.id,
            }),
            {
                onSuccess: () => setDeletingEvent(null),
            },
        );
    }

    function handleDeleteTournament() {
        deleteTournamentForm(destroyTournament.url(tournament.id), {
            onSuccess: () => setDeleteTournamentOpen(false),
        });
    }

    function applyEventFilters(patch: Partial<EventFilters>) {
        const merged: EventFilters = {
            q: eventFilters.q ?? null,
            sport_id: eventFilters.sport_id ?? null,
            gender_class: eventFilters.gender_class ?? null,
            participation_status: eventFilters.participation_status ?? null,
            ...patch,
        };
        const query: Record<string, string> = {};

        for (const [key, value] of Object.entries(merged)) {
            if (value) {
                query[`filter[${key}]`] = value;
            }
        }

        router.get(tournamentEvents.url(tournament.id), query, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function clearEventFilters() {
        router.get(
            tournamentEvents.url(tournament.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

    function submitEventSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        applyEventFilters({
            q: String(formData.get('q') ?? '').trim() || null,
        });
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name },
        ],
    });

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">
                {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );

    function parseDateValue(value: string | null): Date | null {
        if (!value) {
            return null;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value: string | null): string {
        const date = parseDateValue(value);

        if (!date) {
            return value ?? '—';
        }

        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
        }).format(date);
    }

    function dateRange(): string {
        if (
            tournament.date_from &&
            tournament.date_to &&
            tournament.date_from !== tournament.date_to
        ) {
            return `${formatDate(tournament.date_from)} - ${formatDate(tournament.date_to)}`;
        }

        return formatDate(tournament.date_from ?? tournament.date_to);
    }

    function tournamentStatus(): string {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const from = parseDateValue(tournament.date_from);
        const to = parseDateValue(tournament.date_to) ?? from;

        if (!from && !to) {
            return t('Date pending');
        }

        if (from && today < from) {
            return t('Upcoming');
        }

        if (to && today > to) {
            return t('Completed');
        }

        return t('Ongoing');
    }

    const overviewCards = [
        {
            label: t('Events'),
            value: tournament.events_count,
            icon: Trophy,
            className:
                'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
        },
        {
            label: t('Participants'),
            value: tournament.participants_count,
            icon: Users,
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
        },
        {
            label: t('Teams'),
            value: tournament.teams_count,
            icon: Dumbbell,
            className:
                'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200',
        },
        {
            label: t('Medals'),
            value: tournament.medals_count,
            icon: Medal,
            className:
                'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
        },
    ];
    const hasEventFilters = !!(
        eventFilters.q ||
        eventFilters.sport_id ||
        eventFilters.gender_class ||
        eventFilters.participation_status
    );
    const eventGroups = Array.from(
        (events ?? [])
            .reduce((groups, event) => {
                const sportKey = event.sport
                    ? String(event.sport.id)
                    : 'unknown';

                if (!groups.has(sportKey)) {
                    groups.set(sportKey, {
                        sportKey,
                        sportName: event.sport?.name ?? t('Unknown sport'),
                        events: [],
                    });
                }

                groups.get(sportKey)?.events.push(event);

                return groups;
            }, new Map<string, { sportKey: string; sportName: string; events: EventRow[] }>())
            .values(),
    );
    let eventSerialNumber = 0;

    return (
        <>
            <Head title={tournament.name} />

            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-slate-200 dark:bg-slate-700" />
                    <div className="relative grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {tournament.tier ? (
                                        <Badge variant="secondary">
                                            {tournament.tier.label}
                                        </Badge>
                                    ) : null}
                                    {tournament.session ? (
                                        <Badge variant="outline">
                                            {tournament.session.name}
                                        </Badge>
                                    ) : null}
                                    <Badge variant="outline">
                                        {tournamentStatus()}
                                    </Badge>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {tournament.name}
                                </h1>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarDays className="h-4 w-4" />
                                        {dateRange()}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        {tournament.venue ?? '—'}
                                    </span>
                                    {tournament.sport ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Dumbbell className="h-4 w-4" />
                                            {tournament.sport.name}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={editTournament.url(tournament.id)}
                                    >
                                        {t('Edit')}
                                    </Link>
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                        setDeleteTournamentOpen(true)
                                    }
                                >
                                    {t('Delete')}
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {overviewCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <div
                                        key={card.label}
                                        className={`rounded-lg border p-3 ${card.className}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-medium tracking-wide uppercase opacity-90">
                                                {card.label}
                                            </p>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <p className="mt-2 text-xl font-semibold tabular-nums">
                                            {card.value}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <Tabs value={activeTab}>
                    <TabsList>
                        <TabsTrigger value="overview" asChild>
                            <Link
                                href={showTournament.url(tournament.id)}
                                prefetch
                            >
                                {t('Overview')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="events" asChild>
                            <Link
                                href={tournamentEvents.url(tournament.id)}
                                prefetch
                            >
                                {t('Events')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="space-y-4">
                            <div className="rounded-xl border bg-card p-6">
                                <Heading
                                    variant="small"
                                    title={t('Tournament details')}
                                />
                                <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                    {detail(t('Status'), tournamentStatus())}
                                    {detail(t('Dates'), dateRange())}
                                    {detail(t('Tier'), tournament.tier?.label)}
                                    {detail(
                                        t('Session'),
                                        tournament.session?.name,
                                    )}
                                    {detail(t('Sport'), tournament.sport?.name)}
                                    {detail(
                                        t('Venue'),
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                            {tournament.venue ?? '—'}
                                        </span>,
                                    )}
                                    {detail(
                                        t('Date from'),
                                        formatDate(tournament.date_from),
                                    )}
                                    {detail(
                                        t('Date to'),
                                        formatDate(tournament.date_to),
                                    )}
                                    {detail(
                                        t('Created'),
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                            {formatDate(tournament.created_at)}
                                        </span>,
                                    )}
                                    {detail(
                                        t('Raw date text'),
                                        tournament.raw_date_text,
                                    )}
                                </dl>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Events */}
                    <TabsContent value="events" className="space-y-4">
                        {activeTab === 'events' ? (
                            <>
                                <section className="overflow-hidden rounded-xl border bg-card">
                                    <div className="border-b bg-muted/30 px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h2 className="text-base font-semibold">
                                                    {t('Tournament events')}
                                                </h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {t(
                                                        'Manage event structure, classifications, and participation coverage.',
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setAddEventOpen(true)
                                                }
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                {t('Add event')}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 border-b p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                        <form
                                            onSubmit={submitEventSearch}
                                            className="relative min-w-60 flex-1"
                                        >
                                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                name="q"
                                                defaultValue={
                                                    eventFilters.q ?? ''
                                                }
                                                placeholder={t(
                                                    'Search events…',
                                                )}
                                                className="pl-8"
                                            />
                                        </form>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Select
                                                value={
                                                    eventFilters.sport_id ??
                                                    'all'
                                                }
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        sport_id:
                                                            value === 'all'
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-44">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'All sports',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All sports')}
                                                    </SelectItem>
                                                    {sports.map((sport) => (
                                                        <SelectItem
                                                            key={sport.id}
                                                            value={String(
                                                                sport.id,
                                                            )}
                                                        >
                                                            {sport.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={
                                                    eventFilters.gender_class ??
                                                    'all'
                                                }
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        gender_class:
                                                            value === 'all'
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-40">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'All classes',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All classes')}
                                                    </SelectItem>
                                                    {GENDER_CLASSES.map(
                                                        (genderClass) => (
                                                            <SelectItem
                                                                key={
                                                                    genderClass
                                                                }
                                                                value={
                                                                    genderClass
                                                                }
                                                            >
                                                                {genderClassLabel(
                                                                    genderClass,
                                                                    t,
                                                                )}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={
                                                    eventFilters.participation_status ??
                                                    'all'
                                                }
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        participation_status:
                                                            value === 'all'
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-48">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Participation',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All events')}
                                                    </SelectItem>
                                                    <SelectItem value="with">
                                                        {t('With participants')}
                                                    </SelectItem>
                                                    <SelectItem value="without">
                                                        {t(
                                                            'Without participants',
                                                        )}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {hasEventFilters ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearEventFilters}
                                                >
                                                    <X className="mr-1.5 h-4 w-4" />
                                                    {t('Clear filters')}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-muted-foreground">
                                        {(events ?? []).length}{' '}
                                        {t('events shown')}
                                        {hasEventFilters
                                            ? ` · ${t('filtered')}`
                                            : ''}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">
                                                        {t('S.No.')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Event details')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Classification')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('Participations')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('Teams')}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t('Medals')}
                                                    </TableHead>
                                                    <TableHead className="sticky right-0 z-20 w-0 bg-card text-right">
                                                        {t('Actions')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(events ?? []).length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={7}
                                                            className="py-12 text-center text-muted-foreground"
                                                        >
                                                            {hasEventFilters
                                                                ? t(
                                                                      'No events match your filters.',
                                                                  )
                                                                : t(
                                                                      'No events yet.',
                                                                  )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <>
                                                        {eventGroups.map(
                                                            (group) => (
                                                                <Fragment
                                                                    key={
                                                                        group.sportKey
                                                                    }
                                                                >
                                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                                        <TableCell
                                                                            colSpan={
                                                                                7
                                                                            }
                                                                            className="py-2.5 font-medium"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <span>
                                                                                    {
                                                                                        group.sportName
                                                                                    }
                                                                                </span>
                                                                                <span className="text-xs font-normal text-muted-foreground">
                                                                                    {
                                                                                        group
                                                                                            .events
                                                                                            .length
                                                                                    }{' '}
                                                                                    {t(
                                                                                        'events',
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    {group.events.map(
                                                                        (
                                                                            ev,
                                                                        ) => {
                                                                            eventSerialNumber += 1;

                                                                            return (
                                                                                <TableRow
                                                                                    key={
                                                                                        ev.id
                                                                                    }
                                                                                >
                                                                                    <TableCell className="w-16 text-xs text-muted-foreground tabular-nums">
                                                                                        {
                                                                                            eventSerialNumber
                                                                                        }
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <div className="space-y-1">
                                                                                            <Link
                                                                                                href={showEvent.url(
                                                                                                    {
                                                                                                        tournament:
                                                                                                            tournament.id,
                                                                                                        event: ev.id,
                                                                                                    },
                                                                                                )}
                                                                                                className="font-medium hover:underline"
                                                                                            >
                                                                                                {
                                                                                                    ev.name
                                                                                                }
                                                                                            </Link>
                                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                                {ev.discipline ? (
                                                                                                    <span
                                                                                                        className={eventBadgeClass(
                                                                                                            'detail',
                                                                                                        )}
                                                                                                    >
                                                                                                        {
                                                                                                            ev.discipline
                                                                                                        }
                                                                                                    </span>
                                                                                                ) : null}
                                                                                                {ev.weight_category ? (
                                                                                                    <span
                                                                                                        className={eventBadgeClass(
                                                                                                            'detail',
                                                                                                        )}
                                                                                                    >
                                                                                                        {
                                                                                                            ev.weight_category
                                                                                                        }
                                                                                                    </span>
                                                                                                ) : null}
                                                                                                {!ev.discipline &&
                                                                                                !ev.weight_category ? (
                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                        —
                                                                                                    </span>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <span
                                                                                            className={eventBadgeClass(
                                                                                                'class',
                                                                                            )}
                                                                                        >
                                                                                            {t(
                                                                                                genderClassLabel(
                                                                                                    ev.gender_class,
                                                                                                    t,
                                                                                                ),
                                                                                            )}
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <span
                                                                                            className={eventBadgeClass(
                                                                                                'count',
                                                                                            )}
                                                                                        >
                                                                                            <Users className="h-3.5 w-3.5" />
                                                                                            {
                                                                                                ev.participations_count
                                                                                            }
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right tabular-nums">
                                                                                        {
                                                                                            ev.teams_count
                                                                                        }
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right tabular-nums">
                                                                                        <span className="inline-flex items-center justify-end gap-1">
                                                                                            <Medal className="h-3.5 w-3.5 text-amber-500" />
                                                                                            {
                                                                                                ev.medals_count
                                                                                            }
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="sticky right-0 z-10 w-0 bg-card">
                                                                                        <div className="flex items-center justify-end gap-1">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                title={t(
                                                                                                    'View',
                                                                                                )}
                                                                                                asChild
                                                                                            >
                                                                                                <Link
                                                                                                    href={showEvent.url(
                                                                                                        {
                                                                                                            tournament:
                                                                                                                tournament.id,
                                                                                                            event: ev.id,
                                                                                                        },
                                                                                                    )}
                                                                                                >
                                                                                                    <Eye className="h-4 w-4 text-sky-600" />
                                                                                                    <span className="sr-only">
                                                                                                        {t(
                                                                                                            'View',
                                                                                                        )}
                                                                                                    </span>
                                                                                                </Link>
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                title={t(
                                                                                                    ev.can_update_structure
                                                                                                        ? 'Edit event'
                                                                                                        : 'Event cannot be edited after participants are added',
                                                                                                )}
                                                                                                disabled={
                                                                                                    !ev.can_update_structure
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    setEditingEvent(
                                                                                                        ev,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <Pencil className="h-4 w-4 text-amber-600" />
                                                                                                <span className="sr-only">
                                                                                                    {t(
                                                                                                        'Edit event',
                                                                                                    )}
                                                                                                </span>
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                                                title={t(
                                                                                                    'Delete event',
                                                                                                )}
                                                                                                onClick={() =>
                                                                                                    setDeletingEvent(
                                                                                                        ev,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <Trash2 className="h-4 w-4" />
                                                                                                <span className="sr-only">
                                                                                                    {t(
                                                                                                        'Delete event',
                                                                                                    )}
                                                                                                </span>
                                                                                            </Button>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        },
                                                                    )}
                                                                </Fragment>
                                                            ),
                                                        )}
                                                    </>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </section>
                            </>
                        ) : null}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialogs */}
            <AddEventDialog
                open={addEventOpen}
                onOpenChange={setAddEventOpen}
                tournament={tournament}
                sports={sports}
                eventVariants={eventVariants}
                events={events}
            />
            <EditEventDialog
                key={editingEvent?.id ?? 'new'}
                event={editingEvent}
                tournament={tournament}
                sports={sports}
                eventVariants={eventVariants}
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
                description={t(
                    'This will permanently delete the event and all its participations. This action cannot be undone.',
                )}
                confirmLabel={t('Delete event')}
                onConfirm={handleDeleteEvent}
                processing={deletingEventProcessing}
            />
            <ConfirmDeleteDialog
                open={deleteTournamentOpen}
                onOpenChange={setDeleteTournamentOpen}
                title={t('Delete tournament')}
                description={t(
                    'This will permanently delete the tournament and all its events and participations. This action cannot be undone.',
                )}
                confirmLabel={t('Delete tournament')}
                onConfirm={handleDeleteTournament}
                processing={deletingTournamentProcessing}
            />
        </>
    );
}
