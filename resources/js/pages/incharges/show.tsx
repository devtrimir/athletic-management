import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Award,
    ArrowLeft,
    Edit,
    Printer,
    Upload,
    Pencil,
    Plus,
    Save,
    Trash2,
    X,
    Trophy,
} from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import {
    changelog as inchargeChangelog,
    achievements as inchargeAchievements,
    specialAchievements as inchargeSpecialAchievements,
    teams as inchargeTeams,
} from '@/actions/App/Http/Controllers/InchargeProfileTabController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Incharge = {
    id: number;
    full_name: string;
    pno: string;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    is_active: boolean;
    remarks: string | null;
    photo_path: string | null;
};

type Assignment = {
    id: number;
    assigned_at: string | null;
    removed_at: string | null;
    assignment_reason: string | null;
    removal_reason: string | null;
    remarks: string | null;
    is_current: boolean;
    team: {
        id: number;
        name: string;
        location_type: 'unit' | 'district' | null;
        location_label: string | null;
        session: { id: number; name: string } | null;
        district: { id: number; name: string } | null;
        unit: { id: number; name: string } | null;
    } | null;
    session?: { id: number; name: string } | null;
    full_name: string;
    pno: string;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    assigned_by: { id: number; name: string } | null;
    removed_by: { id: number; name: string } | null;
};

type InchargeAchievementSummary = {
    total: number;
};

type InchargeAchievement = {
    id: number;
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT' | null;
    level: string | null;
    title: string;
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
    remarks: string | null;
};

type InchargeAchievementPayload = {
    summary: InchargeAchievementSummary;
    records: InchargeAchievement[];
};

type SpecialAchievementDocument = {
    path: string;
    preview_url: string;
    download_url: string;
    original_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
};

type InchargeSpecialAchievement = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    order_document?: SpecialAchievementDocument | null;
    place: string | null;
    remarks: string | null;
};

type InchargeSpecialAchievementPayload = {
    records: InchargeSpecialAchievement[];
    summary: {
        total: number;
    };
};

type ConfirmationDialogState = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
};

const SPECIAL_ACHIEVEMENT_TYPES = [
    'COMMENDATION_DISC',
    'APPRECIATION_LETTER',
    'HONOUR_CERTIFICATE',
    'SPECIAL_RECOGNITION',
    'OTHER',
] as const;

const FALLBACK_ACHIEVEMENT_LEVELS = [
    'INTERNATIONAL',
    'NATIONAL',
    'AIPSC',
    'STATE',
    'ZONAL',
    'OTHER',
] as const;
const ACHIEVEMENT_MEDALS = [
    'GOLD',
    'SILVER',
    'BRONZE',
    'MERIT',
    'CERTIFICATE',
] as const;
const MEDAL_TO_POSITION: Record<string, string> = {
    GOLD: '1',
    SILVER: '2',
    BRONZE: '3',
};
const POSITION_TO_MEDAL: Record<string, string> = {
    '1': 'GOLD',
    '2': 'SILVER',
    '3': 'BRONZE',
};
const GENDER_CLASS_ITEMS: string[] = ['M', 'F', 'MIXED', 'OPEN'];

type AchievementFormState = {
    period: 'POST_RECRUITMENT';
    level: string;
    sport_id: string;
    title: string;
    competition_details: string;
    event_date: string;
    venue: string;
    sport_discipline: string;
    event: string;
    discipline: string;
    weight_category: string;
    gender_class: string;
    medal_type: string;
    position: string;
    remarks: string;
};

type SpecialAchievementFormState = {
    achievement_type: string;
    title: string;
    awarded_on: string;
    issuing_authority: string;
    order_reference: string;
    order_document: File | null;
    place: string;
    remarks: string;
};

export function specialAchievementTypeLabel(
    value: string,
    t: (key: string) => string,
): string {
    switch (value) {
        case 'COMMENDATION_DISC':
            return t('Commendation Disc');
        case 'APPRECIATION_LETTER':
            return t('Appreciation Letter');
        case 'HONOUR_CERTIFICATE':
            return t('Honour Certificate');
        case 'SPECIAL_RECOGNITION':
            return t('Special Recognition');
        default:
            return t('Other');
    }
}

function isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeIsoDate(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    const canonicalMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(T|\s|$)/);

    if (canonicalMatch) {
        return canonicalMatch[1];
    }

    const ddmmyyyyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;

        return `${year}-${month}-${day}`;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return `${String(parsed.getFullYear())}-${String(
        parsed.getMonth() + 1,
    ).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function displayValue(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === ''
        ? '—'
        : String(value);
}

function formatDateOnly(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    if (trimmed.includes('T')) {
        return trimmed.split('T')[0] ?? '';
    }

    if (trimmed.includes(' ')) {
        return trimmed.split(' ')[0] ?? '';
    }

    return trimmed;
}

function detail(label: string, value: ReactNode) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

export default function InchargesShow({
    incharge,
    activeTab,
    summary,
    achievements,
    assignments,
    auditLog,
    auditLogEndpoint,
    specialAchievements,
    achievement_levels,
    sports,
}: {
    incharge: Incharge;
    activeTab:
        | 'overview'
        | 'profile'
        | 'teams'
        | 'achievements'
        | 'special-achievements'
        | 'changelog';
    summary?: { current_teams_count: number };
    achievements?: InchargeAchievementPayload;
    assignments?: Assignment[];
    auditLog?: AuditEntry[];
    auditLogEndpoint?: string;
    specialAchievements?: InchargeSpecialAchievementPayload;
    achievement_levels?: string[];
    sports?: { id: number; name: string }[];
}) {
    const { t } = useTranslation();
    const sportNameById = new Map(
        (sports ?? []).map((sport) => [String(sport.id), sport.name]),
    );
    const achievementLevels = achievement_levels?.length
        ? achievement_levels
        : FALLBACK_ACHIEVEMENT_LEVELS;
    const normalizedActiveTab =
        activeTab === 'profile' ? 'overview' : activeTab;
    const [addingAchievement, setAddingAchievement] = useState(false);
    const [editingAchievementId, setEditingAchievementId] = useState<
        number | null
    >(null);
    const [addingSpecialAchievement, setAddingSpecialAchievement] =
        useState(false);
    const [editingSpecialAchievementId, setEditingSpecialAchievementId] =
        useState<number | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationDialogState>({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        onConfirm: () => {},
    });
    const achievementForm = useForm<AchievementFormState>({
        period: 'POST_RECRUITMENT',
        level: '',
        sport_id: '',
        title: '',
        competition_details: '',
        event_date: '',
        venue: '',
        sport_discipline: '',
        event: '',
        discipline: '',
        weight_category: '',
        gender_class: '',
        medal_type: '',
        position: '',
        remarks: '',
    });
    const specialAchievementForm = useForm<SpecialAchievementFormState>({
        achievement_type: 'COMMENDATION_DISC',
        title: '',
        awarded_on: '',
        issuing_authority: '',
        order_reference: '',
        order_document: null,
        place: '',
        remarks: '',
    });

    function clearAchievementForm(): void {
        setAddingAchievement(false);
        setEditingAchievementId(null);
        achievementForm.setData({
            period: 'POST_RECRUITMENT',
            level: '',
            sport_id: '',
            title: '',
            competition_details: '',
            event_date: '',
            venue: '',
            sport_discipline: '',
            event: '',
            discipline: '',
            weight_category: '',
            gender_class: '',
            medal_type: '',
            position: '',
            remarks: '',
        });
        achievementForm.clearErrors();
    }

    function clearSpecialAchievementForm(): void {
        setAddingSpecialAchievement(false);
        setEditingSpecialAchievementId(null);
        specialAchievementForm.setData({
            achievement_type: 'COMMENDATION_DISC',
            title: '',
            awarded_on: '',
            issuing_authority: '',
            order_reference: '',
            order_document: null,
            place: '',
            remarks: '',
        });
        specialAchievementForm.clearErrors();
    }

    function submitAchievement(event: FormEvent): void {
        event.preventDefault();

        const payload = {
            title: (achievementForm.data.title ?? '').trim(),
            period: 'POST_RECRUITMENT',
            level: (achievementForm.data.level ?? '').trim(),
            competition_details: (
                achievementForm.data.competition_details ?? ''
            ).trim(),
            event_date: normalizeIsoDate(achievementForm.data.event_date || ''),
            venue: (achievementForm.data.venue ?? '').trim() || null,
            sport_discipline:
                (achievementForm.data.sport_id
                    ? sportNameById.get(achievementForm.data.sport_id)
                    : (achievementForm.data.sport_discipline ?? '').trim()
                )?.trim() || null,
            event: (achievementForm.data.event ?? '').trim() || null,
            discipline: (achievementForm.data.discipline ?? '').trim() || null,
            weight_category:
                (achievementForm.data.weight_category ?? '').trim() || null,
            gender_class: achievementForm.data.gender_class || null,
            medal_type: achievementForm.data.medal_type || null,
            position: achievementForm.data.position
                ? Number(achievementForm.data.position)
                : null,
            remarks: (achievementForm.data.remarks ?? '').trim(),
        };

        if (!payload.level) {
            achievementForm.setError('level', t('Level is required.'));

            return;
        }

        if (!payload.title) {
            achievementForm.setError('title', t('Title is required.'));

            return;
        }

        if (!payload.competition_details) {
            achievementForm.setError(
                'competition_details',
                t('Competition details are required.'),
            );

            return;
        }

        if (!payload.sport_discipline) {
            achievementForm.setError(
                'sport_discipline',
                t('Sport is required.'),
            );

            return;
        }

        if (!payload.event_date) {
            achievementForm.setError(
                'event_date',
                t('Event date is required.'),
            );

            return;
        }

        if (
            payload.medal_type !== null &&
            !ACHIEVEMENT_MEDALS.includes(
                payload.medal_type as (typeof ACHIEVEMENT_MEDALS)[number],
            )
        ) {
            achievementForm.setError('medal_type', t('Invalid medal type.'));

            return;
        }

        if (
            payload.position !== null &&
            (!Number.isInteger(payload.position) ||
                payload.position < 1 ||
                payload.position > 9999)
        ) {
            achievementForm.setError('position', t('Enter a valid position.'));

            return;
        }

        if (payload.event_date !== null && !isIsoDate(payload.event_date)) {
            achievementForm.setError('event_date', t('Use YYYY-MM-DD format.'));

            return;
        }

        if (editingAchievementId) {
            setConfirmation({
                open: true,
                title: t('Update achievement'),
                description: t('Do you want to update this achievement?'),
                confirmLabel: t('Update'),
                onConfirm: () =>
                    achievementForm.patch(
                        `/incharges/${incharge.id}/achievements/${editingAchievementId}`,
                        {
                            data: payload,
                            onSuccess: clearAchievementForm,
                            preserveScroll: true,
                        },
                    ),
            });

            return;
        }

        achievementForm.post(`/incharges/${incharge.id}/achievements`, {
            data: payload,
            onSuccess: clearAchievementForm,
            preserveScroll: true,
        });
    }

    function submitSpecialAchievement(event: FormEvent): void {
        event.preventDefault();

        const payload = {
            achievement_type:
                specialAchievementForm.data.achievement_type ?? '',
            title: (specialAchievementForm.data.title ?? '').trim(),
            awarded_on: normalizeIsoDate(
                specialAchievementForm.data.awarded_on || '',
            ),
            issuing_authority: (
                specialAchievementForm.data.issuing_authority ?? ''
            ).trim(),
            order_reference: (
                specialAchievementForm.data.order_reference ?? ''
            ).trim(),
            order_document: specialAchievementForm.data.order_document ?? null,
            place: (specialAchievementForm.data.place ?? '').trim(),
            remarks: (specialAchievementForm.data.remarks ?? '').trim(),
        };

        if (!payload.title) {
            specialAchievementForm.setError('title', t('Title is required.'));

            return;
        }

        if (
            !SPECIAL_ACHIEVEMENT_TYPES.includes(
                payload.achievement_type as (typeof SPECIAL_ACHIEVEMENT_TYPES)[number],
            )
        ) {
            specialAchievementForm.setError(
                'achievement_type',
                t('Invalid achievement type.'),
            );

            return;
        }

        if (
            payload.awarded_on !== null &&
            payload.awarded_on !== '' &&
            !isIsoDate(payload.awarded_on)
        ) {
            specialAchievementForm.setError(
                'awarded_on',
                t('Use YYYY-MM-DD format.'),
            );

            return;
        }

        if (editingSpecialAchievementId) {
            setConfirmation({
                open: true,
                title: t('Update special achievement'),
                description: t(
                    'Do you want to update this special achievement?',
                ),
                confirmLabel: t('Update'),
                onConfirm: () =>
                    specialAchievementForm.patch(
                        `/incharges/${incharge.id}/special-achievements/${editingSpecialAchievementId}`,
                        {
                            data: payload,
                            onSuccess: clearSpecialAchievementForm,
                            preserveScroll: true,
                        },
                    ),
            });

            return;
        }

        specialAchievementForm.post(
            `/incharges/${incharge.id}/special-achievements`,
            {
                data: payload,
                onSuccess: clearSpecialAchievementForm,
                preserveScroll: true,
            },
        );
    }

    function handleInchargePhotoChange(
        event: ChangeEvent<HTMLInputElement>,
    ): void {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        if (incharge.photo_path) {
            setConfirmation({
                open: true,
                title: t('Update photo'),
                description: t(
                    'Do you want to replace the current incharge photo?',
                ),
                confirmLabel: t('Update'),
                onConfirm: () =>
                    router.post(`/incharges/${incharge.id}/photo`, formData, {
                        preserveScroll: true,
                    }),
            });
        } else {
            router.post(`/incharges/${incharge.id}/photo`, formData, {
                preserveScroll: true,
            });
        }

        event.target.value = '';
    }

    const tabs = [
        {
            value: 'overview',
            label: t('Overview'),
            href: InchargeController.show.url(incharge.id),
        },
        {
            value: 'achievements',
            label: t('Achievements'),
            href: inchargeAchievements.url(incharge.id),
        },
        {
            value: 'teams',
            label: t('Teams'),
            href: inchargeTeams.url(incharge.id),
        },
        {
            value: 'special-achievements',
            label: t('Special achievements'),
            href: inchargeSpecialAchievements.url(incharge.id),
        },
        {
            value: 'changelog',
            label: t('Changelog'),
            href: inchargeChangelog.url(incharge.id),
        },
    ] as const;

    return (
        <>
            <Head title={incharge.full_name} />
            <AlertDialog
                open={confirmation.open}
                onOpenChange={(open) =>
                    setConfirmation((state) => ({ ...state, open }))
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmation.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmation.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() =>
                                setConfirmation((state) => ({
                                    ...state,
                                    open: false,
                                }))
                            }
                        >
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => {
                                confirmation.onConfirm();
                                setConfirmation((state) => ({
                                    ...state,
                                    open: false,
                                }));
                            }}
                        >
                            {confirmation.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={incharge.full_name}
                        description={`${t('PNO')}: ${incharge.pno}`}
                    />
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={InchargeController.index.url()}>
                                <ArrowLeft className="size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link
                                href={InchargeController.edit.url(incharge.id)}
                            >
                                <Edit className="size-4" />
                                {t('Edit team prabhari')}
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={`/incharges/${incharge.id}/preview`}>
                                <Printer className="size-4" />
                                {t('Print preview')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Tabs value={normalizedActiveTab}>
                    <TabsList>
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                asChild
                            >
                                <Link href={tab.href} prefetch>
                                    {tab.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview" className="mt-4">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="space-y-6 lg:col-span-2">
                                <div className="rounded-xl border bg-card p-6">
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('Identity')}
                                        </h3>
                                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                                            {detail(
                                                t('Full name'),
                                                incharge.full_name,
                                            )}
                                            {detail(
                                                t('PNO'),
                                                <span className="font-mono">
                                                    {incharge.pno}
                                                </span>,
                                            )}
                                            {detail(t('Rank'), incharge.rank)}
                                            {detail(
                                                t('Mobile'),
                                                incharge.mobile,
                                            )}
                                            {detail(t('Email'), incharge.email)}
                                        </dl>
                                    </section>
                                </div>

                                <div className="rounded-xl border bg-card p-6">
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('Service status')}
                                        </h3>
                                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                                            {detail(
                                                t('Status'),
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        incharge.is_active
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300'
                                                    }
                                                >
                                                    {incharge.is_active
                                                        ? t('Active')
                                                        : t('Inactive')}
                                                </Badge>,
                                            )}
                                            {detail(
                                                t('Current teams'),
                                                summary?.current_teams_count ??
                                                    0,
                                            )}
                                        </dl>
                                    </section>
                                </div>

                                {incharge.remarks && (
                                    <div className="rounded-xl border bg-card p-6">
                                        <section className="space-y-3">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {t('Remarks')}
                                            </h3>
                                            <p className="text-sm text-foreground">
                                                {incharge.remarks}
                                            </p>
                                        </section>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-1">
                                <div className="flex flex-col items-center rounded-xl border bg-card p-6">
                                    {incharge.photo_path ? (
                                        <>
                                            <div className="relative size-40 overflow-hidden rounded-xl border bg-muted">
                                                <img
                                                    src={`/storage/${incharge.photo_path}`}
                                                    alt={incharge.full_name}
                                                    className="size-full object-cover"
                                                />
                                                <button
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100"
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmation({
                                                            open: true,
                                                            title: t(
                                                                'Delete photo',
                                                            ),
                                                            description: t(
                                                                'Do you want to remove the incharge photo?',
                                                            ),
                                                            confirmLabel:
                                                                t('Delete'),
                                                            onConfirm: () =>
                                                                router.delete(
                                                                    `/incharges/${incharge.id}/photo`,
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                ),
                                                        })
                                                    }
                                                >
                                                    {t('Remove photo')}
                                                </button>
                                            </div>
                                            <label className="mt-3 inline-flex cursor-pointer items-center rounded-md border bg-background px-2 py-1 text-xs font-medium">
                                                <Upload className="mr-1 h-3 w-3" />
                                                {t('Update photo')}
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="sr-only"
                                                    onChange={
                                                        handleInchargePhotoChange
                                                    }
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <>
                                            <label className="flex size-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted transition-colors hover:bg-muted/80">
                                                <span className="px-2 text-center text-xs text-muted-foreground">
                                                    {t('Upload photo')}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="sr-only"
                                                    onChange={
                                                        handleInchargePhotoChange
                                                    }
                                                />
                                            </label>
                                            <span className="mt-3 text-xs text-muted-foreground">
                                                {t('No photo uploaded')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="achievements" className="mt-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {t('Total records')}:{' '}
                                {achievements?.summary.total ?? 0}
                            </div>
                            <Badge variant="outline" className="gap-1">
                                <Trophy className="size-3" />
                                {t('Achievements')}
                            </Badge>
                        </div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-muted-foreground">
                                {t('Achievements')}
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setEditingAchievementId(null);
                                    setAddingAchievement(true);
                                    achievementForm.setData({
                                        period: 'POST_RECRUITMENT',
                                        level: '',
                                        sport_id: '',
                                        title: '',
                                        competition_details: '',
                                        event_date: '',
                                        venue: '',
                                        sport_discipline: '',
                                        event: '',
                                        discipline: '',
                                        weight_category: '',
                                        gender_class: '',
                                        medal_type: '',
                                        position: '',
                                        remarks: '',
                                    });
                                    achievementForm.clearErrors();
                                }}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add achievement')}
                            </Button>
                        </div>

                        <Dialog
                            open={
                                addingAchievement ||
                                editingAchievementId !== null
                            }
                            onOpenChange={(open) => {
                                if (!open) {
                                    setAddingAchievement(false);
                                    setEditingAchievementId(null);
                                }
                            }}
                        >
                            <DialogContent
                                className="max-h-[88vh] overflow-x-hidden overflow-y-auto sm:max-w-3xl"
                                onPointerDownOutside={(event) => {
                                    event.preventDefault();
                                }}
                            >
                                <form
                                    onSubmit={submitAchievement}
                                    className="mt-4 grid gap-4"
                                >
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingAchievementId
                                                ? t('Edit achievement')
                                                : t('Add achievement')}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {editingAchievementId
                                                ? t(
                                                      'Update achievement details.',
                                                  )
                                                : t(
                                                      'Add a post-recruitment achievement.',
                                                  )}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_level">
                                                {t('Level')}
                                            </Label>
                                            <Combobox
                                                id="achievement_level"
                                                value={
                                                    achievementForm.data
                                                        .level ?? ''
                                                }
                                                onValueChange={(value) => {
                                                    if (!value) {
                                                        return;
                                                    }

                                                    achievementForm.setData(
                                                        'level',
                                                        value,
                                                    );
                                                }}
                                                items={achievementLevels.map(
                                                    (level) => ({
                                                        value: level,
                                                        label: t(level),
                                                    }),
                                                )}
                                                placeholder={t('Level')}
                                                searchPlaceholder={t(
                                                    'Search levels…',
                                                )}
                                                emptyMessage={t(
                                                    'No levels found.',
                                                )}
                                                className="bg-background"
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors.level
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_title">
                                                {t('Competition title')}
                                            </Label>
                                            <Input
                                                id="achievement_title"
                                                value={
                                                    achievementForm.data
                                                        .title ?? ''
                                                }
                                                onChange={(event) =>
                                                    achievementForm.setData(
                                                        'title',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors.title
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <Label htmlFor="achievement_competition_details">
                                            {t('Competition details')}
                                        </Label>
                                        <Textarea
                                            id="achievement_competition_details"
                                            value={
                                                achievementForm.data
                                                    .competition_details ?? ''
                                            }
                                            onChange={(event) =>
                                                achievementForm.setData(
                                                    'competition_details',
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={
                                                achievementForm.errors
                                                    .competition_details
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_event_date">
                                                {t('Event date')}
                                            </Label>
                                            <DatePicker
                                                id="achievement_event_date"
                                                value={
                                                    achievementForm.data
                                                        .event_date ?? ''
                                                }
                                                onChange={(value) =>
                                                    achievementForm.setData(
                                                        'event_date',
                                                        value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .event_date
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_medal_type">
                                                {t('Medal')}
                                            </Label>
                                            <Combobox
                                                id="achievement_medal_type"
                                                value={
                                                    achievementForm.data
                                                        .medal_type ?? ''
                                                }
                                                onValueChange={(value) => {
                                                    if (!value) {
                                                        return;
                                                    }

                                                    achievementForm.setData(
                                                        'medal_type',
                                                        value,
                                                    );
                                                    achievementForm.setData(
                                                        'position',
                                                        MEDAL_TO_POSITION[
                                                            value
                                                        ] ?? '',
                                                    );
                                                }}
                                                items={ACHIEVEMENT_MEDALS.map(
                                                    (medal) => ({
                                                        value: medal,
                                                        label: t(medal),
                                                    }),
                                                )}
                                                placeholder={t('Medal')}
                                                searchPlaceholder={t(
                                                    'Search medals…',
                                                )}
                                                emptyMessage={t(
                                                    'No medals found.',
                                                )}
                                                className="bg-background"
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .medal_type
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-4">
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_position">
                                                {t('Position')}
                                            </Label>
                                            <Input
                                                id="achievement_position"
                                                type="number"
                                                min={1}
                                                max={9999}
                                                value={
                                                    achievementForm.data
                                                        .position ?? ''
                                                }
                                                onChange={(event) => {
                                                    const value =
                                                        event.target.value.trim();
                                                    achievementForm.setData({
                                                        position: value,
                                                        medal_type:
                                                            POSITION_TO_MEDAL[
                                                                value
                                                            ] ?? '',
                                                    });
                                                }}
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .position
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_gender_class">
                                                {t('Gender class')}
                                            </Label>
                                            <Select
                                                value={
                                                    achievementForm.data
                                                        .gender_class ?? ''
                                                }
                                                onValueChange={(value) =>
                                                    achievementForm.setData(
                                                        'gender_class',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="achievement_gender_class">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Gender class',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {GENDER_CLASS_ITEMS.map(
                                                        (value) => (
                                                            <SelectItem
                                                                key={value}
                                                                value={value}
                                                            >
                                                                {t(value)}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .gender_class
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3 sm:col-span-2">
                                            <Label htmlFor="achievement_event">
                                                {t('Event')}
                                            </Label>
                                            <Input
                                                id="achievement_event"
                                                value={
                                                    achievementForm.data
                                                        .event ?? ''
                                                }
                                                onChange={(event) =>
                                                    achievementForm.setData(
                                                        'event',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors.event
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_sport_id">
                                                {t('Sport')}
                                            </Label>
                                            <Combobox
                                                id="achievement_sport_id"
                                                value={
                                                    achievementForm.data
                                                        .sport_id ?? ''
                                                }
                                                onValueChange={(value) => {
                                                    achievementForm.setData(
                                                        'sport_id',
                                                        value,
                                                    );
                                                    achievementForm.setData(
                                                        'sport_discipline',
                                                        value
                                                            ? (sportNameById.get(
                                                                  value,
                                                              ) ?? '')
                                                            : '',
                                                    );
                                                }}
                                                items={(sports ?? []).map(
                                                    (sport) => ({
                                                        value: String(sport.id),
                                                        label: sport.name,
                                                    }),
                                                )}
                                                placeholder={t('Select sport')}
                                                searchPlaceholder={t(
                                                    'Search sports…',
                                                )}
                                                emptyMessage={t(
                                                    'No sports found.',
                                                )}
                                                className="bg-background"
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .sport_id ??
                                                    achievementForm.errors
                                                        .sport_discipline
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_weight_category">
                                                {t('Weight category')}
                                            </Label>
                                            <Input
                                                id="achievement_weight_category"
                                                value={
                                                    achievementForm.data
                                                        .weight_category ?? ''
                                                }
                                                onChange={(event) =>
                                                    achievementForm.setData(
                                                        'weight_category',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .weight_category
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="achievement_discipline">
                                                {t('Discipline')}
                                            </Label>
                                            <Input
                                                id="achievement_discipline"
                                                value={
                                                    achievementForm.data
                                                        .discipline ?? ''
                                                }
                                                onChange={(event) =>
                                                    achievementForm.setData(
                                                        'discipline',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    achievementForm.errors
                                                        .discipline
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <Label htmlFor="achievement_venue">
                                            {t('Venue')}
                                        </Label>
                                        <Input
                                            id="achievement_venue"
                                            value={
                                                achievementForm.data.venue ?? ''
                                            }
                                            onChange={(event) =>
                                                achievementForm.setData(
                                                    'venue',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                achievementForm.errors.venue
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-3">
                                        <Label htmlFor="achievement_remarks">
                                            {t('Remarks')}
                                        </Label>
                                        <Textarea
                                            id="achievement_remarks"
                                            value={
                                                achievementForm.data.remarks ??
                                                ''
                                            }
                                            onChange={(event) =>
                                                achievementForm.setData(
                                                    'remarks',
                                                    event.target.value,
                                                )
                                            }
                                            rows={2}
                                        />
                                        <InputError
                                            message={
                                                achievementForm.errors.remarks
                                            }
                                        />
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={clearAchievementForm}
                                        >
                                            <X className="mr-1.5 h-4 w-4" />
                                            {t('Cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                achievementForm.processing
                                            }
                                        >
                                            <Save className="mr-1.5 h-4 w-4" />
                                            {editingAchievementId
                                                ? t('Update')
                                                : t('Save')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                        {(achievements?.records ?? []).length === 0 ? (
                            <div className="rounded-md border bg-card p-6 text-center text-muted-foreground">
                                {t('No achievements yet.')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16 text-center">
                                                {t('S. No.')}
                                            </TableHead>
                                            <TableHead className="min-w-56">
                                                {t('Title')}
                                            </TableHead>
                                            <TableHead className="min-w-32">
                                                {t('Level')}
                                            </TableHead>
                                            <TableHead className="min-w-40">
                                                {t('Sport / Discipline')}
                                            </TableHead>
                                            <TableHead className="min-w-40">
                                                {t('Event')}
                                            </TableHead>
                                            <TableHead>{t('Venue')}</TableHead>
                                            <TableHead>
                                                {t('Event Date')}
                                            </TableHead>
                                            <TableHead>{t('Medal')}</TableHead>
                                            <TableHead className="text-right">
                                                {t('Actions')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(achievements?.records ?? []).map(
                                            (achievement, index) => (
                                                <TableRow key={achievement.id}>
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {displayValue(
                                                                achievement.title,
                                                            )}
                                                        </div>
                                                        {achievement.competition_details ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                {displayValue(
                                                                    achievement.competition_details,
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {achievement.level
                                                            ? t(
                                                                  achievement.level,
                                                              )
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <div>
                                                            {displayValue(
                                                                achievement.sport_discipline,
                                                            )}
                                                        </div>
                                                        {achievement.discipline ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                {displayValue(
                                                                    achievement.discipline,
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {displayValue(
                                                            achievement.event,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {displayValue(
                                                            achievement.venue,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {displayValue(
                                                            achievement.event_date,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {displayValue(
                                                                `${
                                                                    achievement.medal_type
                                                                        ? t(
                                                                              achievement.medal_type,
                                                                          )
                                                                        : ''
                                                                } ${achievement.position ?? ''}`.trim(),
                                                            )}
                                                        </div>
                                                        {achievement.weight_category ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                {displayValue(
                                                                    achievement.weight_category,
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                type="button"
                                                                aria-label={t(
                                                                    'Edit',
                                                                )}
                                                                onClick={() => {
                                                                    setEditingAchievementId(
                                                                        achievement.id,
                                                                    );
                                                                    setAddingAchievement(
                                                                        false,
                                                                    );
                                                                    achievementForm.setData(
                                                                        {
                                                                            period: 'POST_RECRUITMENT',
                                                                            level:
                                                                                achievement.level ??
                                                                                '',
                                                                            sport_id:
                                                                                Array.from(
                                                                                    sportNameById.entries(),
                                                                                ).find(
                                                                                    ([
                                                                                        ,
                                                                                        name,
                                                                                    ]) =>
                                                                                        name ===
                                                                                        achievement.sport_discipline,
                                                                                )?.[0] ??
                                                                                '',
                                                                            title: achievement.title,
                                                                            competition_details:
                                                                                achievement.competition_details ??
                                                                                '',
                                                                            event_date:
                                                                                normalizeIsoDate(
                                                                                    achievement.event_date ??
                                                                                        '',
                                                                                ) ??
                                                                                '',
                                                                            venue:
                                                                                achievement.venue ??
                                                                                '',
                                                                            sport_discipline:
                                                                                achievement.sport_discipline ??
                                                                                '',
                                                                            event:
                                                                                achievement.event ??
                                                                                '',
                                                                            discipline:
                                                                                achievement.discipline ??
                                                                                '',
                                                                            weight_category:
                                                                                achievement.weight_category ??
                                                                                '',
                                                                            gender_class:
                                                                                achievement.gender_class ??
                                                                                '',
                                                                            medal_type:
                                                                                achievement.medal_type ??
                                                                                '',
                                                                            position:
                                                                                achievement.position
                                                                                    ? String(
                                                                                          achievement.position,
                                                                                      )
                                                                                    : '',
                                                                            remarks:
                                                                                achievement.remarks ??
                                                                                '',
                                                                        },
                                                                    );
                                                                    achievementForm.clearErrors();
                                                                }}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                type="button"
                                                                aria-label={t(
                                                                    'Delete',
                                                                )}
                                                                onClick={() => {
                                                                    setConfirmation(
                                                                        {
                                                                            open: true,
                                                                            title: t(
                                                                                'Remove achievement',
                                                                            ),
                                                                            description:
                                                                                t(
                                                                                    'Do you want to remove this achievement?',
                                                                                ),
                                                                            confirmLabel:
                                                                                t(
                                                                                    'Delete',
                                                                                ),
                                                                            onConfirm:
                                                                                () =>
                                                                                    router.delete(
                                                                                        `/incharges/${incharge.id}/achievements/${achievement.id}`,
                                                                                        {
                                                                                            preserveScroll: true,
                                                                                        },
                                                                                    ),
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="special-achievements" className="mt-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {t('Total records')}:{' '}
                                {specialAchievements?.summary.total ?? 0}
                            </div>
                            <Badge variant="outline" className="gap-1">
                                <Award className="size-3" />
                                {t('Special recognitions')}
                            </Badge>
                        </div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-muted-foreground">
                                {t('Special achievements')}
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setEditingSpecialAchievementId(null);
                                    setAddingSpecialAchievement(true);
                                    specialAchievementForm.setData({
                                        achievement_type: 'COMMENDATION_DISC',
                                        title: '',
                                        awarded_on: '',
                                        issuing_authority: '',
                                        order_reference: '',
                                        order_document: null,
                                        place: '',
                                        remarks: '',
                                    });
                                    specialAchievementForm.clearErrors();
                                }}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add special achievement')}
                            </Button>
                        </div>

                        <Dialog
                            open={
                                addingSpecialAchievement ||
                                editingSpecialAchievementId !== null
                            }
                            onOpenChange={(open) => {
                                if (!open) {
                                    setAddingSpecialAchievement(false);
                                    setEditingSpecialAchievementId(null);
                                }
                            }}
                        >
                            <DialogContent
                                className="max-h-[88vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl"
                                onPointerDownOutside={(event) => {
                                    event.preventDefault();
                                }}
                            >
                                <form
                                    onSubmit={submitSpecialAchievement}
                                    className="mt-4 grid gap-4"
                                >
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingSpecialAchievementId
                                                ? t('Edit special achievement')
                                                : t('Add special achievement')}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {editingSpecialAchievementId
                                                ? t(
                                                      'Update special achievement details.',
                                                  )
                                                : t(
                                                      'Add a special achievement without tournament linkage.',
                                                  )}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-3">
                                        <Label htmlFor="special_achievement_type">
                                            {t('Type')}
                                        </Label>
                                        <Select
                                            value={
                                                specialAchievementForm.data
                                                    .achievement_type ?? ''
                                            }
                                            onValueChange={(value) =>
                                                specialAchievementForm.setData(
                                                    'achievement_type',
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={t('Type')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SPECIAL_ACHIEVEMENT_TYPES.map(
                                                    (type) => (
                                                        <SelectItem
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {specialAchievementTypeLabel(
                                                                type,
                                                                t,
                                                            )}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .achievement_type
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="special_achievement_title">
                                            {t('Title')}
                                        </Label>
                                        <Input
                                            id="special_achievement_title"
                                            value={
                                                specialAchievementForm.data
                                                    .title ?? ''
                                            }
                                            onChange={(event) =>
                                                specialAchievementForm.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .title
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="special_achievement_awarded_on">
                                            {t('Awarded on')}
                                        </Label>
                                        <DatePicker
                                            id="special_achievement_awarded_on"
                                            value={
                                                specialAchievementForm.data
                                                    .awarded_on ?? ''
                                            }
                                            onChange={(value) =>
                                                specialAchievementForm.setData(
                                                    'awarded_on',
                                                    value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .awarded_on
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="special_achievement_issuing_authority">
                                            {t('Issuing authority')}
                                        </Label>
                                        <Input
                                            id="special_achievement_issuing_authority"
                                            value={
                                                specialAchievementForm.data
                                                    .issuing_authority ?? ''
                                            }
                                            onChange={(event) =>
                                                specialAchievementForm.setData(
                                                    'issuing_authority',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .issuing_authority
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="grid gap-3">
                                            <Label htmlFor="special_achievement_order_reference">
                                                {t('Order reference')}
                                            </Label>
                                            <Input
                                                id="special_achievement_order_reference"
                                                value={
                                                    specialAchievementForm.data
                                                        .order_reference ?? ''
                                                }
                                                onChange={(event) =>
                                                    specialAchievementForm.setData(
                                                        'order_reference',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    specialAchievementForm
                                                        .errors.order_reference
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="special_achievement_place">
                                                {t('Place')}
                                            </Label>
                                            <Input
                                                id="special_achievement_place"
                                                value={
                                                    specialAchievementForm.data
                                                        .place ?? ''
                                                }
                                                onChange={(event) =>
                                                    specialAchievementForm.setData(
                                                        'place',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    specialAchievementForm
                                                        .errors.place
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label>{t('Order document')}</Label>
                                        <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                                            <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                                <Upload className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium break-words">
                                                    {specialAchievementForm.data
                                                        .order_document?.name ??
                                                        t(
                                                            'Upload order document',
                                                        )}
                                                </span>
                                                <span className="mt-1 block text-xs break-words text-muted-foreground">
                                                    {t(
                                                        'PDF, JPG, PNG, or WEBP. Stored privately and available only to authorized users.',
                                                    )}
                                                </span>
                                            </span>
                                            <Input
                                                className="sr-only"
                                                type="file"
                                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                                onChange={(event) => {
                                                    specialAchievementForm.setData(
                                                        'order_document',
                                                        event.target
                                                            .files?.[0] ?? null,
                                                    );
                                                    specialAchievementForm.clearErrors(
                                                        'order_document',
                                                    );
                                                }}
                                            />
                                        </label>
                                        {specialAchievementForm.progress ? (
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{
                                                        width: `${specialAchievementForm.progress.percentage ?? 0}%`,
                                                    }}
                                                />
                                            </div>
                                        ) : null}
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .order_document
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="special_achievement_remarks">
                                            {t('Remarks')}
                                        </Label>
                                        <Textarea
                                            id="special_achievement_remarks"
                                            value={
                                                specialAchievementForm.data
                                                    .remarks ?? ''
                                            }
                                            onChange={(event) =>
                                                specialAchievementForm.setData(
                                                    'remarks',
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={
                                                specialAchievementForm.errors
                                                    .remarks
                                            }
                                        />
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={
                                                clearSpecialAchievementForm
                                            }
                                        >
                                            <X className="mr-1.5 h-4 w-4" />
                                            {t('Cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                specialAchievementForm.processing
                                            }
                                        >
                                            <Save className="mr-1.5 h-4 w-4" />
                                            {editingSpecialAchievementId
                                                ? t('Update')
                                                : t('Save')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {(specialAchievements?.records ?? []).length === 0 ? (
                            <div className="rounded-md border bg-card p-6 text-center text-muted-foreground">
                                {t('No special achievements yet.')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(specialAchievements?.records ?? []).map(
                                    (entry, index) => (
                                        <div
                                            key={entry.id}
                                            className={cn(
                                                'rounded-md border bg-card p-4',
                                                index % 2 === 0
                                                    ? 'border-muted-foreground/20'
                                                    : 'border-muted/50',
                                            )}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {displayValue(
                                                            entry.title,
                                                        )}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {t('Type')}:{' '}
                                                        {displayValue(
                                                            entry.achievement_type,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {t('Awarded on')}:{' '}
                                                    {displayValue(
                                                        entry.awarded_on,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                                <p>
                                                    {t('Issuing authority')}:{' '}
                                                    {displayValue(
                                                        entry.issuing_authority,
                                                    )}
                                                </p>
                                                <p>
                                                    {t('Order reference')}:{' '}
                                                    {displayValue(
                                                        entry.order_reference,
                                                    )}
                                                </p>
                                                <p>
                                                    {t('Place')}:{' '}
                                                    {displayValue(entry.place)}
                                                </p>
                                                <p>
                                                    {t('Order document')}:{' '}
                                                    {entry.order_document ? (
                                                        <a
                                                            href={
                                                                entry
                                                                    .order_document
                                                                    .preview_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="ml-1 text-xs text-primary underline"
                                                        >
                                                            {entry
                                                                .order_document
                                                                .original_name ??
                                                                t('View')}
                                                        </a>
                                                    ) : (
                                                        t('—')
                                                    )}
                                                </p>
                                                <p>
                                                    {t('Remarks')}:{' '}
                                                    {displayValue(
                                                        entry.remarks,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="mt-3 flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingSpecialAchievementId(
                                                            entry.id,
                                                        );
                                                        setAddingSpecialAchievement(
                                                            false,
                                                        );
                                                        specialAchievementForm.setData(
                                                            {
                                                                achievement_type:
                                                                    entry.achievement_type,
                                                                title: entry.title,
                                                                awarded_on:
                                                                    normalizeIsoDate(
                                                                        entry.awarded_on ??
                                                                            '',
                                                                    ) ?? '',
                                                                issuing_authority:
                                                                    entry.issuing_authority ??
                                                                    '',
                                                                order_reference:
                                                                    entry.order_reference ??
                                                                    '',
                                                                order_document:
                                                                    null,
                                                                place:
                                                                    entry.place ??
                                                                    '',
                                                                remarks:
                                                                    entry.remarks ??
                                                                    '',
                                                            },
                                                        );
                                                        specialAchievementForm.clearErrors();
                                                    }}
                                                >
                                                    <Pencil className="mr-1.5 h-4 w-4" />
                                                    {t('Edit')}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type="button"
                                                    onClick={() => {
                                                        setConfirmation({
                                                            open: true,
                                                            title: t(
                                                                'Remove special achievement',
                                                            ),
                                                            description: t(
                                                                'Do you want to remove this special achievement?',
                                                            ),
                                                            confirmLabel:
                                                                t('Delete'),
                                                            onConfirm: () =>
                                                                router.delete(
                                                                    `/incharges/${incharge.id}/special-achievements/${entry.id}`,
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                ),
                                                        });
                                                    }}
                                                >
                                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                                    {t('Delete')}
                                                </Button>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="teams" className="mt-4">
                        <div className="overflow-hidden rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16 text-center">
                                            {t('S. No.')}
                                        </TableHead>
                                        <TableHead>{t('Team')}</TableHead>
                                        <TableHead>{t('Session')}</TableHead>
                                        <TableHead>{t('Location')}</TableHead>
                                        <TableHead>
                                            {t('Assigned on')}
                                        </TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Notes')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(assignments ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                {t(
                                                    'No team assignments recorded yet.',
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (assignments ?? []).map(
                                            (assignment, index) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {assignment.team
                                                                ?.name ?? ''}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {displayValue(
                                                            assignment.team
                                                                ?.session
                                                                ?.name ??
                                                                assignment
                                                                    .session
                                                                    ?.name ??
                                                                '',
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {displayValue(
                                                            assignment.team
                                                                ?.location_label,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDateOnly(
                                                            assignment.assigned_at,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                assignment.is_current
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {assignment.is_current
                                                                ? t('Current')
                                                                : t('Past')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {displayValue(
                                                                assignment.assignment_reason,
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="changelog" className="mt-4">
                        <ChangeLog
                            entries={auditLog}
                            primaryEntity="Incharge"
                            storageKey="incharge-changelog-view"
                            endpoint={auditLogEndpoint}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

InchargesShow.layout = {
    breadcrumbs: [
        { title: 'Team Prabhari', href: InchargeController.index.url() },
    ],
};
