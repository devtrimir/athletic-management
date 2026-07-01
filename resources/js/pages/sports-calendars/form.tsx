import { Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarRange,
    CalendarSearch,
    FileText,
    FileUp,
} from 'lucide-react';

import type {
    store,
    update,
} from '@/actions/App/Http/Controllers/SportsCalendarController';
import { index } from '@/actions/App/Http/Controllers/SportsCalendarController';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Document = {
    name: string | null;
    original_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    preview_url: string;
    download_url: string;
};

export type SportsCalendar = {
    id: number;
    year: number;
    competition_name: string;
    proposed_month: string;
    proposed_month_annual: string | null;
    proposed_venue: string;
    report_arrived: boolean;
    report_pdf?: Document | null;
};

type CalendarFormData = {
    year: string;
    competition_name: string;
    proposed_month: string;
    proposed_month_annual: string;
    proposed_venue: string;
    report_arrived: boolean;
    report_pdf: File | null;
};

type Props = {
    title: string;
    description: string;
    action: ReturnType<typeof store> | ReturnType<typeof update>;
    years: (string | number)[];
    calendar?: SportsCalendar;
};

function fileSizeLabel(value: number | null): string | null {
    if (!value) {
        return null;
    }

    if (value < 1024 * 1024) {
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function SportsCalendarForm({
    title,
    description,
    action,
    years,
    calendar,
}: Props) {
    const { t } = useTranslation();
    const orderedYears = [
        ...new Set(years.map(String).sort((a, b) => Number(b) - Number(a))),
    ];
    const form = useForm<CalendarFormData>({
        year: calendar?.year
            ? String(calendar.year)
            : String(new Date().getFullYear()),
        competition_name: calendar?.competition_name ?? '',
        proposed_month: calendar?.proposed_month ?? '',
        proposed_month_annual: calendar?.proposed_month_annual ?? '',
        proposed_venue: calendar?.proposed_venue ?? '',
        report_arrived: calendar?.report_arrived ?? false,
        report_pdf: null,
    });

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const method = action.method.toLowerCase();

        if (method === 'post' && typeof form.post === 'function') {
            form.post(action.url, { forceFormData: true });

            return;
        }

        if (method === 'put' && typeof form.put === 'function') {
            form.put(action.url, { forceFormData: true });

            return;
        }

        if (typeof (form as { submit?: unknown }).submit === 'function') {
            (
                form as {
                    submit: (
                        method: 'post' | 'put',
                        url: string,
                        options?: {
                            forceFormData?: boolean;
                        },
                    ) => void;
                }
            ).submit(method as 'post' | 'put', action.url, {
                forceFormData: true,
            });
        }
    }

    const hasStoredPdf =
        calendar?.report_pdf !== null && calendar?.report_pdf !== undefined;
    const selectedPdfName = form.data.report_pdf?.name ?? null;
    const selectedPdfSize = form.data.report_pdf?.size ?? null;
    const shouldShowPdfInput = form.data.report_arrived;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Heading title={title} description={description} />
                <Button asChild variant="outline">
                    <Link href={index.url()}>
                        <ArrowLeft className="size-4" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center gap-3 border-b px-6 py-4">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarSearch className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                {t('Competition details')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Set competition year, name, month and venue for annual sports events.',
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-6 p-6">
                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="year">
                                    {t('Year')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.data.year}
                                    onValueChange={(value) => {
                                        form.setData('year', value);
                                        form.clearErrors('year');
                                    }}
                                    required
                                >
                                    <SelectTrigger id="year">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orderedYears.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.year} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="competition_name">
                                    {t('Competition name')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="competition_name"
                                    value={form.data.competition_name}
                                    onChange={(event) => {
                                        form.setData(
                                            'competition_name',
                                            event.target.value,
                                        );
                                        form.clearErrors('competition_name');
                                    }}
                                    required
                                />
                                <InputError
                                    message={form.errors.competition_name}
                                />
                            </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="proposed_month">
                                    {t(
                                        'Inter-unit / District competition month',
                                    )}
                                    <span className="text-destructive"> *</span>
                                </Label>
                                <Input
                                    id="proposed_month"
                                    value={form.data.proposed_month}
                                    onChange={(event) => {
                                        form.setData(
                                            'proposed_month',
                                            event.target.value,
                                        );
                                        form.clearErrors('proposed_month');
                                    }}
                                    placeholder={t(
                                        'Example: January, First week',
                                    )}
                                />
                                <InputError
                                    message={form.errors.proposed_month}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="proposed_month_annual">
                                    {t('UP Police annual competition month')}
                                    <span className="text-destructive"> *</span>
                                </Label>
                                <Input
                                    id="proposed_month_annual"
                                    value={form.data.proposed_month_annual}
                                    onChange={(event) => {
                                        form.setData(
                                            'proposed_month_annual',
                                            event.target.value,
                                        );
                                        form.clearErrors(
                                            'proposed_month_annual',
                                        );
                                    }}
                                    placeholder={t(
                                        'Example: January, First week',
                                    )}
                                />
                                <InputError
                                    message={form.errors.proposed_month_annual}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="proposed_venue">
                                {t('Proposed venue')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="proposed_venue"
                                rows={2}
                                value={form.data.proposed_venue}
                                onChange={(event) => {
                                    form.setData(
                                        'proposed_venue',
                                        event.target.value,
                                    );
                                    form.clearErrors('proposed_venue');
                                }}
                                required
                            />
                            <InputError message={form.errors.proposed_venue} />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.report_arrived}
                                onCheckedChange={(checked) => {
                                    form.setData(
                                        'report_arrived',
                                        checked === true,
                                    );
                                    if (!checked) {
                                        form.clearErrors('report_pdf');
                                    }
                                }}
                            />
                            <span>{t('Report arrived')}</span>
                        </label>
                        {form.data.report_arrived ? (
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    'Enable and upload the report PDF for this competition.',
                                )}
                            </p>
                        ) : null}
                    </div>
                </div>

                {shouldShowPdfInput ? (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <div className="flex items-center gap-3 border-b px-6 py-4">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FileText className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t('Competition report PDF')}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {t('PDF files only.')}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-5 p-6">
                            {hasStoredPdf && form.data.report_pdf === null ? (
                                <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground">
                                                {calendar?.report_pdf
                                                    ?.original_name ??
                                                    calendar?.report_pdf
                                                        ?.name ??
                                                    t('Current report')}
                                            </p>
                                            {calendar?.report_pdf
                                                ?.size_bytes ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {fileSizeLabel(
                                                        calendar.report_pdf
                                                            .size_bytes,
                                                    )}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            {calendar?.report_pdf ? (
                                                <ConfidentialDocumentPreview
                                                    document={{
                                                        ...calendar.report_pdf,
                                                    }}
                                                    sizeLabel={fileSizeLabel(
                                                        calendar.report_pdf
                                                            .size_bytes,
                                                    )}
                                                    triggerLabel={t('View')}
                                                />
                                            ) : null}
                                            {calendar?.report_pdf ? (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={
                                                            calendar.report_pdf
                                                                .download_url
                                                        }
                                                        className="gap-1.5"
                                                    >
                                                        <CalendarRange className="size-3.5" />
                                                        {t('Download')}
                                                    </a>
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                                <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                    <FileUp className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium break-words">
                                        {selectedPdfName ??
                                            t('Upload report PDF')}
                                    </span>
                                    {selectedPdfSize ? (
                                        <span className="mt-1 block text-xs break-words text-muted-foreground">
                                            {fileSizeLabel(selectedPdfSize)}
                                        </span>
                                    ) : null}
                                    <span className="mt-1 block text-xs break-words text-muted-foreground">
                                        {t('PDF up to 10 MB.')}
                                    </span>
                                </span>
                                <Input
                                    className="sr-only"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(event) => {
                                        form.setData(
                                            'report_pdf',
                                            event.target.files?.[0] ?? null,
                                        );
                                        form.clearErrors('report_pdf');
                                    }}
                                />
                            </label>
                            <InputError message={form.errors.report_pdf} />
                        </div>
                    </div>
                ) : null}

                <div className="flex justify-end gap-2">
                    <Button asChild variant="outline">
                        <Link href={index.url()}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
