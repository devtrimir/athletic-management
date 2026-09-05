import { router, useForm } from '@inertiajs/react';
import {
    Award,
    CalendarDays,
    MapPin,
    Pencil,
    Plus,
    Trophy,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    store as storePlayingAchievement,
    update as updatePlayingAchievement,
    destroy as destroyPlayingAchievement,
} from '@/actions/App/Http/Controllers/CoachPlayingAchievementController';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

const PLAYING_PERIODS = ['PRE_RECRUITMENT', 'POST_RECRUITMENT'] as const;

const FALLBACK_LEVELS = [
    'INTERNATIONAL',
    'NATIONAL',
    'AIPSC',
    'STATE',
    'ZONAL',
    'OTHER',
] as const;

const MEDAL_TYPES = [
    'GOLD',
    'SILVER',
    'BRONZE',
    'MERIT',
    'CERTIFICATE',
] as const;

export type PlayingAchievementRow = {
    id: number;
    title: string;
    period: string | null;
    level: string | null;
    competition_details: string | null;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string | null;
    medal_type: string | null;
    position: number | null;
    description: string | null;
    achieved_on: string | null;
    remarks: string | null;
};

export type PlayingAchievementsData = {
    records: PlayingAchievementRow[];
    summary: {
        total: number;
        medals: number;
    };
};

type PlayingAchievementFormData = {
    title: string;
    period: string;
    level: string;
    competition_details: string;
    event_date: string;
    venue: string;
    sport_discipline: string;
    event: string;
    medal_type: string;
    position: string;
    achieved_on: string;
    remarks: string;
};

type PlayingAchievementFormErrors = Partial<
    Record<keyof PlayingAchievementFormData, string>
>;

function defaults(row?: PlayingAchievementRow): PlayingAchievementFormData {
    return {
        title: row?.title ?? '',
        period: row?.period ?? 'PRE_RECRUITMENT',
        level: row?.level ?? 'NATIONAL',
        competition_details: row?.competition_details ?? '',
        event_date: row?.event_date ?? '',
        venue: row?.venue ?? '',
        sport_discipline: row?.sport_discipline ?? '',
        event: row?.event ?? '',
        medal_type: row?.medal_type ?? '',
        position:
            row?.position !== null && row?.position !== undefined
                ? String(row.position)
                : '',
        achieved_on: row?.achieved_on ?? '',
        remarks: row?.remarks ?? '',
    };
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function periodLabel(value: string | null, t: (key: string) => string): string {
    switch (value) {
        case 'PRE_RECRUITMENT':
            return t('Pre-recruitment');
        case 'POST_RECRUITMENT':
            return t('Post-recruitment');
        default:
            return value ?? '—';
    }
}

function medalBadgeClass(medal: string | null): string {
    switch (medal) {
        case 'GOLD':
            return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
        case 'SILVER':
            return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-900/60 dark:bg-slate-950/40 dark:text-slate-300';
        case 'BRONZE':
            return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300';
        case 'MERIT':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300';
        default:
            return 'border-border bg-muted/40 text-muted-foreground';
    }
}

function isValidIsoDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return false;
    }

    const [, year, month, day] = match;
    const yearNumber = Number(year);
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    const date = new Date(yearNumber, monthNumber - 1, dayNumber);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return (
        date.getFullYear() === yearNumber &&
        date.getMonth() === monthNumber - 1 &&
        date.getDate() === dayNumber
    );
}

function normalizeDateInput(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    if (isValidIsoDate(trimmed)) {
        return trimmed;
    }

    const match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);

    if (!match) {
        return null;
    }

    const [, day, month, year] = match;
    const normalized = `${year}-${month}-${day}`;

    return isValidIsoDate(normalized) ? normalized : null;
}

