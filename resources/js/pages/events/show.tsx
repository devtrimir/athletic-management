import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    Check,
    Images,
    Info,
    List,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
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
import {
    index as tournamentsIndex,
} from '@/actions/App/Http/Controllers/TournamentController';
import { events as tournamentEvents } from '@/actions/App/Http/Controllers/TournamentProfileTabController';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { ParticipationMediaSheet } from '@/components/members/participation-media-sheet';
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
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TournamentRef = { id: number; name: string };
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

type EventProp = {
    id: number;
    sport_id: number | null;
    sport_event_variant_id: number | null;
    event_type: 'individual' | 'team';
    participants_required: number | null;
    can_update_structure: boolean;
    name: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    event_source: string;
    provisional_reason: string | null;
    sport: { id: number; name: string } | null;
};

type PlayerSportProfile = {
    sport_event: string | null;
    role: string | null;
    position: string | null;
};

type ParticipationRow = {
    id: number;
    position: number | null;
    media_files_count: number;
    team: { id: number; name: string } | null;
    member: {
        id: number;
        full_name: string;
        pno: string | null;
        photo_path: string | null;
        sport_profile: PlayerSportProfile | null;
    } | null;
    lineup_members: {
        id: number;
        full_name: string;
        pno: string | null;
        photo_path: string | null;
        sport_profile: PlayerSportProfile | null;
    }[];
    achievement: {
        medal_type: string | null;
        position: number | null;
        remarks: string | null;
    } | null;
};

type ParticipantCandidate = {
    team_member_id: number;
    team_id: number;
    role: string;
    id: number;
    full_name: string;
    pno: string | null;
    gender: string;
    player_category: string;
    player_level: string;
    current_status: string;
    sport_event: string | null;
};

type ParticipantCandidateTeam = {
    id: number;
    name: string;
    members: ParticipantCandidate[];
};

type FilterOption = {
    value: string;
    label: string;
};

type ParticipantFilterOptions = {
    levels: FilterOption[];
};

