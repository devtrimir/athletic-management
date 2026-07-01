import { router, useForm } from '@inertiajs/react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
    store as storeBenefit,
    destroy as destroyBenefit,
} from '@/actions/App/Http/Controllers/AchievementBenefitController';
import {
    store as storeAchievement,
    update as updateAchievement,
    destroy as destroyAchievement,
} from '@/actions/App/Http/Controllers/MemberLegacyAchievementController';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

type Benefit = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

type LegacyAchievement = {
    id: number;
    period: string;
    session: { id: number; name: string } | null;
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport_id: number | null;
    sport: { id: number; name: string } | null;
    sport_discipline: string | null;
    event: string | null;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string | null;
    medal_type: string | null;
    position: number | null;
    sort_order: number | null;
    remarks: string | null;
    benefits: Benefit[];
};

type Props = {
    member: { id: number };
    sessions: Array<{ id: number; name: string; is_current?: boolean }>;
    sports: Array<{ id: number; name: string }>;
    legacyAchievements: LegacyAchievement[] | undefined;
    showActions?: boolean;
    postRecruitmentContent?: ReactNode;
    supplementaryNoPadding?: boolean;
    hidePostRecruitmentRows?: boolean;
};

const MEDAL_VARIANT: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    GOLD: 'default',
    SILVER: 'secondary',
    BRONZE: 'outline',
    MERIT: 'outline',
    CERTIFICATE: 'outline',
};

const LEVELS = [
    'INTERNATIONAL',
    'NATIONAL',
    'AIPSC',
    'STATE',
    'ZONAL',
    'OTHER',
] as const;
const MEDALS = ['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'] as const;
const BENEFIT_TYPES = [
    'PROMOTION',
    'OUT_OF_TURN_PROMOTION',
    'CASH_AWARD',
    'COMMENDATION',
    'NONE',
    'OTHER',
] as const;

const LEVEL_ITEMS: ComboboxItem[] = LEVELS.map((level) => ({
    value: level,
    label: level,
}));

const MEDAL_ITEMS: ComboboxItem[] = MEDALS.map((medal) => ({
    value: medal,
    label: medal,
}));

const MEDAL_POSITION_MAP: Partial<Record<(typeof MEDALS)[number], string>> = {
    GOLD: '1',
    SILVER: '2',
    BRONZE: '3',
};

const GENDER_CLASS_ITEMS: ComboboxItem[] = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'MIXED', label: 'MIXED' },
    { value: 'OPEN', label: 'OPEN' },
];

type AchievementFormData = {
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT';
    session_id: string;
    level: string;
    competition_details: string;
    event_date: string;
    venue: string;
    sport_id: string;
    sport_discipline: string;
    event: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
    medal_type: string;
    position: string;
    remarks: string;
};

type AchievementDraft = {
    data: AchievementFormData;
    sourceLabel: string;
    updatedAt: string;
};

const ACHIEVEMENT_DRAFT_EVENT = 'achievement-draft-changed';
const achievementDraftSnapshotCache = new Map<
    string,
    { raw: string | null; draft: AchievementDraft | null }
>();

function buildAddAchievementDefaults(
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT',
): AchievementFormData {
    return {
        period,
        session_id: '',
        level: '',
        competition_details: '',
        event_date: '',
        venue: '',
        sport_id: '',
        sport_discipline: '',
        event: '',
        discipline: '',
        weight_category: '',
        gender_class: '',
        medal_type: '',
        position: '',
        remarks: '',
    };
}

function buildEditAchievementDefaults(
    achievement: LegacyAchievement,
): AchievementFormData {
    return {
        period: achievement.period as 'PRE_RECRUITMENT' | 'POST_RECRUITMENT',
        session_id: achievement.session ? String(achievement.session.id) : '',
        level: achievement.level,
        competition_details: achievement.competition_details,
        event_date: achievement.event_date ?? '',
        venue: achievement.venue ?? '',
        sport_id: achievement.sport ? String(achievement.sport.id) : '',
        sport_discipline: achievement.sport_discipline ?? '',
        event: achievement.event ?? '',
        discipline: achievement.discipline ?? '',
        weight_category: achievement.weight_category ?? '',
        gender_class: achievement.gender_class ?? '',
        medal_type: achievement.medal_type ?? '',
        position: achievement.position ? String(achievement.position) : '',
        remarks: achievement.remarks ?? '',
    };
}

function isAchievementDraftEmpty(data: AchievementFormData): boolean {
    return (
        !data.session_id &&
        !data.level &&
        !data.competition_details.trim() &&
        !data.event_date &&
        !data.venue.trim() &&
        !data.sport_id &&
        !data.sport_discipline.trim() &&
        !data.event.trim() &&
        !data.discipline.trim() &&
        !data.weight_category.trim() &&
        !data.gender_class &&
        !data.medal_type &&
        !data.position &&
        !data.remarks.trim()
    );
}

