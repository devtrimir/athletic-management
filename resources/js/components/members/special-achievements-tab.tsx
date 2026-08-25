import { router, useForm } from '@inertiajs/react';
import {
    Award,
    Building2,
    CalendarDays,
    FileText,
    Hash,
    MapPin,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import {
    store as storeSpecialAchievement,
    update as updateSpecialAchievement,
    destroy as destroySpecialAchievement,
} from '@/actions/App/Http/Controllers/MemberSpecialAchievementController';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
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

const SPECIAL_ACHIEVEMENT_TYPES = [
    'COMMENDATION_DISC',
    'APPRECIATION_LETTER',
    'HONOUR_CERTIFICATE',
    'SPECIAL_RECOGNITION',
    'OTHER',
] as const;

type SpecialAchievementType = (typeof SPECIAL_ACHIEVEMENT_TYPES)[number];

export type SpecialAchievementRow = {
    id: number;
    achievement_type: SpecialAchievementType;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    order_document: {
        path: string;
        url: string;
        preview_url: string;
        download_url: string;
        original_name: string | null;
        mime_type: string | null;
        size_bytes: number | null;
    } | null;
    place: string | null;
    remarks: string | null;
};

export type SpecialAchievementsData = {
    records: SpecialAchievementRow[];
    summary: {
        total: number;
        commendation_discs: number;
    };
};

type SpecialAchievementFormData = {
    achievement_type: SpecialAchievementType | '';
    title: string;
    awarded_on: string;
    issuing_authority: string;
    order_reference: string;
    order_document: File | null;
    place: string;
    remarks: string;
};

type SpecialAchievementFormErrors = Partial<
    Record<keyof SpecialAchievementFormData, string>
>;

function defaults(row?: SpecialAchievementRow): SpecialAchievementFormData {
    return {
        achievement_type: row?.achievement_type ?? 'COMMENDATION_DISC',
        title: row?.title ?? '',
        awarded_on: row?.awarded_on ?? '',
        issuing_authority: row?.issuing_authority ?? '',
        order_reference: row?.order_reference ?? '',
        order_document: null,
        place: row?.place ?? '',
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

function typeLabel(value: string, t: (key: string) => string): string {
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

function fileSizeLabel(value: number | null): string | null {
    if (!value) {
        return null;
    }

    if (value < 1024 * 1024) {
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

function SpecialAchievementDialog({
    member,
    row,
}: {
    member: { id: number };
    row?: SpecialAchievementRow;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [visibleErrors, setVisibleErrors] =
        useState<SpecialAchievementFormErrors>({});
    const form = useForm<SpecialAchievementFormData>(defaults(row));
    const dialogOpen = open || Object.keys(visibleErrors).length > 0;
    const selectedDocumentName = form.data.order_document?.name;

    function reset(): void {
        form.setData(defaults(row));
        form.clearErrors();
        setVisibleErrors({});
    }

    function clearFieldError(field: keyof SpecialAchievementFormData): void {
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
        const awardedOn = normalizeDateInput(form.data.awarded_on);
        const clientErrors: SpecialAchievementFormErrors = {};

        form.clearErrors('title', 'awarded_on');
        setVisibleErrors({});

        if (!title) {
            clientErrors.title = t('Title is required.');
        }

        if (awardedOn === null) {
            clientErrors.awarded_on = t(
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
                form.setError(errors as SpecialAchievementFormErrors);
                setVisibleErrors(errors as SpecialAchievementFormErrors);
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

        if (row) {
            form.transform((data) => ({
                ...data,
                _method: 'PATCH',
                title,
                awarded_on: awardedOn ?? '',
            }));
            form.post(
                updateSpecialAchievement.url({
                    member,
                    specialAchievement: row,
                }),
                options,
            );

            return;
        }

        form.transform((data) => ({
            ...data,
            title,
            awarded_on: awardedOn ?? '',
        }));
        form.post(storeSpecialAchievement.url(member), options);
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
                        {t('Add special achievement')}
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
                            ? t('Edit special achievement')
                            : t('Add special achievement')}
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={submit}
                    className="mt-2 min-w-0 space-y-4"
                    noValidate
                >
                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label>
                                {t('Achievement type')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.data.achievement_type}
                                onValueChange={(value) => {
                                    form.setData(
                                        'achievement_type',
                                        value as SpecialAchievementType,
                                    );
                                    clearFieldError('achievement_type');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SPECIAL_ACHIEVEMENT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {typeLabel(type, t)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError
                                message={visibleErrors.achievement_type}
                            />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label
                                htmlFor={`special-achievement-awarded-on-${row?.id ?? 'new'}`}
                            >
                                {t('Award date')}
                            </Label>
                            <DatePicker
                                id={`special-achievement-awarded-on-${row?.id ?? 'new'}`}
                                value={form.data.awarded_on}
                                onChange={(value) => {
                                    form.setData('awarded_on', value);

                                    clearFieldError('awarded_on');
                                }}
                                aria-invalid={Boolean(visibleErrors.awarded_on)}
                                aria-describedby={`special-achievement-awarded-on-error-${row?.id ?? 'new'}`}
                            />
                            <InputError
                                id={`special-achievement-awarded-on-error-${row?.id ?? 'new'}`}
                                message={visibleErrors.awarded_on}
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label
                            htmlFor={`special-achievement-title-${row?.id ?? 'new'}`}
                        >
                            {t('Title')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`special-achievement-title-${row?.id ?? 'new'}`}
                            required
                            aria-invalid={Boolean(visibleErrors.title)}
                            aria-describedby={`special-achievement-title-error-${row?.id ?? 'new'}`}
                            value={form.data.title}
                            onChange={(event) => {
                                form.setData('title', event.target.value);
                                clearFieldError('title');
                            }}
                            maxLength={150}
                            placeholder={t('Example: Commendation Disc')}
                        />
                        <InputError
                            id={`special-achievement-title-error-${row?.id ?? 'new'}`}
                            message={visibleErrors.title}
                        />
                    </div>

                    <div className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Issuing authority')}</Label>
                            <Input
                                value={form.data.issuing_authority}
                                onChange={(event) => {
                                    form.setData(
                                        'issuing_authority',
                                        event.target.value,
                                    );
                                    clearFieldError('issuing_authority');
                                }}
                                maxLength={150}
                            />
                            <InputError
                                message={visibleErrors.issuing_authority}
                            />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input
                                value={form.data.order_reference}
                                onChange={(event) => {
                                    form.setData(
                                        'order_reference',
                                        event.target.value,
                                    );
                                    clearFieldError('order_reference');
                                }}
                                maxLength={100}
                            />
                            <InputError
                                message={visibleErrors.order_reference}
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label>{t('Order document')}</Label>
                        <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                            <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                <Upload className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium break-words">
                                    {selectedDocumentName ??
                                        row?.order_document?.original_name ??
                                        t('Upload order document')}
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
                                    form.setData(
                                        'order_document',
                                        event.target.files?.[0] ?? null,
                                    );
                                    clearFieldError('order_document');
                                }}
                            />
                        </label>
                        {form.progress ? (
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                        width: `${form.progress.percentage ?? 0}%`,
                                    }}
                                />
                            </div>
                        ) : null}
                        <InputError message={visibleErrors.order_document} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label>{t('Place')}</Label>
                        <Input
                            value={form.data.place}
                            onChange={(event) => {
                                form.setData('place', event.target.value);
                                clearFieldError('place');
                            }}
                            maxLength={150}
                        />
                        <InputError message={visibleErrors.place} />
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

export function SpecialAchievementsTab({
    member,
    data,
}: {
    member: { id: number };
    data: SpecialAchievementsData | undefined;
}) {
    const { t } = useTranslation();
    const records = data?.records ?? [];
    const total = data?.summary.total ?? 0;
    const commendationDiscs = data?.summary.commendation_discs ?? 0;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                            <Award className="size-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">
                                {t('Special achievements')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Standalone departmental recognitions, separate from medals and legacy achievements.',
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
                            {t('Commendation discs')}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                            {commendationDiscs}
                        </div>
                    </div>
                    <SpecialAchievementDialog member={member} />
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm leading-none font-semibold">
                            {t('Recognition records')}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t(
                                'Track the order, authority, place, and protected document for each recognition.',
                            )}
                        </p>
                    </div>
                </div>

                {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="rounded-full bg-muted p-3 text-muted-foreground">
                            <ShieldCheck className="size-6" />
                        </div>
                        <h4 className="mt-4 text-sm font-semibold">
                            {t('No special achievements recorded')}
                        </h4>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {t(
                                'Add commendation discs, appreciation letters, honour certificates, or other standalone recognitions here.',
                            )}
                        </p>
                        <div className="mt-5">
                            <SpecialAchievementDialog member={member} />
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
                                        <Badge
                                            variant="outline"
                                            className="gap-1.5"
                                        >
                                            <Award className="size-3.5" />
                                            {typeLabel(row.achievement_type, t)}
                                        </Badge>
                                        {row.place ? (
                                            <Badge
                                                variant="secondary"
                                                className="gap-1.5"
                                            >
                                                <MapPin className="size-3" />
                                                {row.place}
                                            </Badge>
                                        ) : null}
                                        {row.order_document ? (
                                            <Badge
                                                variant="secondary"
                                                className="gap-1.5"
                                            >
                                                <ShieldCheck className="size-3" />
                                                {t('Private document')}
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <div>
                                        <h4 className="text-base leading-6 font-semibold">
                                            {row.title}
                                        </h4>
                                        {row.remarks ? (
                                            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                                {row.remarks}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="flex gap-2">
                                            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Award date')}
                                                </div>
                                                <div>
                                                    {formatDate(row.awarded_on)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Authority')}
                                                </div>
                                                <div className="truncate">
                                                    {row.issuing_authority ??
                                                        '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Hash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Order reference')}
                                                </div>
                                                <div className="truncate">
                                                    {row.order_reference ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    {t('Order document')}
                                                </div>
                                                <div className="truncate">
                                                    {row.order_document
                                                        ? (row.order_document
                                                              .original_name ??
                                                          t('Attached'))
                                                        : '—'}
                                                </div>
                                                {row.order_document
                                                    ?.size_bytes ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        {fileSizeLabel(
                                                            row.order_document
                                                                .size_bytes,
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 lg:items-start">
                                    {row.order_document ? (
                                        <ConfidentialDocumentPreview
                                            document={row.order_document}
                                            subtitle={row.title}
                                            sizeLabel={fileSizeLabel(
                                                row.order_document.size_bytes,
                                            )}
                                        />
                                    ) : null}
                                    <SpecialAchievementDialog
                                        member={member}
                                        row={row}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 text-destructive hover:text-destructive"
                                        onClick={() =>
                                            router.delete(
                                                destroySpecialAchievement.url({
                                                    member,
                                                    specialAchievement: row,
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
