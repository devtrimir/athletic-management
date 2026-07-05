import { Head, Link, router, setLayoutProps, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    FileDown,
    Dumbbell,
    Eye,
    Info,
    MapPin,
    Medal,
    Pencil,
    Plus,
    Search,
    Printer,
    Trash2,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
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
import {
    eventsReport,
    eventsExport,
} from '@/actions/App/Http/Controllers/TournamentExportController';
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

type EventMedalCounts = {
    gold: number;
    silver: number;
    bronze: number;
    merit: number;
};

type EventParticipantPreviewPlayer = {
    id: number;
    participation_id?: string;
    full_name: string;
    pno: string | null;
    rank?: string | null;
    posting_location?: string | null;
    sport_profile?: {
        sport_event: string | null;
        role: string | null;
        position: string | null;
    } | null;
    medals_by_type?: EventMedalCounts;
};

type EventRow = {
    id: number;
    name: string;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string;
    sport_event_variant_id: number | null;
    event_type: 'individual' | 'team';
    participants_required: number | null;
    event_source: 'manual' | 'official' | 'provisional';
    provisional_reason: string | null;
    participations_count: number;
    can_update_structure: boolean;
    teams_count: number;
    medals_count: number;
    medals_by_type: EventMedalCounts;
    single_participant: {
        id: number;
        participation_id?: string;
        full_name: string;
        pno: string | null;
        rank?: string | null;
        sport_profile?: EventParticipantPreviewPlayer['sport_profile'];
        medals_by_type?: EventMedalCounts;
    } | null;
    participant_previews: {
        players: EventParticipantPreviewPlayer[];
        more_players: EventParticipantPreviewPlayer[];
        total_players: number;
    };
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
    gender?: string | null;
    participation_status?: string | null;
    event_type?: 'individual' | 'team' | null;
    print_orientation?: PrintOrientation | null;
    report_type?: 'detail' | 'summary' | 'medal_log' | 'sport_medal_log' | null;
};

type PrintOrientation = 'landscape' | 'portrait';

type EventSummarySport = {
    id: number;
    name: string;
    events_count: number;
    participants_count: number;
};

type EventSummary = {
    sports: EventSummarySport[];
    team_events: number;
    individual_events: number;
    team_medals: number;
    individual_medals: number;
    medal_counts: {
        GOLD: number;
        SILVER: number;
        BRONZE: number;
        MERIT: number;
    };
    total_events: number;
};

const EMPTY_EVENT_SUMMARY: EventSummary = {
    sports: [],
    team_events: 0,
    individual_events: 0,
    team_medals: 0,
    individual_medals: 0,
    medal_counts: {
        GOLD: 0,
        SILVER: 0,
        BRONZE: 0,
        MERIT: 0,
    },
    total_events: 0,
};

const ZERO_MEDAL_COUNTS: EventMedalCounts = {
    gold: 0,
    silver: 0,
    bronze: 0,
    merit: 0,
};

function medalCountTotal(medals?: EventMedalCounts | null): number {
    return (
        (medals?.gold ?? 0) +
        (medals?.silver ?? 0) +
        (medals?.bronze ?? 0) +
        (medals?.merit ?? 0)
    );
}

type EventForm = {
    event_mode: 'official' | 'provisional';
    sport_event_variant_id: string;
    sport_event_variant_ids: string[];
    sport_id: string;
    name: string;
    event_type: 'individual' | 'team' | '';
    participants_required: string;
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

function sanitizeEventDetail(value?: string | null): string {
    return (value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeOfficialEventDetail(value: string): string {
    const text = sanitizeEventDetail(value)
        .replace(/,/g, ' / ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const parts = text
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);
    const firstPart = parts.length > 0 ? parts[0] : '';

    return firstPart
        .replace(
            /^(?:powerlifting|weightlifting)\s+(?:total|total\s+points)\s*:?\s*/i,
            '',
        )
        .replace(/^(?:official|provisional)\s*:?\s*/i, '')
        .trim();
}

function eventSubtitle(
    event: EventRow,
    t: (key: string) => string,
): { title: string; fallbackName?: string } {
    const name = sanitizeEventDetail(event.name);
    const discipline = sanitizeEventDetail(event.discipline);
    const weight = sanitizeEventDetail(event.weight_category);

    if (event.event_source !== 'official') {
        return { title: name || t('Event') };
    }

    const officialTitle = weight || normalizeOfficialEventDetail(discipline);

    if (officialTitle) {
        return { title: officialTitle };
    }

    return { title: name || t('Event') };
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
        `${t('Event type')}: ${
            variant.is_team_based ? t('Team') : t('Individual')
        }`,
        variant.result_type,
        variant.measurement_symbol ?? variant.measurement_unit,
        participantText !== '—'
            ? `${t('Player limit')}: ${participantText}`
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
    showParticipantsField = true,
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
    showParticipantsField?: boolean;
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
            const updates: Partial<EventForm> = {
                sport_event_variant_id: value,
                sport_id: String(variant.sport_id),
                name: variant.name,
                discipline: variant.discipline ?? '',
                weight_category: variant.weight_category ?? '',
                gender_class: variant.gender_class,
            };

            if (data.event_type === '') {
                updates.event_type = variant.is_team_based
                    ? 'team'
                    : 'individual';
            }

            if (data.participants_required === '') {
                updates.participants_required = variant.min_participants
                    ? String(variant.min_participants)
                    : '';
            }

            setData(updates);
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

            if (data.event_type === '') {
                updates.event_type = variant.is_team_based
                    ? 'team'
                    : 'individual';
            }

            if (data.participants_required === '') {
                updates.participants_required = variant.min_participants
                    ? String(variant.min_participants)
                    : '';
            }
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
            const variantTeamMode = selectedVariant.is_team_based
                ? 'team'
                : 'individual';

            updates.sport_id = String(selectedVariant.sport_id);
            updates.name = selectedVariant.name;
            updates.discipline = selectedVariant.discipline ?? '';
            updates.weight_category = selectedVariant.weight_category ?? '';
            updates.gender_class = selectedVariant.gender_class;

            if (updates.event_type === '' || data.event_type === '') {
                updates.event_type = variantTeamMode;
            }

            if (
                updates.participants_required === '' ||
                data.participants_required === ''
            ) {
                updates.participants_required = selectedVariant.min_participants
                    ? String(selectedVariant.min_participants)
                    : '';
            }
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

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}_event_type`}>
                    {t('Event type')}{' '}
                    {data.event_mode === 'provisional' ? (
                        <span className="text-destructive">*</span>
                    ) : null}
                </Label>
                <Select
                    value={data.event_type}
                    onValueChange={(value) =>
                        setData({
                            event_type:
                                value === 'team' ? 'team' : 'individual',
                        })
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

            {showParticipantsField ? (
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
                            setData({
                                participants_required: e.target.value,
                            })
                        }
                        placeholder={t('Optional')}
                    />
                    <InputError message={errors.participants_required} />
                </div>
            ) : null}

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
                                                                `${t('Event type')}: ${
                                                                    variant.is_team_based
                                                                        ? t(
                                                                              'Team',
                                                                          )
                                                                        : t(
                                                                              'Individual',
                                                                          )
                                                                }`,
                                                                variant.format,
                                                                variant.result_type,
                                                                `${t('Player limit')}: ${participantRange(
                                                                    variant.min_participants,
                                                                    variant.max_participants,
                                                                )}`,
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
                                        `${t('Event type')}: ${
                                            variant.is_team_based
                                                ? t('Team')
                                                : t('Individual')
                                        }`,
                                        variant.format,
                                        variant.result_type,
                                        `${t('Player limit')}: ${participantRange(
                                            variant.min_participants,
                                            variant.max_participants,
                                        )}`,
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
                            {t('Event type')}:{' '}
                            {selectedVariant.is_team_based
                                ? t('Team')
                                : t('Individual')}
                        </span>
                        <span>
                            {t('Format')}: {selectedVariant.format ?? '—'}
                        </span>
                        <span>
                            {t('Result type')}:{' '}
                            {selectedVariant.result_type ?? '—'}
                        </span>
                        <span>
                            {t('Player limit')}:{' '}
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
                            {t('Gender')}{' '}
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
            event_type: 'individual',
            participants_required: '',
            discipline: '',
            weight_category: '',
            gender_class: 'M',
            provisional_reason: '',
        });
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        bodyRef.current?.scrollTo({
            top: 0,
            behavior: 'auto',
        });
    }, [open]);

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
            <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('Add event')}</DialogTitle>
                    <DialogDescription>
                        {t('Add a new event to this tournament.')}
                    </DialogDescription>
                </DialogHeader>
                <div
                    ref={bodyRef}
                    className="max-h-[calc(90vh-11rem)] overflow-y-auto pr-1"
                >
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
                            showParticipantsField={false}
                        />
                    </form>
                </div>
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
            event_type: event?.event_type ?? 'individual',
            participants_required: event?.participants_required
                ? String(event.participants_required)
                : '',
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
    eventSummary,
    event_summary,
    activeTab,
    sports,
    eventVariants = [],
    eventFilters = {},
    events,
}: {
    tournament: Tournament;
    eventSummary?: EventSummary;
    event_summary?: EventSummary;
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
    const [eventReportOrientation, setEventReportOrientation] =
        useState<PrintOrientation>('landscape');

    const { delete: deleteEventForm, processing: deletingEventProcessing } =
        useForm({});
    const {
        delete: deleteTournamentForm,
        processing: deletingTournamentProcessing,
    } = useForm({});
    const summary = eventSummary ?? event_summary ?? EMPTY_EVENT_SUMMARY;

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

    function buildEventFilterQuery(
        overrides: Partial<EventFilters> = {},
    ): Record<string, string> {
        const merged: EventFilters = {
            q: overrides.q ?? eventFilters.q ?? null,
            sport_id: overrides.sport_id ?? eventFilters.sport_id ?? null,
            gender: overrides.gender ?? eventFilters.gender ?? null,
            participation_status:
                overrides.participation_status ??
                eventFilters.participation_status ??
                null,
            event_type: overrides.event_type ?? eventFilters.event_type ?? null,
            print_orientation: overrides.print_orientation ?? null,
            report_type: overrides.report_type ?? null,
        };
        const query: Record<string, string> = {};

        for (const [key, value] of Object.entries(merged)) {
            if (value) {
                query[`filter[${key}]`] = String(value);
            }
        }

        return query;
    }

    function applyEventFilters(patch: Partial<EventFilters>) {
        const query = buildEventFilterQuery(patch);
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

    function handleEventsReportPrint(
        reportType: 'detail' | 'summary' | 'medal_log' | 'sport_medal_log',
    ) {
        const url = eventsReport.url(tournament.id, {
            query:
                reportType === 'detail'
                    ? buildEventFilterQuery({
                          print_orientation: eventReportOrientation,
                      })
                    : buildEventFilterQuery({
                          report_type: reportType,
                          print_orientation: eventReportOrientation,
                      }),
        });

        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function handleEventsReportExport(reportType: 'detail' | 'summary') {
        const url = eventsExport.url(tournament.id, {
            query: buildEventFilterQuery({ report_type: reportType }),
        });

        window.location.href = url;
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name },
        ],
    });

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
    const headerMetaCards = [
        {
            label: t('Schedule'),
            value: dateRange(),
            icon: CalendarDays,
        },
        {
            label: t('Venue'),
            value: tournament.venue ?? '—',
            icon: MapPin,
        },
        {
            label: t('Session'),
            value: tournament.session?.name ?? '—',
            icon: Trophy,
        },
        {
            label: t('Tier'),
            value: tournament.tier?.label ?? '—',
            icon: Info,
        },
        ...(tournament.sport
            ? [
                  {
                      label: t('Sport'),
                      value: tournament.sport.name,
                      icon: Dumbbell,
                  },
              ]
            : []),
    ];
    const compactSports = Array.from(
        summary.sports
            .reduce((sports, sport) => {
                const existing = sports.get(sport.id);

                if (existing) {
                    existing.events_count += sport.events_count;
                    existing.participants_count += sport.participants_count;

                    return sports;
                }

                sports.set(sport.id, { ...sport });

                return sports;
            }, new Map<number, EventSummarySport>())
            .values(),
    ).sort(
        (left, right) =>
            right.participants_count - left.participants_count ||
            right.events_count - left.events_count ||
            left.name.localeCompare(right.name),
    );
    const totalSportParticipants = compactSports.reduce(
        (total, sport) => total + sport.participants_count,
        0,
    );
    const topSportByParticipants = compactSports[0] ?? null;
    const topSportByEvents =
        [...compactSports].sort(
            (left, right) =>
                right.events_count - left.events_count ||
                right.participants_count - left.participants_count ||
                left.name.localeCompare(right.name),
        )[0] ?? null;
    const dominantEventModeLabel =
        summary.team_events === 0 && summary.individual_events === 0
            ? t('No events yet.')
            : summary.team_events === summary.individual_events
              ? t('Balanced split')
              : summary.team_events > summary.individual_events
                ? t('Mostly team')
                : t('Mostly individual');
    const dominantMedalModeLabel =
        summary.team_medals === 0 && summary.individual_medals === 0
            ? t('No medals yet.')
            : summary.team_medals === summary.individual_medals
              ? t('Balanced medals')
              : summary.team_medals > summary.individual_medals
                ? t('Mostly team medals')
                : t('Mostly individual medals');
    const detailEventItems = [
        {
            label: t('Team events'),
            value: summary.team_events,
        },
        {
            label: t('Individual events'),
            value: summary.individual_events,
        },
        ...(summary.total_events !== tournament.events_count
            ? [
                  {
                      label: t('Detailed events'),
                      value: summary.total_events,
                  },
              ]
            : []),
    ];
    const detailParticipationItems = [
        {
            label: t('Sports'),
            value: compactSports.length,
        },
        ...(totalSportParticipants !== tournament.participants_count
            ? [
                  {
                      label: t('Detailed participants'),
                      value: totalSportParticipants,
                  },
              ]
            : []),
    ];
    const detailMedalItems = [
        {
            label: t('Individual medals'),
            value: summary.individual_medals,
        },
        {
            label: t('Team medals'),
            value: summary.team_medals,
        },
        ...(summary.individual_medals + summary.team_medals !==
        tournament.medals_count
            ? [
                  {
                      label: t('Detailed medals'),
                      value: summary.individual_medals + summary.team_medals,
                  },
              ]
            : []),
    ];
    const eventOverviewCards = [
        {
            label: t('Events'),
            value: summary.total_events,
            icon: Trophy,
        },
        {
            label: t('Sports'),
            value: summary.sports.length,
            icon: Dumbbell,
        },
        {
            label: t('Medals'),
            value:
                summary.medal_counts.GOLD +
                summary.medal_counts.SILVER +
                summary.medal_counts.BRONZE +
                summary.medal_counts.MERIT,
            icon: Medal,
        },
        {
            label: t('Individual medals'),
            value: summary.individual_medals,
            icon: Medal,
        },
        {
            label: t('Team medals'),
            value: summary.team_medals,
            icon: Medal,
        },
        {
            label: t('Individual events'),
            value: summary.individual_events,
            icon: Users,
        },
        {
            label: t('Team events'),
            value: summary.team_events,
            icon: Users,
        },
    ];
    const supportingDetails = [
        {
            label: t('Date from'),
            value: formatDate(tournament.date_from),
        },
        {
            label: t('Date to'),
            value: formatDate(tournament.date_to),
        },
        {
            label: t('Created'),
            value: (
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(tournament.created_at)}
                </span>
            ),
        },
        {
            label: t('Raw date text'),
            value: tournament.raw_date_text,
        },
    ];
    const snapshotItems = [
        ...headerMetaCards.map((item) => ({
            label: item.label,
            value: item.value,
        })),
        ...supportingDetails,
    ];
    const medalPositionItems = [
        {
            label: t('Gold'),
            value:
                Object.entries(summary.medal_counts).find(
                    ([type]) => type.toLowerCase() === 'gold',
                )?.[1] ?? 0,
        },
        {
            label: t('Silver'),
            value:
                Object.entries(summary.medal_counts).find(
                    ([type]) => type.toLowerCase() === 'silver',
                )?.[1] ?? 0,
        },
        {
            label: t('Bronze'),
            value:
                Object.entries(summary.medal_counts).find(
                    ([type]) => type.toLowerCase() === 'bronze',
                )?.[1] ?? 0,
        },
        {
            label: t('Merit'),
            value:
                Object.entries(summary.medal_counts).find(
                    ([type]) => type.toLowerCase() === 'merit',
                )?.[1] ?? 0,
        },
    ];
    const hasEventFilters = !!(
        eventFilters.q ||
        eventFilters.sport_id ||
        eventFilters.gender ||
        eventFilters.participation_status ||
        eventFilters.event_type
    );
    const eventTableColSpan = 15;
    const eventGroups = Array.from(
        (events ?? [])
            .reduce(
                (groups, event) => {
                    const sportKey = event.sport
                        ? String(event.sport.id)
                        : 'unknown';
                    const medals = event.medals_by_type ?? {
                        gold: 0,
                        silver: 0,
                        bronze: 0,
                        merit: 0,
                    };

                    if (!groups.has(sportKey)) {
                        groups.set(sportKey, {
                            sportKey,
                            sportName: event.sport?.name ?? t('Unknown sport'),
                            events: [],
                            totalMedals: 0,
                            goldMedals: 0,
                            silverMedals: 0,
                            bronzeMedals: 0,
                            meritMedals: 0,
                        });
                    }

                    const group = groups.get(sportKey);

                    if (group) {
                        group.events.push(event);
                        group.totalMedals +=
                            (medals.gold ?? 0) +
                            (medals.silver ?? 0) +
                            (medals.bronze ?? 0) +
                            (medals.merit ?? 0);
                        group.goldMedals += medals.gold ?? 0;
                        group.silverMedals += medals.silver ?? 0;
                        group.bronzeMedals += medals.bronze ?? 0;
                        group.meritMedals += medals.merit ?? 0;
                    }

                    return groups;
                },
                new Map<
                    string,
                    {
                        sportKey: string;
                        sportName: string;
                        events: EventRow[];
                        totalMedals: number;
                        goldMedals: number;
                        silverMedals: number;
                        bronzeMedals: number;
                        meritMedals: number;
                    }
                >(),
            )
            .values(),
    );
    let eventSerialNumber = 0;

    return (
        <>
            <Head title={tournament.name} />

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={tournamentsIndex.url()}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                                    {tournament.name}
                                </h1>
                                <Badge variant="outline">
                                    {tournamentStatus()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editTournament.url(tournament.id)}>
                                {t('Edit')}
                            </Link>
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
                            <section className="space-y-3">
                                <div>
                                    <Heading
                                        variant="small"
                                        title={t('Overview')}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            'Plain operational summary with facts, counts, medal split, and sport activity.',
                                        )}
                                    </p>
                                </div>

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/15 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Tournament details')}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full table-fixed text-sm">
                                            <tbody className="divide-y">
                                                {Array.from({
                                                    length: Math.ceil(
                                                        snapshotItems.length /
                                                            2,
                                                    ),
                                                }).map((_, rowIndex) => {
                                                    const row =
                                                        snapshotItems.slice(
                                                            rowIndex * 2,
                                                            rowIndex * 2 + 2,
                                                        );

                                                    return (
                                                        <tr
                                                            key={`snapshot-${rowIndex}`}
                                                            className="align-top"
                                                        >
                                                            {row.map((item) => (
                                                                <Fragment
                                                                    key={
                                                                        item.label
                                                                    }
                                                                >
                                                                    <th className="w-32 bg-muted/20 px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:w-40">
                                                                        {
                                                                            item.label
                                                                        }
                                                                    </th>
                                                                    <td className="px-2.5 py-2 text-sm font-medium">
                                                                        {item.value ?? (
                                                                            <span className="text-muted-foreground">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </Fragment>
                                                            ))}
                                                            {row.length ===
                                                            1 ? (
                                                                <>
                                                                    <th className="w-32 bg-muted/20 px-2.5 py-2 sm:w-40" />
                                                                    <td className="px-2.5 py-2" />
                                                                </>
                                                            ) : null}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/15 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Core counts')}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full table-fixed text-sm">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    {overviewCards.map(
                                                        (item) => (
                                                            <th
                                                                key={item.label}
                                                                className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                                                            >
                                                                {item.label}
                                                            </th>
                                                        ),
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t">
                                                    {overviewCards.map(
                                                        (item) => (
                                                            <td
                                                                key={item.label}
                                                                className="px-2.5 py-2 text-base font-semibold tabular-nums"
                                                            >
                                                                {item.value}
                                                            </td>
                                                        ),
                                                    )}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/15 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Operational breakdown')}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Area')}
                                                    </th>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Summary')}
                                                    </th>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Insight')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                <tr className="align-top">
                                                    <th className="px-2.5 py-2 text-left font-medium">
                                                        {t('Event breakdown')}
                                                    </th>
                                                    <td className="px-2.5 py-2">
                                                        <div className="space-y-1">
                                                            {detailEventItems.map(
                                                                (item) => (
                                                                    <div
                                                                        key={
                                                                            item.label
                                                                        }
                                                                        className="flex flex-wrap items-center justify-between gap-2"
                                                                    >
                                                                        <span className="text-muted-foreground">
                                                                            {
                                                                                item.label
                                                                            }
                                                                        </span>
                                                                        <span className="font-semibold tabular-nums">
                                                                            {
                                                                                item.value
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 py-2 text-sm">
                                                        {dominantEventModeLabel}
                                                    </td>
                                                </tr>
                                                <tr className="align-top">
                                                    <th className="px-2.5 py-2 text-left font-medium">
                                                        {t(
                                                            'Participation breakdown',
                                                        )}
                                                    </th>
                                                    <td className="px-2.5 py-2">
                                                        <div className="space-y-1">
                                                            {detailParticipationItems.map(
                                                                (item) => (
                                                                    <div
                                                                        key={
                                                                            item.label
                                                                        }
                                                                        className="flex flex-wrap items-center justify-between gap-2"
                                                                    >
                                                                        <span className="text-muted-foreground">
                                                                            {
                                                                                item.label
                                                                            }
                                                                        </span>
                                                                        <span className="font-semibold tabular-nums">
                                                                            {
                                                                                item.value
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 py-2">
                                                        <div className="space-y-1 text-sm">
                                                            <div>
                                                                <span className="font-medium">
                                                                    {t(
                                                                        'Top sport by participants',
                                                                    )}
                                                                    :
                                                                </span>{' '}
                                                                {topSportByParticipants
                                                                    ? `${topSportByParticipants.name} (${topSportByParticipants.participants_count})`
                                                                    : '—'}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">
                                                                    {t(
                                                                        'Top sport by events',
                                                                    )}
                                                                    :
                                                                </span>{' '}
                                                                {topSportByEvents
                                                                    ? `${topSportByEvents.name} (${topSportByEvents.events_count})`
                                                                    : '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="align-top">
                                                    <th className="px-2.5 py-2 text-left font-medium">
                                                        {t('Medal breakdown')}
                                                    </th>
                                                    <td className="px-2.5 py-2">
                                                        <div className="space-y-1">
                                                            {detailMedalItems.map(
                                                                (item) => (
                                                                    <div
                                                                        key={
                                                                            item.label
                                                                        }
                                                                        className="flex flex-wrap items-center justify-between gap-2"
                                                                    >
                                                                        <span className="text-muted-foreground">
                                                                            {
                                                                                item.label
                                                                            }
                                                                        </span>
                                                                        <span className="font-semibold tabular-nums">
                                                                            {
                                                                                item.value
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 py-2 text-sm">
                                                        {dominantMedalModeLabel}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/15 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Medal positions')}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full table-fixed text-sm">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    {medalPositionItems.map(
                                                        (item) => (
                                                            <th
                                                                key={item.label}
                                                                className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                                                            >
                                                                {item.label}
                                                            </th>
                                                        ),
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t">
                                                    {medalPositionItems.map(
                                                        (item) => (
                                                            <td
                                                                key={item.label}
                                                                className="px-2.5 py-2 text-base font-semibold tabular-nums"
                                                            >
                                                                {item.value}
                                                            </td>
                                                        ),
                                                    )}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/15 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Players by sport')}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Sport')}
                                                    </th>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Participants')}
                                                    </th>
                                                    <th className="px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                        {t('Events')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {compactSports.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            colSpan={3}
                                                            className="px-2.5 py-3 text-sm text-muted-foreground"
                                                        >
                                                            {t(
                                                                'No events yet.',
                                                            )}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    compactSports.map(
                                                        (sport) => (
                                                            <tr key={sport.id}>
                                                                <td className="px-2.5 py-2 font-medium">
                                                                    {sport.name}
                                                                </td>
                                                                <td className="px-2.5 py-2 tabular-nums">
                                                                    {
                                                                        sport.participants_count
                                                                    }
                                                                </td>
                                                                <td className="px-2.5 py-2 tabular-nums">
                                                                    {
                                                                        sport.events_count
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </TabsContent>

                    {/* Events */}
                    <TabsContent value="events" className="space-y-4">
                        {activeTab === 'events' ? (
                            <>
                                <section className="overflow-x-auto">
                                    <div className="flex min-w-max gap-2 pb-1">
                                        {eventOverviewCards.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-lg border bg-card p-2"
                                            >
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <item.icon className="h-3.5 w-3.5" />
                                                    <span>{item.label}</span>
                                                </div>
                                                <p className="mt-1 text-xs font-semibold">
                                                    {item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
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
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Label
                                                        htmlFor="event-report-orientation"
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        {t('Orientation')}
                                                    </Label>
                                                    <Select
                                                        value={
                                                            eventReportOrientation
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            setEventReportOrientation(
                                                                value as PrintOrientation,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            id="event-report-orientation"
                                                            className="h-9 w-36"
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="landscape">
                                                                {t('Landscape')}
                                                            </SelectItem>
                                                            <SelectItem value="portrait">
                                                                {t('Portrait')}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportPrint(
                                                            'detail',
                                                        )
                                                    }
                                                >
                                                    <Printer className="mr-1.5 h-4 w-4" />
                                                    {t('Print detail report')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportPrint(
                                                            'summary',
                                                        )
                                                    }
                                                >
                                                    <Printer className="mr-1.5 h-4 w-4" />
                                                    {t('Print summary report')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportPrint(
                                                            'medal_log',
                                                        )
                                                    }
                                                >
                                                    <Printer className="mr-1.5 h-4 w-4" />
                                                    {t('Print medal log')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportPrint(
                                                            'sport_medal_log',
                                                        )
                                                    }
                                                >
                                                    <Printer className="mr-1.5 h-4 w-4" />
                                                    {t('Print sport medal log')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportExport(
                                                            'detail',
                                                        )
                                                    }
                                                >
                                                    <FileDown className="mr-1.5 h-4 w-4" />
                                                    {t('Export detail (Excel)')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleEventsReportExport(
                                                            'summary',
                                                        )
                                                    }
                                                >
                                                    <FileDown className="mr-1.5 h-4 w-4" />
                                                    {t(
                                                        'Export summary (Excel)',
                                                    )}
                                                </Button>
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
                                            <Combobox
                                                value={eventFilters.sport_id ?? 'all'}
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        sport_id:
                                                            value === 'all' ||
                                                            value === ''
                                                            ? null
                                                            : value,
                                                    })
                                                }
                                                items={[
                                                    { value: 'all', label: t('All sports') },
                                                    ...sports.map((sport) => ({
                                                        value: String(sport.id),
                                                        label: sport.name,
                                                    })),
                                                ]}
                                                placeholder={t('All sports')}
                                                searchPlaceholder={t(
                                                    'Search sports…',
                                                )}
                                                className="w-44"
                                                emptyMessage={t('No sports found.')}
                                            />
                                            <Select
                                                value={
                                                    eventFilters.gender ?? 'all'
                                                }
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        gender:
                                                            value === 'all'
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-40">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'All genders',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All genders')}
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
                                            <Select
                                                value={
                                                    eventFilters.event_type ??
                                                    'all'
                                                }
                                                onValueChange={(value) =>
                                                    applyEventFilters({
                                                        event_type:
                                                            value === 'all'
                                                                ? null
                                                                : (value as
                                                                      | 'individual'
                                                                      | 'team'),
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-40">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'All event types',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All event types')}
                                                    </SelectItem>
                                                    <SelectItem value="individual">
                                                        {t('Individual')}
                                                    </SelectItem>
                                                    <SelectItem value="team">
                                                        {t('Team')}
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
                                        <Table className="min-w-[1140px] text-[11px] leading-tight">
                                            <TableHeader className="bg-muted/30 text-[11px]">
                                                <TableRow className="hover:bg-muted/30">
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="w-14 whitespace-nowrap align-middle"
                                                    >
                                                        {t('S.No.')}
                                                    </TableHead>
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="min-w-56 align-middle"
                                                    >
                                                        {t('Event')}
                                                    </TableHead>
                                                    <TableHead
                                                        colSpan={4}
                                                        className="text-center"
                                                    >
                                                        {t('Player')}
                                                    </TableHead>
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="w-20 align-middle"
                                                    >
                                                        {t('Gender')}
                                                    </TableHead>
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="w-20 align-middle"
                                                    >
                                                        {t('Type')}
                                                    </TableHead>
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="w-20 text-right align-middle"
                                                    >
                                                        {t('Participants')}
                                                    </TableHead>
                                                    <TableHead
                                                        colSpan={5}
                                                        className="text-center"
                                                    >
                                                        {t('Medals')}
                                                    </TableHead>
                                                    <TableHead
                                                        rowSpan={2}
                                                        className="sticky right-0 z-20 w-0 bg-card text-right align-middle"
                                                    >
                                                        {t('Actions')}
                                                    </TableHead>
                                                </TableRow>
                                                <TableRow className="hover:bg-muted/30">
                                                    <TableHead className="w-20 whitespace-nowrap">
                                                        {t('PNO')}
                                                    </TableHead>
                                                    <TableHead className="w-32">
                                                        {t('Rank')}
                                                    </TableHead>
                                                    <TableHead className="min-w-40">
                                                        {t('Player Name')}
                                                    </TableHead>
                                                    <TableHead className="w-36">
                                                        {t('Playable Event')}
                                                    </TableHead>
                                                    <TableHead className="w-12 text-right">
                                                        {t('Gold')}
                                                    </TableHead>
                                                    <TableHead className="w-12 text-right">
                                                        {t('Silver')}
                                                    </TableHead>
                                                    <TableHead className="w-12 text-right">
                                                        {t('Bronze')}
                                                    </TableHead>
                                                    <TableHead className="w-12 text-right">
                                                        {t('Merit')}
                                                    </TableHead>
                                                    <TableHead className="w-14 text-right">
                                                        {t('Total')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(events ?? []).length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={
                                                                eventTableColSpan
                                                            }
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
                                                                                eventTableColSpan
                                                                            }
                                                                            className="py-2.5 font-medium"
                                                                        >
                                                                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                                                                <span className="text-sm font-semibold">
                                                                                    {
                                                                                        group.sportName
                                                                                    }
                                                                                    <span className="ml-2 text-sm font-semibold text-muted-foreground">
                                                                                        (
                                                                                        {
                                                                                            group
                                                                                                .events
                                                                                                .length
                                                                                        }{' '}
                                                                                        {t(
                                                                                            'events',
                                                                                        )}

                                                                                        )
                                                                                    </span>
                                                                                </span>
                                                                                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                                                    <span className="inline-flex items-center gap-1">
                                                                                        <Medal className="h-3.5 w-3.5 text-amber-500" />
                                                                                        {
                                                                                            group.totalMedals
                                                                                        }{' '}
                                                                                        {t(
                                                                                            'medals',
                                                                                        )}
                                                                                    </span>
                                                                                    <span>
                                                                                        {t(
                                                                                            'Gold',
                                                                                        )}

                                                                                        :{' '}
                                                                                        {
                                                                                            group.goldMedals
                                                                                        }
                                                                                    </span>
                                                                                    <span>
                                                                                        {t(
                                                                                            'Silver',
                                                                                        )}

                                                                                        :{' '}
                                                                                        {
                                                                                            group.silverMedals
                                                                                        }
                                                                                    </span>
                                                                                    <span>
                                                                                        {t(
                                                                                            'Bronze',
                                                                                        )}

                                                                                        :{' '}
                                                                                        {
                                                                                            group.bronzeMedals
                                                                                        }
                                                                                    </span>
                                                                                    <span>
                                                                                        {t(
                                                                                            'Merit',
                                                                                        )}

                                                                                        :{' '}
                                                                                        {
                                                                                            group.meritMedals
                                                                                        }
                                                                                    </span>
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    {group.events.map(
                                                                        (ev) => {
                                                                            eventSerialNumber += 1;
                                                                            const label =
                                                                                eventSubtitle(
                                                                                    ev,
                                                                                    t,
                                                                                );
                                                                            const participantPreviews =
                                                                                {
                                                                                    players:
                                                                                        [],
                                                                                    more_players:
                                                                                        [],
                                                                                    total_players: 0,
                                                                                    ...ev.participant_previews,
                                                                                };
                                                                            const allPlayers =
                                                                                [
                                                                                    ...participantPreviews.players,
                                                                                    ...participantPreviews.more_players,
                                                                                ];
                                                                            const isTeamEvent =
                                                                                ev.event_type ===
                                                                                'team';
                                                                            const eventMedals =
                                                                                ev.medals_by_type ??
                                                                                ZERO_MEDAL_COUNTS;
                                                                            const playerRows =
                                                                                allPlayers.length >
                                                                                0
                                                                                    ? allPlayers
                                                                                    : [
                                                                                          {
                                                                                              id: -ev.id,
                                                                                              full_name:
                                                                                                  t(
                                                                                                      'No participants',
                                                                                                  ),
                                                                                              pno: null,
                                                                                              medals_by_type:
                                                                                                  ZERO_MEDAL_COUNTS,
                                                                                          },
                                                                                      ];
                                                                            const participantCount =
                                                                                participantPreviews.total_players >
                                                                                0
                                                                                    ? participantPreviews.total_players
                                                                                    : ev.participations_count;

                                                                            return (
                                                                                <Fragment
                                                                                    key={`event-${ev.id}`}
                                                                                >
                                                                                    {playerRows.map(
                                                                                        (
                                                                                            player,
                                                                                            playerIndex,
                                                                                        ) => {
                                                                                            const isFirstPlayerRow =
                                                                                                playerIndex ===
                                                                                                0;
                                                                                            const rowMedals =
                                                                                                isTeamEvent
                                                                                                    ? eventMedals
                                                                                                    : (player.medals_by_type ??
                                                                                                      ZERO_MEDAL_COUNTS);
                                                                                            const rowTotalMedals =
                                                                                                isTeamEvent
                                                                                                    ? ev.medals_count
                                                                                                    : medalCountTotal(
                                                                                                          rowMedals,
                                                                                                      );
                                                                                            const playableEvent =
                                                                                                player
                                                                                                    .sport_profile
                                                                                                    ?.sport_event;

                                                                                            return (
                                                                                                <TableRow
                                                                                                    key={`event-${ev.id}-player-${player.id}-${playerIndex}`}
                                                                                                    className="align-top"
                                                                                                >
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="w-14 px-2 py-1.5 text-[11px] text-muted-foreground tabular-nums align-top"
                                                                                                        >
                                                                                                            {
                                                                                                                eventSerialNumber
                                                                                                            }
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="min-w-56 px-2 py-1.5 align-top"
                                                                                                        >
                                                                                                            <div className="space-y-1">
                                                                                                                <Link
                                                                                                                    href={showEvent.url(
                                                                                                                        {
                                                                                                                            tournament:
                                                                                                                                tournament.id,
                                                                                                                            event: ev.id,
                                                                                                                        },
                                                                                                                    )}
                                                                                                                    className="font-medium leading-snug hover:underline"
                                                                                                                >
                                                                                                                    {
                                                                                                                        label.title
                                                                                                                    }
                                                                                                                </Link>
                                                                                                                {label.fallbackName ? (
                                                                                                                    <p className="text-xs text-muted-foreground">
                                                                                                                        {
                                                                                                                            label.fallbackName
                                                                                                                        }
                                                                                                                    </p>
                                                                                                                ) : null}
                                                                                                            </div>
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                    <TableCell className="w-20 whitespace-nowrap px-2 py-1.5 text-[11px] text-muted-foreground tabular-nums">
                                                                                                        {player.pno ??
                                                                                                            '—'}
                                                                                                    </TableCell>
                                                                                                    <TableCell className="w-32 px-2 py-1.5">
                                                                                                        <span
                                                                                                            className={
                                                                                                                player.rank
                                                                                                                    ? 'font-medium text-foreground'
                                                                                                                    : 'text-muted-foreground'
                                                                                                            }
                                                                                                        >
                                                                                                            {player.rank ??
                                                                                                                '—'}
                                                                                                        </span>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="min-w-40 px-2 py-1.5">
                                                                                                        <span
                                                                                                            className={
                                                                                                                allPlayers.length >
                                                                                                                0
                                                                                                                    ? 'font-medium text-foreground'
                                                                                                                    : 'text-muted-foreground'
                                                                                                            }
                                                                                                        >
                                                                                                            {
                                                                                                                player.full_name
                                                                                                            }
                                                                                                        </span>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="w-36 px-2 py-1.5 text-muted-foreground">
                                                                                                        {playableEvent ??
                                                                                                            '—'}
                                                                                                    </TableCell>
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="w-20 px-2 py-1.5 align-top"
                                                                                                        >
                                                                                                            <span
                                                                                                                className={eventBadgeClass(
                                                                                                                    'class',
                                                                                                                )}
                                                                                                            >
                                                                                                                {genderClassLabel(
                                                                                                                    ev.gender_class,
                                                                                                                    t,
                                                                                                                )}
                                                                                                            </span>
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="w-20 px-2 py-1.5 align-top"
                                                                                                        >
                                                                                                            <span
                                                                                                                className={eventBadgeClass(
                                                                                                                    'detail',
                                                                                                                )}
                                                                                                            >
                                                                                                                {ev.event_type ===
                                                                                                                'team'
                                                                                                                    ? t(
                                                                                                                          'Team',
                                                                                                                      )
                                                                                                                    : t(
                                                                                                                          'Individual',
                                                                                                                      )}
                                                                                                            </span>
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="w-20 px-2 py-1.5 text-right align-top"
                                                                                                        >
                                                                                                            <span
                                                                                                                className={eventBadgeClass(
                                                                                                                    'count',
                                                                                                                )}
                                                                                                            >
                                                                                                                <Users className="h-3.5 w-3.5" />
                                                                                                                {
                                                                                                                    participantCount
                                                                                                                }
                                                                                                            </span>
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                    {isTeamEvent ? (
                                                                                                        isFirstPlayerRow ? (
                                                                                                            <>
                                                                                                                <TableCell
                                                                                                                    rowSpan={
                                                                                                                        playerRows.length
                                                                                                                    }
                                                                                                                    className="w-12 px-2 py-1.5 text-right tabular-nums align-top"
                                                                                                                >
                                                                                                                    <span className="text-amber-600">
                                                                                                                        {
                                                                                                                            rowMedals.gold
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                </TableCell>
                                                                                                                <TableCell
                                                                                                                    rowSpan={
                                                                                                                        playerRows.length
                                                                                                                    }
                                                                                                                    className="w-12 px-2 py-1.5 text-right tabular-nums align-top"
                                                                                                                >
                                                                                                                    {
                                                                                                                        rowMedals.silver
                                                                                                                    }
                                                                                                                </TableCell>
                                                                                                                <TableCell
                                                                                                                    rowSpan={
                                                                                                                        playerRows.length
                                                                                                                    }
                                                                                                                    className="w-12 px-2 py-1.5 text-right tabular-nums align-top"
                                                                                                                >
                                                                                                                    {
                                                                                                                        rowMedals.bronze
                                                                                                                    }
                                                                                                                </TableCell>
                                                                                                                <TableCell
                                                                                                                    rowSpan={
                                                                                                                        playerRows.length
                                                                                                                    }
                                                                                                                    className="w-12 px-2 py-1.5 text-right tabular-nums align-top"
                                                                                                                >
                                                                                                                    <span className="text-emerald-700 dark:text-emerald-300">
                                                                                                                        {
                                                                                                                            rowMedals.merit
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                </TableCell>
                                                                                                                <TableCell
                                                                                                                    rowSpan={
                                                                                                                        playerRows.length
                                                                                                                    }
                                                                                                                    className="w-14 px-2 py-1.5 text-right tabular-nums align-top"
                                                                                                                >
                                                                                                                    <span className="font-semibold">
                                                                                                                        {
                                                                                                                            rowTotalMedals
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                </TableCell>
                                                                                                            </>
                                                                                                        ) : null
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <TableCell className="w-12 px-2 py-1.5 text-right tabular-nums">
                                                                                                                <span className="text-amber-600">
                                                                                                                    {
                                                                                                                        rowMedals.gold
                                                                                                                    }
                                                                                                                </span>
                                                                                                            </TableCell>
                                                                                                            <TableCell className="w-12 px-2 py-1.5 text-right tabular-nums">
                                                                                                                {
                                                                                                                    rowMedals.silver
                                                                                                                }
                                                                                                            </TableCell>
                                                                                                            <TableCell className="w-12 px-2 py-1.5 text-right tabular-nums">
                                                                                                                {
                                                                                                                    rowMedals.bronze
                                                                                                                }
                                                                                                            </TableCell>
                                                                                                            <TableCell className="w-12 px-2 py-1.5 text-right tabular-nums">
                                                                                                                <span className="text-emerald-700 dark:text-emerald-300">
                                                                                                                    {
                                                                                                                        rowMedals.merit
                                                                                                                    }
                                                                                                                </span>
                                                                                                            </TableCell>
                                                                                                            <TableCell className="w-14 px-2 py-1.5 text-right tabular-nums">
                                                                                                                <span className="font-semibold">
                                                                                                                    {
                                                                                                                        rowTotalMedals
                                                                                                                    }
                                                                                                                </span>
                                                                                                            </TableCell>
                                                                                                        </>
                                                                                                    )}
                                                                                                    {isFirstPlayerRow ? (
                                                                                                        <TableCell
                                                                                                            rowSpan={
                                                                                                                playerRows.length
                                                                                                            }
                                                                                                            className="sticky right-0 z-10 w-0 bg-card px-1.5 py-1 align-top"
                                                                                                        >
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
                                                                                                    ) : null}
                                                                                                </TableRow>
                                                                                            );
                                                                                        },
                                                                                    )}
                                                                                </Fragment>
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