function readAchievementDraft(key: string): AchievementDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(key);
        const cached = achievementDraftSnapshotCache.get(key);

        if (cached && cached.raw === raw) {
            return cached.draft;
        }

        if (!raw) {
            achievementDraftSnapshotCache.set(key, { raw: null, draft: null });

            return null;
        }

        const parsed = JSON.parse(raw) as AchievementDraft;

        if (!parsed?.data || !parsed?.updatedAt || !parsed?.sourceLabel) {
            achievementDraftSnapshotCache.set(key, { raw, draft: null });

            return null;
        }

        achievementDraftSnapshotCache.set(key, { raw, draft: parsed });

        return parsed;
    } catch {
        achievementDraftSnapshotCache.set(key, { raw: null, draft: null });

        return null;
    }
}

function writeAchievementDraft(key: string, draft: AchievementDraft): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(key, JSON.stringify(draft));
    window.dispatchEvent(
        new CustomEvent(ACHIEVEMENT_DRAFT_EVENT, { detail: key }),
    );
}

function removeAchievementDraft(key: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(key);
    window.dispatchEvent(
        new CustomEvent(ACHIEVEMENT_DRAFT_EVENT, { detail: key }),
    );
}

function subscribeToAchievementDraft(
    key: string,
    onStoreChange: () => void,
): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleStorage = (event: StorageEvent): void => {
        if (event.key === key) {
            onStoreChange();
        }
    };

    const handleCustomEvent = (event: Event): void => {
        const detail = (event as CustomEvent<string>).detail;

        if (detail === key) {
            onStoreChange();
        }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(
        ACHIEVEMENT_DRAFT_EVENT,
        handleCustomEvent as EventListener,
    );

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(
            ACHIEVEMENT_DRAFT_EVENT,
            handleCustomEvent as EventListener,
        );
    };
}

function useAchievementDraft(key: string): AchievementDraft | null {
    return useSyncExternalStore(
        (onStoreChange) => subscribeToAchievementDraft(key, onStoreChange),
        () => readAchievementDraft(key),
        () => null,
    );
}

