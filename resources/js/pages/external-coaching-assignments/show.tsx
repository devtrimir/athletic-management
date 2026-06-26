import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, Pencil } from 'lucide-react';

import { edit, index } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import Heading from '@/components/heading';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

type Assignment = {
    id: number;
    start_date: string;
    end_date: string;
    training_days: string[] | null;
    training_start_time: string | null;
    training_end_time: string | null;
    attendance_mode: string;
    permission_reference_number: string | null;
    permission_document?: {
        name: string | null;
        original_name: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        preview_url: string;
        download_url: string;
    } | null;
    status: string;
    remarks: string | null;
    member?: { full_name: string; pno: string | null } | null;
    external_coach?: { name: string; email: string | null; phone: string | null } | null;
    training_venue?: { name: string } | null;
    sport?: { name: string } | null;
};

export default function ExternalCoachingAssignmentsShow({ assignment }: { assignment: Assignment }) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale: string };
    const title = assignment.member?.full_name ?? t('External coaching assignment');
    const period = [formatDisplayDate(assignment.start_date, locale), formatDisplayDate(assignment.end_date, locale)].filter(Boolean).join(' - ');

    return (
        <>
            <Head title={title} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading title={title} description={period} />
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={index.url()}>
                                <ArrowLeft className="size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={edit.url(assignment)}>
                                <Pencil className="size-4" />
                                {t('Edit')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label={t('Status')} value={<Badge>{t(assignment.status)}</Badge>} />
                        <Detail label={t('Member PNO')} value={assignment.member?.pno || t('Not set')} />
                        <Detail label={t('Coach')} value={assignment.external_coach?.name || t('Not set')} />
                        <Detail label={t('Venue')} value={assignment.training_venue?.name || t('Not set')} />
                        <Detail label={t('Sport')} value={assignment.sport?.name || t('Not set')} />
                        <Detail label={t('Attendance mode')} value={t(assignment.attendance_mode)} />
                        <Detail label={t('Training time')} value={assignment.training_start_time && assignment.training_end_time ? `${assignment.training_start_time} - ${assignment.training_end_time}` : t('Not set')} />
                        <Detail label={t('Training days')} value={assignment.training_days?.length ? assignment.training_days.map((day) => t(day)).join(', ') : t('Not set')} />
                        <Detail label={t('Permission reference')} value={assignment.permission_reference_number || t('Not set')} />
                    </div>
                    {assignment.permission_document ? (
                        <div className="border-t p-6">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">{t('Permission document')}</div>
                                    <div className="text-sm font-medium">
                                        {assignment.permission_document.name ?? assignment.permission_document.original_name ?? t('Attached document')}
                                    </div>
                                    {fileSizeLabel(assignment.permission_document.size_bytes) ? (
                                        <div className="text-xs text-muted-foreground">
                                            {fileSizeLabel(assignment.permission_document.size_bytes)}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex gap-2">
                                    <ConfidentialDocumentPreview
                                        document={{
                                            ...assignment.permission_document,
                                        }}
                                        sizeLabel={fileSizeLabel(assignment.permission_document.size_bytes)}
                                        triggerLabel={t('View')}
                                    />
                                    <Button asChild size="sm" variant="outline" className="h-8">
                                        <a href={assignment.permission_document.download_url} className="gap-1.5">
                                            <Download className="size-3.5" />
                                            {t('Download')}
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {assignment.remarks ? (
                        <div className="border-t p-6">
                            <Detail label={t('Remarks')} value={assignment.remarks} />
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="text-sm">{value}</div>
        </div>
    );
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

function parseDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string | null | undefined, locale: string): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}