type EventForm = {
    event_mode: 'official' | 'provisional';
    sport_event_variant_id: string;
    sport_id: string;
    name: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
    event_type: 'individual' | 'team';
    participants_required: string;
    provisional_reason: string;
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
const PLAYER_CATEGORY_OPTIONS: FilterOption[] = [
    { value: 'GD', label: 'GD' },
    { value: 'SPORTS_QUOTA', label: 'Sports Quota' },
];

const MEDAL_CLASSES: Record<string, string> = {
    GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SILVER: 'bg-gray-100 text-gray-700 border-gray-200',
    BRONZE: 'bg-orange-100 text-orange-700 border-orange-200',
    MERIT: 'bg-blue-100 text-blue-700 border-blue-200',
};

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
        variant.gender_label ?? t(variant.gender_class),
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

function countBy<T>(
    items: T[],
    keyFor: (item: T) => string,
): Record<string, number> {
    return items.reduce<Record<string, number>>((counts, item) => {
        const key = keyFor(item);
        counts[key] = (counts[key] ?? 0) + 1;

        return counts;
    }, {});
}

function genderLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (value) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        case 'MIXED':
            return t('Mixed');
        case 'OPEN':
            return t('Open');
        default:
            return value ? t(value) : '';
    }
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
}: {
    data: EventForm;
    setData: (field: keyof EventForm, value: string) => void;
    errors: Partial<Record<keyof EventForm, string>>;
    sports: Sport[];
    eventVariants: EventVariant[];
    idPrefix: string;
}) {
    const { t } = useTranslation();
    const selectedVariant = eventVariants.find(
        (variant) => String(variant.id) === data.sport_event_variant_id,
    );
    const filteredVariants = eventVariants.filter(
        (variant) =>
            !data.sport_id || String(variant.sport_id) === data.sport_id,
    );

    function selectSport(value: string) {
        setData('sport_id', value);

        if (
            data.sport_event_variant_id &&
            !eventVariants.some(
                (variant) =>
                    String(variant.id) === data.sport_event_variant_id &&
                    String(variant.sport_id) === value,
            )
        ) {
            setData('sport_event_variant_id', '');
        }
    }

    function selectVariant(value: string) {
        const variant = eventVariants.find((item) => String(item.id) === value);

        setData('sport_event_variant_id', value);

        if (variant) {
            setData('sport_id', String(variant.sport_id));
            setData('name', variant.name);
            setData('discipline', variant.discipline ?? '');
            setData('weight_category', variant.weight_category ?? '');
            setData('gender_class', variant.gender_class);
            setData(
                'event_type',
                variant.is_team_based ? 'team' : 'individual',
            );
            setData(
                'participants_required',
                variant.min_participants
                    ? String(variant.min_participants)
                    : '',
            );
        }
    }

    function useOfficialMode() {
        setData('event_mode', 'official');
    }

    function useProvisionalMode() {
        setData('event_mode', 'provisional');

        if (!data.provisional_reason) {
            setData(
                'provisional_reason',
                t('Reference event not available in master data'),
            );
        }

        if (selectedVariant) {
            setData('sport_id', String(selectedVariant.sport_id));
            setData('name', selectedVariant.name);
            setData('discipline', selectedVariant.discipline ?? '');
            setData('weight_category', selectedVariant.weight_category ?? '');
            setData('gender_class', selectedVariant.gender_class);
        }
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

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_event_type`}>
                    {t('Event type')}{' '}
                    <span className="text-destructive">*</span>
                </Label>
                <Select
                    value={data.event_type}
                    onValueChange={(value) =>
                        setData(
                            'event_type',
                            value === 'team' ? 'team' : 'individual',
                        )
                    }
                >
                    <SelectTrigger id={`${idPrefix}_event_type`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="individual">
                            {t('Individual')}
                        </SelectItem>
                        <SelectItem value="team">{t('Team')}</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.event_type} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_participants_required`}>
                    {t('Participants per entry')}
                </Label>
                <Input
                    id={`${idPrefix}_participants_required`}
                    type="number"
                    min={1}
                    value={data.participants_required}
                    onChange={(e) =>
                        setData('participants_required', e.target.value)
                    }
                    placeholder={t('Auto from variant (optional)')}
                />
                <InputError message={errors.participants_required} />
                <p className="text-xs text-muted-foreground">
                    {t(
                        'For team events this is players per team. For individual events this is total participant limit.',
                    )}
                </p>
            </div>

            {data.event_mode === 'official' ? (
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`${idPrefix}_sport_event_variant_id`}>
                        {t('Official event')}{' '}
                        <span className="text-destructive">*</span>
                    </Label>
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
                    <InputError message={errors.sport_event_variant_id} />
                </div>
            ) : null}

            {selectedVariant && data.event_mode === 'official' ? (
                <div className="rounded-lg border bg-muted/20 p-3 sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        {t('Official event details')}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <span>
                            {t('Gender')}:{' '}
                            {selectedVariant.gender_label ??
                                t(selectedVariant.gender_class)}
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
                            onValueChange={(v) => setData('gender_class', v)}
                        >
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
                            {t('Event name')}{' '}
                            <span className="text-destructive">*</span>
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
                        <Label htmlFor={`${idPrefix}_discipline`}>
                            {t('Discipline')}
                        </Label>
                        <Input
                            id={`${idPrefix}_discipline`}
                            value={data.discipline}
                            onChange={(e) =>
                                setData('discipline', e.target.value)
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
                                setData('weight_category', e.target.value)
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
                                setData('provisional_reason', e.target.value)
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
// Edit Event Dialog
// ---------------------------------------------------------------------------

function EditEventDialog({
    open,
    onOpenChange,
    tournament,
    event,
    sports,
    eventVariants,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: TournamentRef;
    event: EventProp;
    sports: Sport[];
    eventVariants: EventVariant[];
}) {
    const { t } = useTranslation();
    const { data, setData, patch, errors, processing, reset } =
        useForm<EventForm>({
            event_mode:
                event.event_source === 'official' ? 'official' : 'provisional',
            sport_event_variant_id: event.sport_event_variant_id
                ? String(event.sport_event_variant_id)
                : '',
            sport_id: event.sport_id ? String(event.sport_id) : '',
            name: event.name,
            discipline: event.discipline ?? '',
            weight_category: event.weight_category ?? '',
            gender_class: event.gender_class,
            event_type: event.event_type,
            participants_required: event.participants_required
                ? String(event.participants_required)
                : '',
            provisional_reason:
                event.provisional_reason ??
                'Reference event not available in master data',
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
            <DialogContent className="sm:max-w-3xl">
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
                        eventVariants={eventVariants}
                        idPrefix="ev"
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
// Participant form fields (shared between Add and Edit dialogs)
// ---------------------------------------------------------------------------

function ParticipantFormFields({
    data,
    setData,
    errors,
    idPrefix,
    selectedMedal,
}: {
    data: ParticipantForm;
    setData: (field: keyof ParticipantForm, value: string) => void;
    errors: Partial<Record<keyof ParticipantForm, string>>;
    idPrefix: string;
    selectedMedal?: string;
}) {
    const { t } = useTranslation();
    const isRankedMedal = ['GOLD', 'SILVER', 'BRONZE'].includes(
        selectedMedal ?? '',
    );
    const isMerit = selectedMedal === 'MERIT';

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_position`}>{t('Position')}</Label>
                <Input
                    id={`${idPrefix}_position`}
                    type="number"
                    min={1}
                    max={isMerit ? 3 : undefined}
                    step={isMerit ? 1 : undefined}
                    value={data.position}
                    onChange={(e) => setData('position', e.target.value)}
                    placeholder="—"
                    className="h-9"
                    disabled={isRankedMedal}
                />
                <InputError message={errors.position} />
                {isMerit ? (
                    <p className="text-xs text-muted-foreground">
                        {t('Allowed values: 1, 2, or 3.')}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_medal_type`}>{t('Medal')}</Label>
                <Select
                    value={data.medal_type || 'none'}
                    onValueChange={(v) =>
                        setData('medal_type', v === 'none' ? '' : v)
                    }
                >
                    <SelectTrigger
                        id={`${idPrefix}_medal_type`}
                        className="h-9"
                    >
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

function TeamMedalOnlyFields({
    data,
    setData,
    errors,
    idPrefix,
}: {
    data: { medal_type: string; position: string; remarks: string };
    setData: (
        field: 'medal_type' | 'position' | 'remarks',
        value: string,
    ) => void;
    errors: Partial<Record<'medal_type' | 'position' | 'remarks', string>>;
    idPrefix: string;
}) {
    const { t } = useTranslation();
    const selectedMedal = data.medal_type;
    const isRankedMedal = ['GOLD', 'SILVER', 'BRONZE'].includes(selectedMedal);
    const hasMerit = selectedMedal === 'MERIT';
    const rankedMedalPosition =
        selectedMedal === 'GOLD'
            ? '1'
            : selectedMedal === 'SILVER'
              ? '2'
              : selectedMedal === 'BRONZE'
                ? '3'
                : '';
    const displayPosition = isRankedMedal
        ? data.position || rankedMedalPosition
        : data.position;

    return (
        <div className="grid gap-2">
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_position`}>{t('Position')}</Label>
                <Input
                    id={`${idPrefix}_position`}
                    type="number"
                    min={1}
                    max={hasMerit ? 3 : undefined}
                    step={hasMerit ? 1 : undefined}
                    value={displayPosition}
                    onChange={(e) => setData('position', e.target.value)}
                    placeholder="—"
                    className="h-9"
                    disabled={isRankedMedal}
                />
                <InputError message={errors.position} />
                {isRankedMedal ? (
                    <p className="text-xs text-muted-foreground">
                        {t('Position is auto-filled from medal.')}
                    </p>
                ) : hasMerit ? (
                    <p className="text-xs text-muted-foreground">
                        {t('Allowed values: 1, 2, or 3.')}
                    </p>
                ) : null}
            </div>

            <Label htmlFor={`${idPrefix}_medal_type`}>{t('Medal')}</Label>
            <Select
                value={data.medal_type || 'none'}
                onValueChange={(v) => {
                    const medal = v === 'none' ? '' : v;
                    setData('medal_type', medal);

                    if (medal === 'GOLD') {
                        setData('position', '1');
                    } else if (medal === 'SILVER') {
                        setData('position', '2');
                    } else if (medal === 'BRONZE') {
                        setData('position', '3');
                    } else if (medal !== 'MERIT') {
                        setData('position', '');
                    }
                }}
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

            {hasMerit ? (
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}_remarks`}>
                        {t('Remarks')}
                    </Label>
                    <Input
                        id={`${idPrefix}_remarks`}
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                        maxLength={500}
                        placeholder="—"
                    />
                    <InputError message={errors.remarks} />
                </div>
            ) : null}
        </div>
    );
}

function FilterDropdown({
    label,
    value,
    options,
    counts,
    onChange,
}: {
    label: string;
    value: string;
    options: FilterOption[];
    counts?: Record<string, number>;
    onChange: (value: string) => void;
}) {
    const { t } = useTranslation();
    const selected = options.find((option) => option.value === value);

    return (
        <Select
            value={value || '__all__'}
            onValueChange={(next) => onChange(next === '__all__' ? '' : next)}
        >
            <SelectTrigger
                className={cn(
                    'h-10 min-w-40 gap-2 rounded-md border px-3 text-sm',
                    value
                        ? 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100'
                        : 'bg-background text-muted-foreground',
                )}
            >
                <SelectValue placeholder={label}>
                    {selected ? selected.label : label}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__all__">
                    <div className="flex min-w-40 items-center justify-between gap-3">
                        <span>
                            {t('All')} {label}
                        </span>
                    </div>
                </SelectItem>
                {options.map((option) => {
                    const count = counts?.[option.value] ?? 0;

                    return (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex min-w-40 items-center justify-between gap-3">
                                <span>{option.label}</span>
                                {count > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {count}
                                    </span>
                                )}
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
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
    participantCandidates,
    participantFilterOptions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournament: TournamentRef;
    event: EventProp;
    participantCandidates?: ParticipantCandidateTeam[];
    participantFilterOptions: ParticipantFilterOptions;
}) {
    const { t } = useTranslation();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [query, setQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const { errors, reset } = useForm<Record<string, never>>({});
    const [submitting, setSubmitting] = useState(false);
    const isTeamEvent = event.event_type === 'team';
    const isProvisionalEvent = event.event_source === 'provisional';
    const eventDetailLine = isProvisionalEvent
        ? ''
        : [
              event.discipline,
              event.weight_category,
              genderLabel(event.gender_class, t),
          ]
              .filter(Boolean)
              .join(' · ');

    const candidates = participantCandidates ?? [];
    const candidatesLoading = participantCandidates === undefined;
    const candidateTeams = candidates.filter((team) => team.members.length > 0);
    const hasSingleTeam = candidateTeams.length === 1;
    const defaultTeam = candidateTeams[0] ?? null;
    const effectiveSelectedTeamId =
        selectedTeamId ??
        (isTeamEvent && hasSingleTeam ? (defaultTeam?.id ?? null) : null);
    const selectedTeam =
        effectiveSelectedTeamId === null
            ? null
            : (candidateTeams.find(
                  (team) => team.id === effectiveSelectedTeamId,
              ) ?? null);
    const selectedIdSet = new Set(selectedIds);
    const normalizedQuery = query.trim().toLowerCase();
    const totalCandidates = candidates.reduce(
        (total, team) => total + team.members.length,
        0,
    );
    const filterMembers = (
        members: ParticipantCandidate[],
    ): ParticipantCandidate[] =>
        members.filter((member) => {
            const matchesCategory =
                !filterCategory || member.player_category === filterCategory;
            const matchesLevel =
                !filterLevel || member.player_level === filterLevel;
            const searchable = [
                member.full_name,
                member.pno,
                member.role,
                member.player_category,
                member.player_level,
                member.sport_event,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return (
                matchesCategory &&
                matchesLevel &&
                (!normalizedQuery || searchable.includes(normalizedQuery))
            );
        });
    const visibleCandidateTeams = isTeamEvent
        ? selectedTeam
            ? [
                  {
                      ...selectedTeam,
                      members: filterMembers(selectedTeam.members),
                  },
              ]
            : candidateTeams.map((team) => ({
                  ...team,
                  members: filterMembers(team.members),
              }))
        : candidateTeams
              .map((team) => ({
                  ...team,
                  members: filterMembers(team.members),
              }))
              .filter((team) => team.members.length > 0);
    const visibleCandidates = visibleCandidateTeams.flatMap(
        (team) => team.members,
    );
    const selectedCandidates = visibleCandidateTeams
        .flatMap((team) => team.members)
        .filter((member) => selectedIdSet.has(member.id));
    const hasActiveFilters = Boolean(
        filterCategory || filterLevel || normalizedQuery,
    );
    const allVisibleSelected =
        visibleCandidates.length > 0 &&
        visibleCandidates.every((member) => selectedIdSet.has(member.id));
    const levelLabelByCode = new Map(
        participantFilterOptions.levels.map((option) => [
            option.value,
            option.label,
        ]),
    );
    const categoryCounts = countBy(
        candidates.flatMap((team) => team.members),
        (member) => member.player_category,
    );
    const levelCounts = countBy(
        candidates.flatMap((team) => team.members),
        (member) => member.player_level,
    );

    function handleClose() {
        reset();
        setSelectedIds([]);
        setSelectedTeamId(null);
        setQuery('');
        setFilterCategory('');
        setFilterLevel('');
        onOpenChange(false);
    }

    function setTeam(teamId: string) {
        setSelectedTeamId(teamId ? Number(teamId) : null);
        setSelectedIds([]);
    }

    const teamModeValidationMessage =
        isTeamEvent && event.participants_required
            ? t('Team players are optional; choose as many as needed.')
            : t('Select players from one team for this team entry.');

    const submitDisabled =
        submitting ||
        selectedCandidates.length === 0 ||
        (isTeamEvent && !effectiveSelectedTeamId);

    function toggleCandidate(memberId: number) {
        setSelectedIds((current) =>
            current.includes(memberId)
                ? current.filter((id) => id !== memberId)
                : [...current, memberId],
        );
    }

    function selectVisibleCandidates() {
        setSelectedIds((current) =>
            Array.from(
                new Set([
                    ...current,
                    ...visibleCandidates.map((member) => member.id),
                ]),
            ),
        );
    }

    function clearVisibleCandidates() {
        const visibleIds = new Set(
            visibleCandidates.map((member) => member.id),
        );

        setSelectedIds((current) =>
            current.filter((id) => !visibleIds.has(id)),
        );
    }

    function removeSelectedCandidate(memberId: number) {
        setSelectedIds((current) => current.filter((id) => id !== memberId));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (
            selectedCandidates.length === 0 ||
            (isTeamEvent && !effectiveSelectedTeamId)
        ) {
            return;
        }

        setSubmitting(true);
        router.post(
            storeParticipants.url({
                tournament: tournament.id,
                event: event.id,
            }),
            {
                participants: isTeamEvent
                    ? [
                          {
                              team_id: effectiveSelectedTeamId,
                              player_ids: selectedIds,
                          },
                      ]
                    : selectedCandidates.map((member) => ({
                          member_id: member.id,
                          team_id: member.team_id,
                      })),
            },
            {
                onSuccess: () => handleClose(),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    handleClose();
                }
            }}
        >
            <DialogContent className="flex h-[92vh] max-h-[92vh] max-w-3xl flex-col overflow-hidden sm:max-w-3xl">
                <DialogHeader className="border-b px-5 py-4 pr-12">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                            <DialogTitle>{t('Add participants')}</DialogTitle>
                            <DialogDescription>
                                <span className="font-medium">
                                    {event.name}
                                </span>
                                {!isProvisionalEvent && eventDetailLine ? (
                                    <span className="ml-1 block text-xs text-muted-foreground">
                                        ({eventDetailLine})
                                    </span>
                                ) : null}
                            </DialogDescription>
                        </div>
                        <div className="mr-1 flex shrink-0 flex-wrap justify-end gap-1.5">
                            {event.sport && (
                                <Badge variant="secondary">
                                    {event.sport.name}
                                </Badge>
                            )}
                            <Badge variant="outline">
                                {genderLabel(event.gender_class, t)}
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                <form
                    id="add-participant-form"
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="space-y-3 border-b bg-muted/20 px-5 py-4">
                        {isTeamEvent && candidateTeams.length > 1 ? (
                            <div className="grid gap-2">
                                <Label htmlFor="event-team-select">
                                    {t('Select team')}
                                </Label>
                                <Select
                                    value={
                                        selectedTeamId
                                            ? String(selectedTeamId)
                                            : ''
                                    }
                                    onValueChange={setTeam}
                                >
                                    <SelectTrigger
                                        id="event-team-select"
                                        className="h-9"
                                    >
                                        <SelectValue
                                            placeholder={t('Choose a team')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {candidateTeams.map((team) => (
                                            <SelectItem
                                                key={team.id}
                                                value={String(team.id)}
                                            >
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {teamModeValidationMessage}
                                </p>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <Label>{t('Eligible roster')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {visibleCandidates.length} {t('shown')} ·{' '}
                                    {totalCandidates}{' '}
                                    {t(
                                        totalCandidates === 1
                                            ? 'eligible athlete'
                                            : 'eligible athletes',
                                    )}
                                </p>
                            </div>
                            <div className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
                                <span className="font-semibold">
                                    {selectedCandidates.length}
                                </span>{' '}
                                <span className="text-muted-foreground">
                                    {t('selected')}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_auto_auto]">
                            <div className="relative">
                                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    className="pl-8"
                                    placeholder={t(
                                        'Search name, P.No, role, category…',
                                    )}
                                />
                            </div>
                            <div>
                                <FilterDropdown
                                    label={t('Category')}
                                    value={filterCategory}
                                    options={PLAYER_CATEGORY_OPTIONS.map(
                                        (option) => ({
                                            ...option,
                                            label: t(option.label),
                                        }),
                                    )}
                                    counts={categoryCounts}
                                    onChange={setFilterCategory}
                                />
                            </div>
                            <div>
                                <FilterDropdown
                                    label={t('Tier / level')}
                                    value={filterLevel}
                                    options={participantFilterOptions.levels}
                                    counts={levelCounts}
                                    onChange={setFilterLevel}
                                />
                            </div>
                        </div>
                        <InputError
                            message={
                                (errors.participants as string | undefined) ||
                                (errors as Record<string, string>)[
                                    'participants.0.member_id'
                                ] ||
                                (errors as Record<string, string>)[
                                    'participants.0.team_id'
                                ] ||
                                (errors as Record<string, string>)[
                                    'participants.0.player_ids'
                                ]
                            }
                        />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="max-h-[calc(92vh-22rem)] min-h-0 overflow-y-auto">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5">
                                <div className="text-xs text-muted-foreground">
                                    {isTeamEvent
                                        ? t('Team roster')
                                        : hasActiveFilters
                                          ? t('Filtered roster')
                                          : t('All matching active teams')}
                                </div>
                                {visibleCandidates.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={
                                                allVisibleSelected
                                                    ? clearVisibleCandidates
                                                    : selectVisibleCandidates
                                            }
                                        >
                                            <Check className="mr-1.5 h-4 w-4" />
                                            {allVisibleSelected
                                                ? t('Clear shown')
                                                : t('Select shown')}
                                        </Button>
                                        {hasActiveFilters && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setQuery('');
                                                    setFilterCategory('');
                                                    setFilterLevel('');
                                                }}
                                            >
                                                {t('Reset filters')}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedCandidates.length > 0 && (
                                <div className="border-b bg-background px-5 py-3">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCandidates
                                            .slice(0, 6)
                                            .map((member) => (
                                                <span
                                                    key={member.id}
                                                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
                                                >
                                                    <span className="truncate font-medium">
                                                        {member.full_name}
                                                    </span>
                                                    {member.pno && (
                                                        <span className="font-mono text-muted-foreground">
                                                            {member.pno}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground hover:text-foreground"
                                                        onClick={() =>
                                                            removeSelectedCandidate(
                                                                member.id,
                                                            )
                                                        }
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                        <span className="sr-only">
                                                            {t('Remove')}
                                                        </span>
                                                    </button>
                                                </span>
                                            ))}
                                        {selectedCandidates.length > 6 && (
                                            <span className="inline-flex items-center rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                                                +{selectedCandidates.length - 6}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                {candidatesLoading && (
                                    <div className="space-y-2 p-5">
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-2/3" />
                                    </div>
                                )}

                                {!candidatesLoading &&
                                    candidates.length === 0 && (
                                        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                            <Users className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">
                                                {t(
                                                    'No active teams found for this event.',
                                                )}
                                            </p>
                                            <p className="max-w-md text-sm text-muted-foreground">
                                                {event.sport
                                                    ? t(
                                                          'Create or activate a :sport team for this session first.',
                                                      ).replace(
                                                          ':sport',
                                                          event.sport.name,
                                                      )
                                                    : t(
                                                          'Set the event sport before adding participants.',
                                                      )}
                                            </p>
                                        </div>
                                    )}

                                {!candidatesLoading &&
                                    candidates.length > 0 &&
                                    totalCandidates === 0 && (
                                        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                            <Users className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">
                                                {t(
                                                    'No eligible athletes left to add.',
                                                )}
                                            </p>
                                            <p className="max-w-md text-sm text-muted-foreground">
                                                {t(
                                                    'Everyone on the matching active roster is already added or filtered out by the event gender.',
                                                )}
                                            </p>
                                        </div>
                                    )}

                                {!candidatesLoading &&
                                    totalCandidates > 0 &&
                                    visibleCandidateTeams.length === 0 && (
                                        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                            <Search className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">
                                                {t(
                                                    'No roster members match the filters.',
                                                )}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setQuery('');
                                                    setFilterCategory('');
                                                    setFilterLevel('');
                                                }}
                                            >
                                                {t('Reset filters')}
                                            </Button>
                                        </div>
                                    )}

                                {visibleCandidateTeams.map((team) => (
                                    <div
                                        key={team.id}
                                        className="border-b last:border-b-0"
                                    >
                                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-sky-50 px-5 py-2.5 backdrop-blur dark:bg-sky-950/30">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-sky-950 dark:text-sky-100">
                                                    {team.name}
                                                </p>
                                                <p className="text-xs text-sky-700 dark:text-sky-300">
                                                    {team.members.length}{' '}
                                                    {t(
                                                        team.members.length ===
                                                            1
                                                            ? 'athlete'
                                                            : 'athletes',
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 p-3 sm:grid-cols-2">
                                            {team.members.map((member) => {
                                                const selected =
                                                    selectedIdSet.has(
                                                        member.id,
                                                    );

                                                return (
                                                    <label
                                                        key={
                                                            member.team_member_id
                                                        }
                                                        className={cn(
                                                            'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors',
                                                            selected
                                                                ? 'border-sky-300 bg-sky-50/80 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900'
                                                                : 'border-border bg-background hover:border-sky-200 hover:bg-sky-50/40 dark:hover:border-sky-900 dark:hover:bg-sky-950/20',
                                                        )}
                                                    >
                                                        <Checkbox
                                                            className="mt-0.5"
                                                            checked={selected}
                                                            onCheckedChange={() =>
                                                                toggleCandidate(
                                                                    member.id,
                                                                )
                                                            }
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="truncate text-base leading-5 font-semibold">
                                                                    {
                                                                        member.full_name
                                                                    }
                                                                </span>
                                                                {member.pno && (
                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                                        {
                                                                            member.pno
                                                                        }
                                                                    </span>
                                                                )}
                                                                <Badge
                                                                    variant={
                                                                        selected
                                                                            ? 'secondary'
                                                                            : 'outline'
                                                                    }
                                                                    className={cn(
                                                                        'text-[11px]',
                                                                        selected
                                                                            ? 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100'
                                                                            : '',
                                                                    )}
                                                                >
                                                                    {t(
                                                                        member.role,
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                                                                <p className="truncate">
                                                                    {[
                                                                        genderLabel(
                                                                            member.gender,
                                                                            t,
                                                                        ),
                                                                        t(
                                                                            member.player_category,
                                                                        ),
                                                                        levelLabelByCode.get(
                                                                            member.player_level,
                                                                        ) ??
                                                                            t(
                                                                                member.player_level,
                                                                            ),
                                                                        t(
                                                                            member.current_status,
                                                                        ),
                                                                    ]
                                                                        .filter(
                                                                            Boolean,
                                                                        )
                                                                        .join(
                                                                            ' · ',
                                                                        )}
                                                                </p>
                                                                {member.sport_event ? (
                                                                    <p className="truncate">
                                                                        <span className="font-medium text-foreground">
                                                                            {t(
                                                                                'Event / discipline',
                                                                            )}
                                                                            :
                                                                        </span>{' '}
                                                                        {
                                                                            member.sport_event
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="mt-auto flex shrink-0 flex-col gap-2 border-t bg-background px-5 py-4 shadow-[0_-1px_0_0_theme(colors.border)] sm:flex-row sm:justify-end sm:gap-2">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={handleClose}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="add-participant-form"
                        disabled={submitDisabled}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {submitting
                            ? t('Saving…')
                            : isTeamEvent
                              ? t('Add participants')
                              : t('Add :count participants').replace(
                                    ':count',
                                    String(selectedCandidates.length),
                                )}
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
    const isTeamEvent = event.event_type === 'team';
    const { data, setData, patch, errors, processing, reset } =
        useForm<ParticipantForm>({
            position:
                participation?.position != null
                    ? String(participation.position)
                    : '',
            medal_type: participation?.achievement?.medal_type ?? '',
            remarks: participation?.achievement?.remarks ?? '',
        });
    const {
        data: teamMedalData,
        setData: setTeamMedalData,
        patch: patchTeamMedal,
        errors: teamMedalErrors,
        processing: teamMedalProcessing,
        reset: resetTeamMedal,
    } = useForm<{ medal_type: string; position: string; remarks: string }>({
        medal_type: participation?.achievement?.medal_type ?? '',
        position:
            participation?.position != null
                ? String(participation.position)
                : '',
        remarks: participation?.achievement?.remarks ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!participation) {
            return;
        }

        if (isTeamEvent) {
            patchTeamMedal(
                updateParticipant.url({
                    tournament: tournament.id,
                    event: event.id,
                    participation: participation.id,
                }),
                {
                    onSuccess: () => {
                        resetTeamMedal();
                        onClose();
                    },
                },
            );

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
        <Dialog
            open={participation !== null}
            onOpenChange={(o) => {
                if (!o) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {event.event_type === 'team'
                            ? t('Team medal result')
                            : t('Edit participant')}
                    </DialogTitle>
                    <DialogDescription>
                        {event.event_type === 'team'
                            ? t(
                                  'This medal is assigned to the team result (not individual players) and applies to all players in this lineup.',
                              )
                            : participation?.member?.full_name}
                    </DialogDescription>
                </DialogHeader>
                <form id="edit-participant-form" onSubmit={handleSubmit}>
                    {isTeamEvent ? (
                        <TeamMedalOnlyFields
                            data={teamMedalData}
                            setData={(f, v) => setTeamMedalData(f, v)}
                            errors={teamMedalErrors}
                            idPrefix="edit_p"
                        />
                    ) : (
                        <ParticipantFormFields
                            data={data}
                            setData={(f, v) => setData(f, v)}
                            errors={errors}
                            idPrefix="edit_p"
                            selectedMedal={data.medal_type}
                        />
                    )}
                </form>
                <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="edit-participant-form"
                        disabled={
                            isTeamEvent ? teamMedalProcessing : processing
                        }
                    >
                        {isTeamEvent
                            ? teamMedalProcessing
                                ? t('Saving…')
                                : t('Save medal')
                            : processing
                              ? t('Saving…')
                              : t('Save changes')}
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
        return <span className="text-xs text-muted-foreground">—</span>;
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
// Helpers
// ---------------------------------------------------------------------------

function normalizeTeamParticipationPlayers(participation: ParticipationRow): {
    id: number;
    full_name: string;
    pno: string | null;
    photo_path: string | null;
    sport_profile: PlayerSportProfile | null;
}[] {
    if (participation.lineup_members.length > 0) {
        return participation.lineup_members;
    }

    if (!participation.member) {
        return [];
    }

    return [
        {
            id: participation.member.id,
            full_name: participation.member.full_name,
            pno: participation.member.pno,
            photo_path: participation.member.photo_path,
            sport_profile: participation.member.sport_profile,
        },
    ];
}

function playerSportProfileText(
    profile: PlayerSportProfile | null,
    t: (key: string) => string,
): string {
    if (!profile) {
        return '';
    }

    return [
        profile.sport_event
            ? `${t('Event / discipline')}: ${profile.sport_event}`
            : null,
        profile.role ? `${t('Role')}: ${profile.role}` : null,
        profile.position ? `${t('Position')}: ${profile.position}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}

function resolveDisplayPlayerName(
    row: TeamPlayerTableRow,
    eventName: string,
): string {
    const normalize = (value?: string | null): string => (value ?? '').trim();
    const normalizeForCompare = (value?: string | null): string =>
        normalize(value).toLowerCase();
    const isRepeated = (value: string): boolean =>
        !value || normalizeForCompare(value) === normalizeForCompare(eventName);

    const nameFromRow = normalize(row.playerName);
    const nameFromParticipation = normalize(
        row.participation.member?.full_name,
    );

    if (!isRepeated(nameFromRow)) {
        return nameFromRow;
    }

    if (!isRepeated(nameFromParticipation)) {
        return nameFromParticipation;
    }

    return '—';
}

function teamParticipationPlayerCount(participation: ParticipationRow): number {
    return participation.lineup_members.length > 0
        ? participation.lineup_members.length
        : participation.member
          ? 1
          : 0;
}

type TeamPlayerTableRow = {
    rowId: string;
    participation: ParticipationRow;
    resultParticipation: ParticipationRow;
    playerId: number;
    playerName: string;
    playerPno: string | null;
    playerPhotoPath: string | null;
    playerSportProfile: PlayerSportProfile | null;
    teamPlayerCount: number;
    isFirstPlayerInTeam: boolean;
};

function buildTeamDisplayRows(
    participations: ParticipationRow[],
): TeamPlayerTableRow[] {
    const groups = new Map<
        string,
        {
            resultParticipation: ParticipationRow;
            rows: Omit<TeamPlayerTableRow, 'teamPlayerCount' | 'isFirstPlayerInTeam'>[];
        }
    >();

    for (const participation of participations) {
        const players = normalizeTeamParticipationPlayers(participation);
        const groupKey = participation.team?.id
            ? `team:${participation.team.id}`
            : 'event:legacy-team';
        const group =
            groups.get(groupKey) ??
            {
                resultParticipation: participation,
                rows: [],
            };

        players.forEach((player, idx) => {
            group.rows.push({
                rowId: `${participation.id}-${player.id}-${idx}`,
                participation,
                resultParticipation: group.resultParticipation,
                playerId: player.id,
                playerName: player.full_name,
                playerPno: player.pno,
                playerPhotoPath: player.photo_path,
                playerSportProfile: player.sport_profile,
            });
        });

        groups.set(groupKey, group);
    }

    return Array.from(groups.values()).flatMap((group) =>
        group.rows.map((row, idx) => ({
            ...row,
            teamPlayerCount: group.rows.length,
            isFirstPlayerInTeam: idx === 0,
        })),
    );
}

function buildIndividualDisplayRows(
    participations: ParticipationRow[],
): TeamPlayerTableRow[] {
    return participations
        .map((participation) => {
            if (!participation.member) {
                return null;
            }

            return {
                rowId: `${participation.id}-${participation.member.id}`,
                participation,
                resultParticipation: participation,
                playerId: participation.member.id,
                playerName: participation.member.full_name,
                playerPno: participation.member.pno,
                playerPhotoPath: participation.member.photo_path,
                playerSportProfile: participation.member.sport_profile,
                teamPlayerCount: 1,
                isFirstPlayerInTeam: true,
            };
        })
        .filter((row): row is TeamPlayerTableRow => row !== null);
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
    type DeleteTarget = {
        participation: ParticipationRow;
        playerId?: number;
        playerName?: string;
    };

    const [editingParticipation, setEditingParticipation] =
        useState<ParticipationRow | null>(null);
    const [deletingParticipation, setDeletingParticipation] =
        useState<DeleteTarget | null>(null);
    const [mediaParticipation, setMediaParticipation] =
        useState<ParticipationRow | null>(null);
    const { delete: deleteParticipant, processing: deletingProcessing } =
        useForm({});

    function handleDelete() {
        if (!deletingParticipation) {
            return;
        }

        deleteParticipant(
            destroyParticipant.url({
                tournament: tournament.id,
                event: event.id,
                participation: deletingParticipation.participation.id,
            }),
            {
                data: deletingParticipation.playerId
                    ? {
                          member_id: deletingParticipation.playerId,
                      }
                    : undefined,
                onSuccess: () => setDeletingParticipation(null),
            },
        );
    }

    if (participations.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                {t('No participants yet.')}
            </p>
        );
    }

    const displayRows =
        event.event_type === 'team'
            ? buildTeamDisplayRows(participations)
            : buildIndividualDisplayRows(participations);

    return (
        <>
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-slate-300 bg-slate-100 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                            <TableHead className="w-12 border-r border-slate-300 text-center text-xs font-semibold tracking-wide text-slate-700 uppercase dark:border-slate-700 dark:text-slate-200">
                                {t('S.No.')}
                            </TableHead>
                            <TableHead className="min-w-56 border-r border-slate-300 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:border-slate-700 dark:text-slate-200">
                                {t('Member name')}
                            </TableHead>
                            <TableHead className="w-24 border-r border-slate-300 text-center text-xs font-semibold tracking-wide text-slate-700 uppercase dark:border-slate-700 dark:text-slate-200">
                                {t('Position')}
                            </TableHead>
                            <TableHead className="w-32 border-r border-slate-300 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:border-slate-700 dark:text-slate-200">
                                {t('Medal')}
                            </TableHead>
                            <TableHead className="min-w-48 border-r border-slate-300 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:border-slate-700 dark:text-slate-200">
                                {t('Remarks')}
                            </TableHead>
                            <TableHead className="w-28 text-right text-xs font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-200">
                                {t('Actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayRows.map((row, idx) => {
                            const playerName = resolveDisplayPlayerName(
                                row,
                                event.name,
                            );
                            const isTeamEvent = event.event_type === 'team';
                            const editActionLabel = isTeamEvent
                                ? t('Edit medal')
                                : t('Edit participant');
                            const playerSportProfile = playerSportProfileText(
                                row.playerSportProfile,
                                t,
                            );

                            return (
                                <TableRow
                                    key={row.rowId}
                                    className="border-b border-slate-200 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/60"
                                >
                                    <TableCell className="border-r border-slate-200 text-center text-xs text-muted-foreground tabular-nums dark:border-slate-800">
                                        {idx + 1}
                                    </TableCell>
                                    <TableCell className="border-r border-slate-200 py-2 dark:border-slate-800">
                                        <div className="flex items-start gap-2">
                                            {row.playerPhotoPath ? (
                                                <img
                                                    src={`/storage/${row.playerPhotoPath}`}
                                                    alt={playerName}
                                                    className="mt-0.5 h-8 w-8 rounded-full border object-cover"
                                                />
                                            ) : (
                                                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-slate-100 text-xs font-semibold text-slate-500">
                                                    {playerName
                                                        .slice(0, 1)
                                                        .toUpperCase()}
                                                </span>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {playerName}
                                                </div>
                                                {playerSportProfile ? (
                                                    <p className="max-w-80 text-xs text-muted-foreground">
                                                        {playerSportProfile}
                                                    </p>
                                                ) : null}
                                                {row.playerPno ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('PNO')}:{' '}
                                                        {row.playerPno}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </TableCell>
                                    {(!isTeamEvent ||
                                        row.isFirstPlayerInTeam) && (
                                        <>
                                            <TableCell
                                                rowSpan={
                                                    isTeamEvent
                                                        ? Math.max(
                                                              row.teamPlayerCount,
                                                              1,
                                                          )
                                                        : undefined
                                                }
                                                className="border-r border-slate-200 py-2 text-center tabular-nums dark:border-slate-800"
                                            >
                                                {row.resultParticipation.position ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                rowSpan={
                                                    isTeamEvent
                                                        ? Math.max(
                                                              row.teamPlayerCount,
                                                              1,
                                                          )
                                                        : undefined
                                                }
                                                className="border-r border-slate-200 py-2 dark:border-slate-800"
                                            >
                                                <MedalBadge
                                                    medal={
                                                        row.resultParticipation
                                                            .achievement
                                                            ?.medal_type ?? null
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell
                                                rowSpan={
                                                    isTeamEvent
                                                        ? Math.max(
                                                              row.teamPlayerCount,
                                                              1,
                                                          )
                                                        : undefined
                                                }
                                                className="max-w-[260px] border-r border-slate-200 py-2 text-sm text-muted-foreground dark:border-slate-800"
                                            >
                                                <span className="line-clamp-2">
                                                    {row.resultParticipation
                                                        .achievement?.remarks ||
                                                        '—'}
                                                </span>
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title={t('Photos')}
                                                onClick={() =>
                                                    setMediaParticipation(
                                                        row.participation,
                                                    )
                                                }
                                            >
                                                {canUpload || canDelete ? (
                                                    <Camera className="h-4 w-4" />
                                                ) : (
                                                    <Images className="h-4 w-4" />
                                                )}
                                                {row.participation
                                                    .media_files_count > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                                                        {row.participation
                                                            .media_files_count >
                                                        9
                                                            ? '9+'
                                                            : row.participation
                                                                  .media_files_count}
                                                    </span>
                                                )}
                                                <span className="sr-only">
                                                    {t('Photos')}
                                                </span>
                                            </Button>
                                            {(!isTeamEvent ||
                                                row.isFirstPlayerInTeam) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={editActionLabel}
                                                    onClick={() =>
                                                        setEditingParticipation(
                                                            row.resultParticipation,
                                                        )
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        {editActionLabel}
                                                    </span>
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                title={t('Remove participant')}
                                                onClick={() =>
                                                    setDeletingParticipation({
                                                        participation:
                                                            row.participation,
                                                        ...(isTeamEvent
                                                            ? {
                                                                  playerId:
                                                                      row.playerId,
                                                                  playerName,
                                                              }
                                                            : {}),
                                                    })
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">
                                                    {t('Remove participant')}
                                                </span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
                description={t(
                    deletingParticipation?.playerId
                        ? 'This will remove :name from this team lineup. The team participation will stay for the remaining players.'
                        : 'This will permanently delete the participation and any medal record. This action cannot be undone.',
                ).replace(
                    ':name',
                    deletingParticipation?.playerName ?? t('this participant'),
                )}
                confirmLabel={t('Remove')}
                onConfirm={handleDelete}
                processing={deletingProcessing}
            />
            {mediaParticipation && (
                <ParticipationMediaSheet
                    participationId={mediaParticipation.id}
                    memberName={
                        mediaParticipation.member?.full_name ??
                        mediaParticipation.team?.name ??
                        ''
                    }
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
    eventVariants = [],
    participations,
    participantCandidates,
    participantFilterOptions = { levels: [] },
}: {
    tournament: TournamentRef;
    event: EventProp;
    sports: Sport[];
    eventVariants?: EventVariant[];
    participations?: ParticipationRow[];
    participantCandidates?: ParticipantCandidateTeam[];
    participantFilterOptions?: ParticipantFilterOptions;
}) {
    const { t } = useTranslation();
    const page = usePage();
    const permissions = page.props.auth.permissions;
    const canUploadMedia = permissions.includes('media.upload');
    const canDeleteMedia = permissions.includes('media.delete');
    const [editEventOpen, setEditEventOpen] = useState(false);
    const [deleteEventOpen, setDeleteEventOpen] = useState(false);
    const [addParticipantOpen, setAddParticipantOpen] = useState(false);
    const { delete: deleteEventForm, processing: deletingEventProcessing } =
        useForm({});

    function handleDeleteEvent() {
        deleteEventForm(
            destroyEvent.url({ tournament: tournament.id, event: event.id }),
            {
                onSuccess: () => setDeleteEventOpen(false),
            },
        );
    }

    const currentQuery = Object.fromEntries(
        new URLSearchParams(page.url.split('?')[1] ?? ''),
    );
    const tournamentContextQuery = Object.fromEntries(
        Object.entries(currentQuery).filter(([key]) =>
            key === 'filter[session_id]' ||
            key === 'filter[tier_id]' ||
            key === 'filter[date_from]' ||
            key === 'filter[date_to]',
        ),
    );
    const tournamentEventsUrl = tournamentEvents.url(tournament.id, {
        query: currentQuery,
    });

    setLayoutProps({
        breadcrumbs: [
            {
                title: t('Tournaments'),
                href: tournamentsIndex.url({ query: tournamentContextQuery }),
            },
            { title: tournament.name, href: tournamentEventsUrl },
            { title: event.name },
        ],
    });

    const normalizedParticipations = participations ?? [];

    const participantCount =
        normalizedParticipations.reduce(
            (total, participation) =>
                total +
                (event.event_type === 'team'
                    ? teamParticipationPlayerCount(participation)
                    : participation.member
                      ? 1
                      : 0),
            0,
        ) ?? 0;

    return (
        <>
            <Head title={event.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={tournamentsIndex({
                                    query: tournamentContextQuery,
                                })}
                            >
                                <List className="mr-1.5 h-4 w-4" />
                                {t('All tournaments')}
                            </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={tournamentEventsUrl}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Tournament events')}
                            </Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                {tournament.name}
                            </p>
                            <Heading variant="small" title={event.name} />
                            <div className="flex flex-wrap gap-2">
                                {event.sport && (
                                    <Badge variant="secondary">
                                        {event.sport.name}
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {genderLabel(event.gender_class, t)}
                                </Badge>
                                {event.discipline && (
                                    <Badge variant="outline">
                                        {event.discipline}
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {event.event_type === 'team'
                                        ? t('Team event')
                                        : t('Individual event')}
                                </Badge>
                                {event.weight_category && (
                                    <Badge variant="outline">
                                        {event.weight_category}
                                    </Badge>
                                )}
                                {event.participants_required ? (
                                    <Badge variant="outline">
                                        {event.event_type === 'team'
                                            ? `${t('Players per team')}: ${event.participants_required}`
                                            : `${t('Participants')}: ${event.participants_required}`}
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!event.can_update_structure}
                                title={
                                    event.can_update_structure
                                        ? t('Edit')
                                        : t(
                                              'Event cannot be edited after participants are added',
                                          )
                                }
                                onClick={() => setEditEventOpen(true)}
                            >
                                <Pencil className="mr-1.5 h-4 w-4" />
                                {t('Edit')}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteEventOpen(true)}
                            >
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
                            <h2 className="text-base font-semibold">
                                {t('Participants')}
                            </h2>
                            {participations !== undefined && (
                                <p className="text-sm text-muted-foreground">
                                    {participantCount}{' '}
                                    {t(
                                        participantCount === 1
                                            ? 'participant'
                                            : 'participants',
                                    )}
                                </p>
                            )}
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setAddParticipantOpen(true)}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('Add participant')}
                        </Button>
                    </div>

                    <Deferred
                        data="participations"
                        fallback={
                            <Skeleton className="h-40 w-full rounded-xl" />
                        }
                    >
                        <ParticipantsList
                            participations={normalizedParticipations}
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
                eventVariants={eventVariants}
            />
            <ConfirmDeleteDialog
                open={deleteEventOpen}
                onOpenChange={setDeleteEventOpen}
                title={t('Delete event')}
                description={t(
                    'This will permanently delete the event and all its participations. This action cannot be undone.',
                )}
                confirmLabel={t('Delete event')}
                onConfirm={handleDeleteEvent}
                processing={deletingEventProcessing}
            />
            <AddParticipantDialog
                open={addParticipantOpen}
                onOpenChange={setAddParticipantOpen}
                tournament={tournament}
                event={event}
                participantCandidates={participantCandidates}
                participantFilterOptions={participantFilterOptions}
            />
        </>
    );
}