function formatDraftTimestamp(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatReadableDate(value: string | null): string | null {
    if (!value) {
        return null;
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

function inferPositionFromMedal(medalType: string): string {
    return (
        MEDAL_POSITION_MAP[medalType as keyof typeof MEDAL_POSITION_MAP] ?? ''
    );
}

export function AddAchievementDialog({
    member,
    period,
    sessions,
    sports,
    triggerLabel,
    triggerVariant = 'outline',
    subjectName,
}: {
    member: { id: number };
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT';
    sessions: Array<{ id: number; name: string; is_current?: boolean }>;
    sports: Array<{ id: number; name: string }>;
    triggerLabel?: string;
    triggerVariant?: 'default' | 'outline' | 'ghost';
    subjectName?: string;
}) {
    const { t } = useTranslation();
    const baseDialogTitle =
        period === 'PRE_RECRUITMENT'
            ? t('Add pre-recruitment legacy achievement')
            : t('Add post-recruitment legacy achievement');
    const [open, setOpen] = useState(false);
    const dialogTitle = subjectName
        ? `${baseDialogTitle} - ${subjectName}`
        : baseDialogTitle;
    const sourceLabel =
        period === 'POST_RECRUITMENT'
            ? t('Post-recruitment section')
            : t('Pre-recruitment section');
    const draftKey = `member-achievement-draft:add:${member.id}:${period}`;
    const sessionItems: ComboboxItem[] = sessions.map((session) => ({
        value: String(session.id),
        label: session.name,
        badge: session.is_current ? t('Current') : undefined,
    }));
    const defaults = useMemo(
        () => buildAddAchievementDefaults(period),
        [period],
    );
    const draftMeta = useAchievementDraft(draftKey);
    const [restoredDraft, setRestoredDraft] = useState<AchievementDraft | null>(
        null,
    );
    const form = useForm(defaults);
    const dialogOpen = open || Object.keys(form.errors).length > 0;

    useEffect(() => {
        if (!open) {
            return;
        }

        if (isAchievementDraftEmpty(form.data)) {
            return;
        }

        const nextDraft = {
            data: form.data,
            sourceLabel,
            updatedAt: new Date().toISOString(),
        };

        writeAchievementDraft(draftKey, nextDraft);
    }, [draftKey, form.data, open, sourceLabel]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form.data.event_date.trim()) {
            form.setError('event_date', t('Event date is required.'));
            setOpen(true);

            return;
        }

        form.post(storeAchievement.url(member), {
            preserveScroll: true,
            preserveState: true,
            onError: () => {
                setOpen(true);
            },
            onSuccess: () => {
                removeAchievementDraft(draftKey);
                setRestoredDraft(null);
                setOpen(false);
                form.reset();
                form.setData('period', period);
            },
        });
    }

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    form.clearErrors();
                    setRestoredDraft(null);

                    return;
                }

                const savedDraft = readAchievementDraft(draftKey);

                if (savedDraft) {
                    form.setData(savedDraft.data);
                    setRestoredDraft(savedDraft);
                } else {
                    setRestoredDraft(null);
                }
            }}
        >
            <div className="flex items-center gap-2">
                <DialogTrigger asChild>
                    <Button variant={triggerVariant} size="sm">
                        <Plus className="mr-1 size-4" />
                        {triggerLabel ?? t('Add achievement')}
                    </Button>
                </DialogTrigger>
                {draftMeta ? (
                    <Badge variant="outline" className="text-[11px]">
                        {t('Draft saved')}
                    </Badge>
                ) : null}
            </div>
            <DialogContent
                className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <div className="border-b px-6 py-5">
                        <DialogTitle className="text-base font-semibold">
                            {dialogTitle}
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                        {restoredDraft ? (
                            <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                        {t('Local draft restored')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Draft resumed from :source. Saved :time.',
                                        )
                                            .replace(
                                                ':source',
                                                restoredDraft.sourceLabel,
                                            )
                                            .replace(
                                                ':time',
                                                formatDraftTimestamp(
                                                    restoredDraft.updatedAt,
                                                ),
                                            )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => {
                                        removeAchievementDraft(draftKey);
                                        setRestoredDraft(null);
                                        form.setData(defaults);
                                        form.clearErrors();
                                    }}
                                >
                                    {t('Discard draft')}
                                </Button>
                            </div>
                        ) : null}
                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Tournament information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Keep the old competition details lightweight and record only what is available.',
                                    )}
                                </p>
                            </div>

                            {period === 'POST_RECRUITMENT' ? (
                                <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Session')}</Label>
                                        <Combobox
                                            value={form.data.session_id}
                                            onValueChange={(value) =>
                                                form.setData(
                                                    'session_id',
                                                    value,
                                                )
                                            }
                                            items={sessionItems}
                                            placeholder={t('Select session')}
                                            searchPlaceholder={t(
                                                'Search sessions…',
                                            )}
                                            emptyMessage={t(
                                                'No sessions found.',
                                            )}
                                            className="bg-background"
                                        />
                                        <InputError
                                            message={form.errors.session_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>
                                            {t('Tier / Level')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Combobox
                                            value={form.data.level}
                                            onValueChange={(value) =>
                                                form.setData('level', value)
                                            }
                                            items={LEVEL_ITEMS.map((item) => ({
                                                ...item,
                                                label: t(item.label),
                                            }))}
                                            placeholder={t('Select tier')}
                                            searchPlaceholder={t(
                                                'Search levels…',
                                            )}
                                            emptyMessage={t('No levels found.')}
                                            className="bg-background"
                                        />
                                        <InputError
                                            message={form.errors.level}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>
                                        {t('Level')}{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Combobox
                                        value={form.data.level}
                                        onValueChange={(value) =>
                                            form.setData('level', value)
                                        }
                                        items={LEVEL_ITEMS.map((item) => ({
                                            ...item,
                                            label: t(item.label),
                                        }))}
                                        placeholder={t('Select level')}
                                        searchPlaceholder={t('Search levels…')}
                                        emptyMessage={t('No levels found.')}
                                        className="bg-background"
                                    />
                                    <InputError message={form.errors.level} />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label>
                                    {period === 'POST_RECRUITMENT'
                                        ? t('Tournament')
                                        : t(
                                              'Tournament / competition details',
                                          )}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    value={form.data.competition_details}
                                    onChange={(e) =>
                                        form.setData(
                                            'competition_details',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                    className="bg-background"
                                    placeholder={
                                        period === 'POST_RECRUITMENT'
                                            ? t(
                                                  'Enter tournament name or source record',
                                              )
                                            : undefined
                                    }
                                />
                                <InputError
                                    message={form.errors.competition_details}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>
                                    {t('Event date')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <DatePicker
                                    value={form.data.event_date}
                                    onChange={(v) =>
                                        form.setData('event_date', v)
                                    }
                                    className="gap-2"
                                />
                                <InputError message={form.errors.event_date} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Venue')}</Label>
                                <Input
                                    value={form.data.venue}
                                    onChange={(e) =>
                                        form.setData('venue', e.target.value)
                                    }
                                    maxLength={255}
                                    className="bg-background"
                                />
                                <InputError message={form.errors.venue} />
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Sport & event information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Select the sport from master data, then add the specific event details for this record.',
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Sport')}</Label>
                                    <Combobox
                                        value={form.data.sport_id}
                                        onValueChange={(value) => {
                                            const selectedSport = sports.find(
                                                (sport) =>
                                                    String(sport.id) === value,
                                            );

                                            form.setData((current) => ({
                                                ...current,
                                                sport_id: value,
                                                sport_discipline:
                                                    selectedSport?.name ?? '',
                                            }));
                                        }}
                                        items={sports.map((sport) => ({
                                            value: String(sport.id),
                                            label: sport.name,
                                        }))}
                                        placeholder={t('Select sport')}
                                        searchPlaceholder={t('Search sports…')}
                                        emptyMessage={t('No sports found.')}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={
                                            form.errors.sport_id ??
                                            form.errors.sport_discipline
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Event name')}</Label>
                                    <Input
                                        value={form.data.event}
                                        onChange={(e) =>
                                            form.setData(
                                                'event',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        className="bg-background"
                                        placeholder={
                                            period === 'POST_RECRUITMENT'
                                                ? t('e.g. 100m sprint')
                                                : t('e.g. 100m sprint')
                                        }
                                    />
                                    <InputError message={form.errors.event} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Discipline')}</Label>
                                    <Input
                                        value={form.data.discipline}
                                        onChange={(e) =>
                                            form.setData(
                                                'discipline',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.discipline}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Gender class')}</Label>
                                    <Combobox
                                        value={form.data.gender_class}
                                        onValueChange={(value) =>
                                            form.setData('gender_class', value)
                                        }
                                        items={GENDER_CLASS_ITEMS.map(
                                            (item) => ({
                                                ...item,
                                                label: t(item.label),
                                            }),
                                        )}
                                        placeholder={t('Select gender class')}
                                        searchPlaceholder={t(
                                            'Search gender classes…',
                                        )}
                                        emptyMessage={t(
                                            'No gender classes found.',
                                        )}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.gender_class}
                                    />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>{t('Weight category')}</Label>
                                    <Input
                                        value={form.data.weight_category}
                                        onChange={(e) =>
                                            form.setData(
                                                'weight_category',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.weight_category}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Achievement information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Record only the result that is available for this legacy achievement.',
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Medal')}</Label>
                                    <Combobox
                                        value={form.data.medal_type}
                                        onValueChange={(value) =>
                                            form.setData((current) => ({
                                                ...current,
                                                medal_type: value,
                                                position:
                                                    inferPositionFromMedal(
                                                        value,
                                                    ),
                                            }))
                                        }
                                        items={[
                                            { value: '', label: t('No medal') },
                                            ...MEDAL_ITEMS.map((item) => ({
                                                ...item,
                                                label: t(item.label),
                                            })),
                                        ]}
                                        placeholder={t('Select medal')}
                                        searchPlaceholder={t('Search medals…')}
                                        emptyMessage={t('No medals found.')}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.medal_type}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('Position')}</Label>
                                    <Input
                                        value={form.data.position}
                                        className="bg-background"
                                        readOnly
                                        placeholder={t('Auto-set from medal')}
                                    />
                                    <InputError
                                        message={form.errors.position}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>{t('Remarks')}</Label>
                                <Textarea
                                    value={form.data.remarks}
                                    onChange={(e) =>
                                        form.setData('remarks', e.target.value)
                                    }
                                    rows={3}
                                    className="bg-background"
                                />
                                <InputError message={form.errors.remarks} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {t('Save achievement')}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddBenefitDialog({ achievement }: { achievement: LegacyAchievement }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        benefitable_type: 'member_legacy_achievement',
        benefitable_id: String(achievement.id),
        benefit_type: '',
        promoted_from_rank: '',
        promoted_to_rank: '',
        cash_amount: '',
        benefit_date: '',
        order_reference: '',
        remarks: '',
    });
    const dialogOpen = open || Object.keys(form.errors).length > 0;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeBenefit.url(), {
            preserveScroll: true,
            preserveState: true,
            onError: () => {
                setOpen(true);
            },
            onSuccess: () => {
                setOpen(false);
                form.reset();
                form.setData('benefitable_type', 'member_legacy_achievement');
                form.setData('benefitable_id', String(achievement.id));
            },
        });
    }

    const isPromotion =
        form.data.benefit_type === 'PROMOTION' ||
        form.data.benefit_type === 'OUT_OF_TURN_PROMOTION';
    const isCash = form.data.benefit_type === 'CASH_AWARD';

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    form.clearErrors();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="mr-1 size-3" />
                    {t('Add benefit')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add benefit')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                    <div className="grid gap-2">
                        <Label>
                            {t('Benefit type')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.data.benefit_type}
                            onValueChange={(v) =>
                                form.setData('benefit_type', v)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t('Select benefit type')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {BENEFIT_TYPES.map((bt) => (
                                    <SelectItem key={bt} value={bt}>
                                        {t(bt)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.benefit_type} />
                    </div>

                    {isPromotion && (
                        <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Promoted from rank')}</Label>
                                <Input
                                    value={form.data.promoted_from_rank}
                                    onChange={(e) =>
                                        form.setData(
                                            'promoted_from_rank',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={100}
                                />
                                <InputError
                                    message={form.errors.promoted_from_rank}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Promoted to rank')}</Label>
                                <Input
                                    value={form.data.promoted_to_rank}
                                    onChange={(e) =>
                                        form.setData(
                                            'promoted_to_rank',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={100}
                                />
                                <InputError
                                    message={form.errors.promoted_to_rank}
                                />
                            </div>
                        </div>
                    )}

                    {isCash && (
                        <div className="grid gap-2">
                            <Label>{t('Cash amount')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.cash_amount}
                                onChange={(e) =>
                                    form.setData('cash_amount', e.target.value)
                                }
                            />
                            <InputError message={form.errors.cash_amount} />
                        </div>
                    )}

                    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Benefit date')}</Label>
                            <DatePicker
                                value={form.data.benefit_date}
                                onChange={(v) =>
                                    form.setData('benefit_date', v)
                                }
                            />
                            <InputError message={form.errors.benefit_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input
                                value={form.data.order_reference}
                                onChange={(e) =>
                                    form.setData(
                                        'order_reference',
                                        e.target.value,
                                    )
                                }
                                maxLength={255}
                            />
                            <InputError message={form.errors.order_reference} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Textarea
                            value={form.data.remarks}
                            onChange={(e) =>
                                form.setData('remarks', e.target.value)
                            }
                            rows={2}
                        />
                        <InputError message={form.errors.remarks} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t('Save benefit')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function EditAchievementDialog({
    achievement,
    member,
    sessions,
    sports,
}: {
    achievement: LegacyAchievement;
    member: { id: number };
    sessions: Array<{ id: number; name: string; is_current?: boolean }>;
    sports: Array<{ id: number; name: string }>;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const draftKey = `member-achievement-draft:edit:${member.id}:${achievement.id}`;
    const sourceLabel =
        achievement.competition_details || t('Achievement record');
    const sessionItems: ComboboxItem[] = sessions.map((session) => ({
        value: String(session.id),
        label: session.name,
        badge: session.is_current ? t('Current') : undefined,
    }));
    const defaults = useMemo(
        () => buildEditAchievementDefaults(achievement),
        [achievement],
    );
    const draftMeta = useAchievementDraft(draftKey);
    const [restoredDraft, setRestoredDraft] = useState<AchievementDraft | null>(
        null,
    );
    const form = useForm(defaults);
    const dialogOpen = open || Object.keys(form.errors).length > 0;

    function resetForm(): void {
        form.setData(defaults);
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        const matchesDefaults =
            JSON.stringify(form.data) === JSON.stringify(defaults);

        if (matchesDefaults || isAchievementDraftEmpty(form.data)) {
            return;
        }

        const nextDraft = {
            data: form.data,
            sourceLabel,
            updatedAt: new Date().toISOString(),
        };

        writeAchievementDraft(draftKey, nextDraft);
    }, [defaults, draftKey, form.data, open, sourceLabel]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form.data.event_date.trim()) {
            form.setError('event_date', t('Event date is required.'));
            setOpen(true);

            return;
        }

        form.patch(
            updateAchievement.url({
                member,
                legacyAchievement: achievement,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    setOpen(true);
                },
                onSuccess: () => {
                    removeAchievementDraft(draftKey);
                    setRestoredDraft(null);
                    setOpen(false);
                    form.clearErrors();
                },
            },
        );
    }

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    form.clearErrors();
                    resetForm();
                    setRestoredDraft(null);

                    return;
                }

                const savedDraft = readAchievementDraft(draftKey);

                if (savedDraft) {
                    form.setData(savedDraft.data);
                    setRestoredDraft(savedDraft);
                } else {
                    setRestoredDraft(null);
                }
            }}
        >
            <div className="flex items-center gap-2">
                {draftMeta ? (
                    <Badge variant="outline" className="text-[11px]">
                        {t('Draft saved')}
                    </Badge>
                ) : null}
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {t('Edit')}
                    </Button>
                </DialogTrigger>
            </div>
            <DialogContent
                className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <div className="border-b px-6 py-5">
                        <DialogTitle className="text-base font-semibold">
                            {t('Edit legacy achievement')}
                        </DialogTitle>
                    </div>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                        {restoredDraft ? (
                            <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                        {t('Local draft restored')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Draft resumed from :source. Saved :time.',
                                        )
                                            .replace(
                                                ':source',
                                                restoredDraft.sourceLabel,
                                            )
                                            .replace(
                                                ':time',
                                                formatDraftTimestamp(
                                                    restoredDraft.updatedAt,
                                                ),
                                            )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => {
                                        removeAchievementDraft(draftKey);
                                        setRestoredDraft(null);
                                        resetForm();
                                        form.clearErrors();
                                    }}
                                >
                                    {t('Discard draft')}
                                </Button>
                            </div>
                        ) : null}
                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Tournament information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Keep the old competition details lightweight and record only what is available.',
                                    )}
                                </p>
                            </div>

                            {form.data.period === 'POST_RECRUITMENT' ? (
                                <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Session')}</Label>
                                        <Combobox
                                            value={form.data.session_id}
                                            onValueChange={(value) =>
                                                form.setData(
                                                    'session_id',
                                                    value,
                                                )
                                            }
                                            items={sessionItems}
                                            placeholder={t('Select session')}
                                            searchPlaceholder={t(
                                                'Search sessions…',
                                            )}
                                            emptyMessage={t(
                                                'No sessions found.',
                                            )}
                                            className="bg-background"
                                        />
                                        <InputError
                                            message={form.errors.session_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>
                                            {t('Tier / Level')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Combobox
                                            value={form.data.level}
                                            onValueChange={(value) =>
                                                form.setData('level', value)
                                            }
                                            items={LEVEL_ITEMS.map((item) => ({
                                                ...item,
                                                label: t(item.label),
                                            }))}
                                            placeholder={t('Select tier')}
                                            searchPlaceholder={t(
                                                'Search levels…',
                                            )}
                                            emptyMessage={t('No levels found.')}
                                            className="bg-background"
                                        />
                                        <InputError
                                            message={form.errors.level}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>
                                        {t('Level')}{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Combobox
                                        value={form.data.level}
                                        onValueChange={(value) =>
                                            form.setData('level', value)
                                        }
                                        items={LEVEL_ITEMS.map((item) => ({
                                            ...item,
                                            label: t(item.label),
                                        }))}
                                        placeholder={t('Select level')}
                                        searchPlaceholder={t('Search levels…')}
                                        emptyMessage={t('No levels found.')}
                                        className="bg-background"
                                    />
                                    <InputError message={form.errors.level} />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label>
                                    {form.data.period === 'POST_RECRUITMENT'
                                        ? t('Tournament')
                                        : t(
                                              'Tournament / competition details',
                                          )}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    value={form.data.competition_details}
                                    onChange={(e) =>
                                        form.setData(
                                            'competition_details',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                    className="bg-background"
                                    placeholder={
                                        form.data.period === 'POST_RECRUITMENT'
                                            ? t(
                                                  'Enter tournament name or source record',
                                              )
                                            : undefined
                                    }
                                />
                                <InputError
                                    message={form.errors.competition_details}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>
                                    {t('Event date')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <DatePicker
                                    value={form.data.event_date}
                                    onChange={(v) =>
                                        form.setData('event_date', v)
                                    }
                                    className="gap-2"
                                />
                                <InputError message={form.errors.event_date} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Venue')}</Label>
                                <Input
                                    value={form.data.venue}
                                    onChange={(e) =>
                                        form.setData('venue', e.target.value)
                                    }
                                    maxLength={255}
                                    className="bg-background"
                                />
                                <InputError message={form.errors.venue} />
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Sport & event information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Select the sport from master data, then add the specific event details for this record.',
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Sport')}</Label>
                                    <Combobox
                                        value={form.data.sport_id}
                                        onValueChange={(value) => {
                                            const selectedSport = sports.find(
                                                (sport) =>
                                                    String(sport.id) === value,
                                            );

                                            form.setData((current) => ({
                                                ...current,
                                                sport_id: value,
                                                sport_discipline:
                                                    selectedSport?.name ?? '',
                                            }));
                                        }}
                                        items={sports.map((sport) => ({
                                            value: String(sport.id),
                                            label: sport.name,
                                        }))}
                                        placeholder={t('Select sport')}
                                        searchPlaceholder={t('Search sports…')}
                                        emptyMessage={t('No sports found.')}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={
                                            form.errors.sport_id ??
                                            form.errors.sport_discipline
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Event name')}</Label>
                                    <Input
                                        value={form.data.event}
                                        onChange={(e) =>
                                            form.setData(
                                                'event',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        className="bg-background"
                                        placeholder={
                                            form.data.period ===
                                            'POST_RECRUITMENT'
                                                ? t('e.g. 100m sprint')
                                                : t('e.g. 100m sprint')
                                        }
                                    />
                                    <InputError message={form.errors.event} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Discipline')}</Label>
                                    <Input
                                        value={form.data.discipline}
                                        onChange={(e) =>
                                            form.setData(
                                                'discipline',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.discipline}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Gender class')}</Label>
                                    <Combobox
                                        value={form.data.gender_class}
                                        onValueChange={(value) =>
                                            form.setData('gender_class', value)
                                        }
                                        items={GENDER_CLASS_ITEMS.map(
                                            (item) => ({
                                                ...item,
                                                label: t(item.label),
                                            }),
                                        )}
                                        placeholder={t('Select gender class')}
                                        searchPlaceholder={t(
                                            'Search gender classes…',
                                        )}
                                        emptyMessage={t(
                                            'No gender classes found.',
                                        )}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.gender_class}
                                    />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>{t('Weight category')}</Label>
                                    <Input
                                        value={form.data.weight_category}
                                        onChange={(e) =>
                                            form.setData(
                                                'weight_category',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.weight_category}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Achievement information')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Record only the result that is available for this legacy achievement.',
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Medal')}</Label>
                                    <Combobox
                                        value={form.data.medal_type}
                                        onValueChange={(value) =>
                                            form.setData((current) => ({
                                                ...current,
                                                medal_type: value,
                                                position:
                                                    inferPositionFromMedal(
                                                        value,
                                                    ),
                                            }))
                                        }
                                        items={[
                                            { value: '', label: t('No medal') },
                                            ...MEDAL_ITEMS.map((item) => ({
                                                ...item,
                                                label: t(item.label),
                                            })),
                                        ]}
                                        placeholder={t('Select medal')}
                                        searchPlaceholder={t('Search medals…')}
                                        emptyMessage={t('No medals found.')}
                                        className="bg-background"
                                    />
                                    <InputError
                                        message={form.errors.medal_type}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('Position')}</Label>
                                    <Input
                                        value={form.data.position}
                                        className="bg-background"
                                        readOnly
                                        placeholder={t('Auto-set from medal')}
                                    />
                                    <InputError
                                        message={form.errors.position}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>{t('Remarks')}</Label>
                                <Textarea
                                    value={form.data.remarks}
                                    onChange={(e) =>
                                        form.setData('remarks', e.target.value)
                                    }
                                    rows={3}
                                    className="bg-background"
                                />
                                <InputError message={form.errors.remarks} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setOpen(false);
                                    form.clearErrors();
                                    resetForm();
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {t('Update achievement')}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AchievementRow({
    achievement,
    member,
    sessions,
    sports,
}: {
    achievement: LegacyAchievement;
    member: { id: number };
    sessions: Array<{ id: number; name: string; is_current?: boolean }>;
    sports: Array<{ id: number; name: string }>;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    function handleDeleteAchievement() {
        if (!confirm(t('Delete achievement?'))) {
            return;
        }

        router.delete(
            destroyAchievement.url({
                member,
                legacyAchievement: achievement,
            }),
        );
    }

    function handleDeleteBenefit(benefitId: number) {
        if (!confirm(t('Delete benefit?'))) {
            return;
        }

        router.delete(destroyBenefit.url(benefitId));
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="flex items-start justify-between gap-3 px-4 py-3">
                <CollapsibleTrigger asChild>
                    <button className="flex min-w-0 flex-1 items-start gap-2 text-left">
                        <ChevronDown
                            className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                        <div className="min-w-0 space-y-0.5">
                            <p className="text-sm leading-tight font-medium">
                                {achievement.competition_details}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{t(achievement.level)}</span>
                                {achievement.session && (
                                    <span>{achievement.session.name}</span>
                                )}
                                {achievement.event_date && (
                                    <span>
                                        {formatReadableDate(
                                            achievement.event_date,
                                        )}
                                    </span>
                                )}
                                {achievement.sport_discipline && (
                                    <span>{achievement.sport_discipline}</span>
                                )}
                                {achievement.event && (
                                    <span>{achievement.event}</span>
                                )}
                                {achievement.venue && (
                                    <span>{achievement.venue}</span>
                                )}
                            </div>
                        </div>
                    </button>
                </CollapsibleTrigger>
                <div className="flex shrink-0 items-center gap-2">
                    <EditAchievementDialog
                        achievement={achievement}
                        member={member}
                        sessions={sessions}
                        sports={sports}
                    />
                    {achievement.medal_type && (
                        <Badge
                            variant={
                                MEDAL_VARIANT[achievement.medal_type] ??
                                'outline'
                            }
                        >
                            {t(achievement.medal_type)}
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={handleDeleteAchievement}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            <CollapsibleContent>
                <div className="space-y-2 border-t px-4 pt-0 pb-3">
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t('Benefits')}
                        </span>
                        <AddBenefitDialog achievement={achievement} />
                    </div>

                    {achievement.benefits.length === 0 ? (
                        <p className="py-1 text-xs text-muted-foreground">
                            {t('No benefits recorded.')}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {achievement.benefits.map((b) => (
                                <div
                                    key={b.id}
                                    className="flex items-start justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {t(b.benefit_type)}
                                        </Badge>
                                        {(b.promoted_from_rank ||
                                            b.promoted_to_rank) && (
                                            <p className="text-muted-foreground">
                                                {b.promoted_from_rank} →{' '}
                                                {b.promoted_to_rank}
                                            </p>
                                        )}
                                        {b.cash_amount && (
                                            <p className="text-muted-foreground">
                                                ₹{b.cash_amount}
                                            </p>
                                        )}
                                        {b.benefit_date && (
                                            <p className="text-muted-foreground">
                                                {formatReadableDate(
                                                    b.benefit_date,
                                                )}
                                            </p>
                                        )}
                                        {b.order_reference && (
                                            <p className="text-muted-foreground">
                                                {b.order_reference}
                                            </p>
                                        )}
                                        {b.remarks && (
                                            <p className="text-muted-foreground">
                                                {b.remarks}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 shrink-0 text-destructive hover:text-destructive"
                                        onClick={() =>
                                            handleDeleteBenefit(b.id)
                                        }
                                    >
                                        <Trash2 className="size-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {achievement.position || achievement.remarks ? (
                        <div className="space-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs">
                            {achievement.position ? (
                                <p className="text-muted-foreground">
                                    {t('Position')}: #{achievement.position}
                                </p>
                            ) : null}
                            {achievement.remarks ? (
                                <p className="text-muted-foreground">
                                    {achievement.remarks}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function PeriodSection({
    period,
    achievements,
    member,
    sessions,
    sports,
    showActions,
    supplementaryContent,
    compact = false,
    supplementaryFirst = false,
    supplementaryNoPadding = false,
}: {
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT';
    achievements: LegacyAchievement[];
    member: { id: number };
    sessions: Array<{ id: number; name: string; is_current?: boolean }>;
    sports: Array<{ id: number; name: string }>;
    showActions: boolean;
    supplementaryContent?: ReactNode;
    compact?: boolean;
    supplementaryFirst?: boolean;
    supplementaryNoPadding?: boolean;
}) {
    const supplementaryPadding = supplementaryNoPadding
        ? ''
        : compact
          ? 'p-3 sm:p-4'
          : 'p-4';
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border bg-card">
            <div
                className={[
                    'flex items-center justify-between border-b',
                    compact ? 'px-4 py-2.5' : 'px-4 py-3',
                ].join(' ')}
            >
                <h4
                    className={[
                        'font-semibold',
                        compact
                            ? 'text-xs tracking-[0.16em] text-muted-foreground uppercase'
                            : 'text-sm',
                    ].join(' ')}
                >
                    {period === 'PRE_RECRUITMENT'
                        ? t('Pre-recruitment')
                        : t('Post-recruitment')}
                </h4>
                {showActions ? (
                    <AddAchievementDialog
                        member={member}
                        period={period}
                        sessions={sessions}
                        sports={sports}
                    />
                ) : null}
            </div>

            {achievements.length === 0 && !supplementaryContent ? (
                <p
                    className={[
                        'text-sm text-muted-foreground',
                        compact ? 'px-4 py-3' : 'px-4 py-4',
                    ].join(' ')}
                >
                    {t('No legacy achievements.')}
                </p>
            ) : (
                <div className="divide-y">
                    {supplementaryContent && supplementaryFirst ? (
                        <div className={supplementaryPadding}>
                            {supplementaryContent}
                        </div>
                    ) : null}
                    {achievements.map((a) => (
                        <AchievementRow
                            key={a.id}
                            achievement={a}
                            member={member}
                            sessions={sessions}
                            sports={sports}
                        />
                    ))}
                    {supplementaryContent && !supplementaryFirst ? (
                        <div className={supplementaryPadding}>
                            {supplementaryContent}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

export function LegacyAchievementsTab({
    member,
    sessions,
    sports,
    legacyAchievements,
    showActions = true,
    postRecruitmentContent,
    supplementaryNoPadding = false,
    hidePostRecruitmentRows = false,
}: Props) {
    const preRecruitment = (legacyAchievements ?? []).filter(
        (a) => a.period === 'PRE_RECRUITMENT',
    );
    const postRecruitment = hidePostRecruitmentRows
        ? []
        : (legacyAchievements ?? []).filter(
              (a) => a.period === 'POST_RECRUITMENT',
          );

    return (
        <div className="space-y-4">
            <PeriodSection
                period="POST_RECRUITMENT"
                achievements={postRecruitment}
                member={member}
                sessions={sessions}
                sports={sports}
                showActions={showActions}
                supplementaryContent={postRecruitmentContent}
                supplementaryFirst
                supplementaryNoPadding={supplementaryNoPadding}
            />
            <PeriodSection
                period="PRE_RECRUITMENT"
                achievements={preRecruitment}
                member={member}
                sessions={sessions}
                sports={sports}
                showActions={showActions}
                compact
            />
        </div>
    );
}