function PlayingAchievementDialog({
    coach,
    row,
}: {
    coach: { id: number };
    row?: PlayingAchievementRow;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [visibleErrors, setVisibleErrors] =
        useState<PlayingAchievementFormErrors>({});
    const form = useForm<PlayingAchievementFormData>(defaults(row));
    const dialogOpen = open || Object.keys(visibleErrors).length > 0;

    function reset(): void {
        form.setData(defaults(row));
        form.clearErrors();
        setVisibleErrors({});
    }

    function clearFieldError(field: keyof PlayingAchievementFormData): void {
        if (visibleErrors[field]) {
            setVisibleErrors((current) => {
                const next = { ...current };
                delete next[field];

                return next;
            });
        }

        form.clearErrors(field);
    }

    function submit(event: React.FormEvent): void {
        event.preventDefault();
        const title = form.data.title.trim();
        const eventDate = normalizeDateInput(form.data.event_date);
        const achievedOn = normalizeDateInput(form.data.achieved_on);
        const clientErrors: PlayingAchievementFormErrors = {};

        form.clearErrors('title', 'event_date', 'achieved_on');
        setVisibleErrors({});

        if (!title) {
            clientErrors.title = t('Title is required.');
        }

        if (eventDate === null) {
            clientErrors.event_date = t(
                'Enter a valid date in dd/mm/yyyy format.',
            );
        }

        if (achievedOn === null) {
            clientErrors.achieved_on = t(
                'Enter a valid date in dd/mm/yyyy format.',
            );
        }

        if (Object.keys(clientErrors).length > 0) {
            form.setError(clientErrors);
            setVisibleErrors(clientErrors);
            setOpen(true);

            return;
        }

        const options = {
            preserveScroll: true,
            preserveState: (page: {
                props: { errors?: Record<string, string> };
            }) => Object.keys(page.props.errors ?? {}).length > 0,
            onError: (errors: Record<string, string>) => {
                form.setError(errors as PlayingAchievementFormErrors);
                setVisibleErrors(errors as PlayingAchievementFormErrors);
                setOpen(true);
            },
            onSuccess: () => {
                setOpen(false);
                setVisibleErrors({});

                if (!row) {
                    form.setData(defaults());
                }
            },
        };

        const payload = {
            ...form.data,
            title,
            event_date: eventDate ?? '',
            achieved_on: achievedOn ?? '',
            position: form.data.position.trim(),
        };

        if (row) {
            form.transform(() => ({ ...payload, _method: 'PATCH' }));
            form.post(
                updatePlayingAchievement.url({
                    coach,
                    playingAchievement: row,
                }),
                options,
            );

            return;
        }

        form.transform(() => payload);
        form.post(storePlayingAchievement.url(coach), options);
    }

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    reset();
                }
            }}
        >
            <DialogTrigger asChild>
                {row ? (
                    <Button size="icon" variant="ghost" className="size-8">
                        <Pencil className="size-4" />
                        <span className="sr-only">{t('Edit')}</span>
                    </Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-1.5 size-4" />
                        {t('Add playing career achievement')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent
                className="w-[calc(100vw-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto px-4 sm:px-6"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>
                        {row
                            ? t('Edit playing career achievement')
                            : t('Add playing career achievement')}
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={submit}
                    className="mt-2 min-w-0 space-y-4"
                    noValidate
                >
                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Period')}</Label>
                            <Select
                                value={form.data.period}
                                onValueChange={(value) => {
                                    form.setData('period', value);
                                    clearFieldError('period');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLAYING_PERIODS.map((period) => (
                                        <SelectItem key={period} value={period}>
                                            {periodLabel(period, t)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={visibleErrors.period} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>
                                {t('Level')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.data.level}
                                onValueChange={(value) => {
                                    form.setData('level', value);
                                    clearFieldError('level');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FALLBACK_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {t(level)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={visibleErrors.level} />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label
                            htmlFor={`playing-achievement-title-${row?.id ?? 'new'}`}
                        >
                            {t('Title')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`playing-achievement-title-${row?.id ?? 'new'}`}
                            required
                            aria-invalid={Boolean(visibleErrors.title)}
                            aria-describedby={`playing-achievement-title-error-${row?.id ?? 'new'}`}
                            value={form.data.title}
                            onChange={(event) => {
                                form.setData('title', event.target.value);
                                clearFieldError('title');
                            }}
                            maxLength={150}
                            placeholder={t(
                                'Example: All India Police Sports Meet',
                            )}
                        />
                        <InputError
                            id={`playing-achievement-title-error-${row?.id ?? 'new'}`}
                            message={visibleErrors.title}
                        />
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label>{t('Competition details')}</Label>
                        <Textarea
                            value={form.data.competition_details}
                            onChange={(event) => {
                                form.setData(
                                    'competition_details',
                                    event.target.value,
                                );
                                clearFieldError('competition_details');
                            }}
                            rows={2}
                        />
                        <InputError
                            message={visibleErrors.competition_details}
                        />
                    </div>

                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label
                                htmlFor={`playing-achievement-event-date-${row?.id ?? 'new'}`}
                            >
                                {t('Event date')}
                            </Label>
                            <DatePicker
                                id={`playing-achievement-event-date-${row?.id ?? 'new'}`}
                                value={form.data.event_date}
                                onChange={(value) => {
                                    form.setData('event_date', value);

                                    clearFieldError('event_date');
                                }}
                                aria-invalid={Boolean(visibleErrors.event_date)}
                                aria-describedby={`playing-achievement-event-date-error-${row?.id ?? 'new'}`}
                            />
                            <InputError
                                id={`playing-achievement-event-date-error-${row?.id ?? 'new'}`}
                                message={visibleErrors.event_date}
                            />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label
                                htmlFor={`playing-achievement-achieved-on-${row?.id ?? 'new'}`}
                            >
                                {t('Achieved on')}
                            </Label>
                            <DatePicker
                                id={`playing-achievement-achieved-on-${row?.id ?? 'new'}`}
                                value={form.data.achieved_on}
                                onChange={(value) => {
                                    form.setData('achieved_on', value);

                                    clearFieldError('achieved_on');
                                }}
                                aria-invalid={Boolean(
                                    visibleErrors.achieved_on,
                                )}
                                aria-describedby={`playing-achievement-achieved-on-error-${row?.id ?? 'new'}`}
                            />
                            <InputError
                                id={`playing-achievement-achieved-on-error-${row?.id ?? 'new'}`}
                                message={visibleErrors.achieved_on}
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Venue')}</Label>
                            <Input
                                value={form.data.venue}
                                onChange={(event) => {
                                    form.setData('venue', event.target.value);
                                    clearFieldError('venue');
                                }}
                                maxLength={255}
                            />
                            <InputError message={visibleErrors.venue} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Sport discipline')}</Label>
                            <Input
                                value={form.data.sport_discipline}
                                onChange={(event) => {
                                    form.setData(
                                        'sport_discipline',
                                        event.target.value,
                                    );
                                    clearFieldError('sport_discipline');
                                }}
                                maxLength={100}
                            />
                            <InputError
                                message={visibleErrors.sport_discipline}
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Event')}</Label>
                            <Input
                                value={form.data.event}
                                onChange={(event) => {
                                    form.setData('event', event.target.value);
                                    clearFieldError('event');
                                }}
                                maxLength={100}
                            />
                            <InputError message={visibleErrors.event} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Medal')}</Label>
                            <Select
                                value={form.data.medal_type || 'none'}
                                onValueChange={(value) => {
                                    form.setData(
                                        'medal_type',
                                        value === 'none' ? '' : value,
                                    );
                                    clearFieldError('medal_type');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        {t('None')}
                                    </SelectItem>
                                    {MEDAL_TYPES.map((medal) => (
                                        <SelectItem key={medal} value={medal}>
                                            {t(medal)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={visibleErrors.medal_type} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Position')}</Label>
                            <Input
                                type="number"
                                min={1}
                                max={9999}
                                value={form.data.position}
                                onChange={(event) => {
                                    form.setData(
                                        'position',
                                        event.target.value,
                                    );
                                    clearFieldError('position');
                                }}
                            />
                            <InputError message={visibleErrors.position} />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Textarea
                            value={form.data.remarks}
                            onChange={(event) => {
                                form.setData('remarks', event.target.value);
                                clearFieldError('remarks');
                            }}
                            rows={3}
                        />
                        <InputError message={visibleErrors.remarks} />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {row ? t('Update') : t('Save')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function CoachPlayingAchievementsSection({
    coach,
    data,
}: {
    coach: { id: number };
    data: PlayingAchievementsData | undefined;
}) {
    const { t } = useTranslation();
    const records = data?.records ?? [];
    const total = data?.summary.total ?? 0;
    const medals = data?.summary.medals ?? 0;

    return (
        <div className="space-y-5 border-t pt-5">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                            <Trophy className="size-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">
                                {t('Playing career achievements')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Medals and positions earned by the coach while still a player, separate from all medal tallies.',
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-5 sm:justify-end">
                    <div className="text-right">
                        <div className="text-xs font-medium text-muted-foreground">
                            {t('Total')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {total}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-medium text-muted-foreground">
                            {t('Medals')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {medals}
                        </div>
                    </div>
                    <PlayingAchievementDialog coach={coach} />
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="rounded-full bg-muted p-3 text-muted-foreground">
                            <Trophy className="size-6" />
                        </div>
                        <h4 className="mt-4 text-sm font-semibold">
                            {t('No playing career achievements recorded')}
                        </h4>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {t(
                                'Add medals, positions, or certificates the coach earned as a player here.',
                            )}
                        </p>
                        <div className="mt-5">
                            <PlayingAchievementDialog coach={coach} />
                        </div>
                    </div>
                ) : (
                    <div className="divide-y">
                        {records.map((row) => (
                            <div
                                key={row.id}
                                className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                            >
                                <div className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {row.medal_type ? (
                                            <Badge
                                                variant="outline"
                                                className={`gap-1.5 ${medalBadgeClass(row.medal_type)}`}
                                            >
                                                <Award className="size-3.5" />
                                                {t(row.medal_type)}
                                            </Badge>
                                        ) : null}
                                        {row.level ? (
                                            <Badge variant="outline">
                                                {t(row.level)}
                                            </Badge>
                                        ) : null}
                                        {row.period ? (
                                            <Badge variant="secondary">
                                                {periodLabel(row.period, t)}
                                            </Badge>
                                        ) : null}
                                        {row.venue ? (
                                            <Badge
                                                variant="secondary"
                                                className="gap-1.5"
                                            >
                                                <MapPin className="size-3" />
                                                {row.venue}
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <div>
                                        <h4 className="text-base leading-6 font-semibold">
                                            {row.title}
                                        </h4>
                                        {row.competition_details ? (
                                            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                                {row.competition_details}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="flex gap-2">
                                            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Event date')}
                                                </div>
                                                <div>
                                                    {formatDate(row.event_date)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Trophy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Event')}
                                                </div>
                                                <div className="truncate">
                                                    {[
                                                        row.sport_discipline,
                                                        row.event,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') || '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Award className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Position')}
                                                </div>
                                                <div>
                                                    {row.position !== null
                                                        ? `#${row.position}`
                                                        : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Achieved on')}
                                                </div>
                                                <div>
                                                    {formatDate(
                                                        row.achieved_on,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {row.remarks ? (
                                        <p className="max-w-3xl text-sm text-muted-foreground">
                                            {row.remarks}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex items-center justify-end gap-1 lg:items-start">
                                    <PlayingAchievementDialog
                                        coach={coach}
                                        row={row}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 text-destructive hover:text-destructive"
                                        onClick={() =>
                                            router.delete(
                                                destroyPlayingAchievement.url({
                                                    coach,
                                                    playingAchievement: row,
                                                }),
                                                {
                                                    preserveScroll: true,
                                                    preserveState: (page: {
                                                        props: {
                                                            errors?: Record<
                                                                string,
                                                                string
                                                            >;
                                                        };
                                                    }) =>
                                                        Object.keys(
                                                            page.props.errors ??
                                                                {},
                                                        ).length > 0,
                                                },
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">
                                            {t('Delete')}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
