import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    ClipboardCheck,
    FileText,
    MapPin,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type Attendance = {
    id: number;
    attendance_date: string;
    attendance_status: string;
    corrected_attendance_status: string | null;
    geo_status: string;
    review_status: string;
    flag_reason: string | null;
    coach_remarks: string | null;
    review_remarks: string | null;
    reviewed_at: string | null;
    submitted_at: string;
    submitted_latitude: string | null;
    submitted_longitude: string | null;
    submitted_gps_accuracy: number | null;
    distance_from_venue_meters: string | null;
    venue_latitude_snapshot: string | null;
    venue_longitude_snapshot: string | null;
    allowed_radius_meters_snapshot: number | null;
    ip_address: string | null;
    user_agent: string | null;
    submitted_photo_mime_type: string | null;
    submitted_photo_size_bytes: number | null;
    submitted_photo_uploaded_at: string | null;
    submitted_photo_width: number | null;
    submitted_photo_height: number | null;
    submitted_photo_source: string | null;
    member: {
        id: number;
        full_name: string;
        member_code: string | null;
        pno: string | null;
    };
    external_coach: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
    };
    training_venue: { name: string; address: string | null };
    assignment: {
        start_date: string;
        end_date: string;
        status: string;
        sport: { name: string } | null;
    } | null;
    reviewer: { name: string } | null;
    photo: {
        name: string | null;
        preview_url: string;
        download_url: string;
    } | null;
};

type Props = {
    attendance: Attendance;
    reviewActions: string[];
    attendanceStatuses: string[];
};

export default function ExternalTrainingAttendanceShow({
    attendance,
    reviewActions,
    attendanceStatuses,
}: Props) {
    const { t } = useTranslation();
    const [reviewAction, setReviewAction] = useState('');
    const [correctedStatus, setCorrectedStatus] = useState(
        attendance.corrected_attendance_status ?? attendance.attendance_status,
    );
    const canCorrectAttendance = reviewActions.includes('correct');

    function updateCorrectedStatus(status: string): void {
        if (!canCorrectAttendance) {
            return;
        }

        setCorrectedStatus(status);
        setReviewAction('correct');
    }

    return (
        <>
            <Head title={t('Review attendance')} />

            <div className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-normal text-muted-foreground uppercase">
                            <ClipboardCheck className="size-3.5" />
                            {t('External training attendance')}
                        </div>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight">
                            {t('Review attendance')}
                        </h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className={attendanceStatusBadgeClass(
                                    attendance.attendance_status,
                                )}
                            >
                                {t(attendance.attendance_status)}
                            </Badge>
                            {attendance.review_status === 'corrected' &&
                            attendance.corrected_attendance_status ? (
                                <Badge
                                    variant="outline"
                                    className={attendanceStatusBadgeClass(
                                        attendance.corrected_attendance_status,
                                    )}
                                >
                                    {`${t('Corrected to')} ${t(attendance.corrected_attendance_status)}`}
                                </Badge>
                            ) : null}
                            <Badge
                                variant={
                                    attendance.geo_status === 'valid'
                                        ? 'secondary'
                                        : 'destructive'
                                }
                            >
                                {t(attendance.geo_status)}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={reviewActionBadgeClass(
                                    attendance.review_status,
                                )}
                            >
                                {reviewActionLabel(attendance.review_status, t)}
                            </Badge>
                        </div>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/external-training-attendances">
                            <ArrowLeft className="size-4" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <section className="grid gap-4 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="flex items-center gap-3 border-b px-4 py-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <UserRound className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-semibold">
                                        {t('Attendance record')}
                                    </h2>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {attendance.member.full_name} ·{' '}
                                        {attendance.training_venue.name}
                                    </p>
                                </div>
                            </div>
                            <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                                <DetailLink
                                    label={t('Member')}
                                    value={attendance.member.full_name}
                                    href={`/members/${attendance.member.id}`}
                                />
                                <DetailLink
                                    label={t('External coach')}
                                    value={attendance.external_coach.name}
                                    href={`/external-coaches/${attendance.external_coach.id}`}
                                />
                                <DetailItem
                                    label={t('Date')}
                                    value={formatDate(
                                        attendance.attendance_date,
                                    )}
                                />
                                <DetailItem
                                    label={t('Sport')}
                                    value={
                                        attendance.assignment?.sport?.name ??
                                        '-'
                                    }
                                />
                                <DetailItem
                                    label={t('Venue')}
                                    value={attendance.training_venue.name}
                                />
                                <DetailItem
                                    label={t('Coach submitted status')}
                                    value={t(attendance.attendance_status)}
                                />
                                <DetailItem
                                    label={t('Corrected status')}
                                    value={
                                        attendance.corrected_attendance_status
                                            ? t(
                                                  attendance.corrected_attendance_status,
                                              )
                                            : '-'
                                    }
                                />
                            </dl>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="flex items-center gap-3 border-b px-4 py-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <MapPin className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Location verification')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Submitted location compared with the configured venue radius.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                                <DetailItem
                                    label={t('Submitted coordinates')}
                                    value={`${attendance.submitted_latitude ?? '-'}, ${attendance.submitted_longitude ?? '-'}`}
                                />
                                <DetailItem
                                    label={t('Venue coordinates')}
                                    value={`${attendance.venue_latitude_snapshot ?? '-'}, ${attendance.venue_longitude_snapshot ?? '-'}`}
                                />
                                <DetailItem
                                    label={t('Allowed radius')}
                                    value={`${attendance.allowed_radius_meters_snapshot ?? '-'} m`}
                                />
                                <DetailItem
                                    label={t('Distance')}
                                    value={`${attendance.distance_from_venue_meters ?? '-'} m`}
                                />
                                <DetailItem
                                    label={t('GPS accuracy')}
                                    value={`${attendance.submitted_gps_accuracy ?? '-'} m`}
                                />
                                <DetailItem
                                    label={t('IP address')}
                                    value={attendance.ip_address ?? '-'}
                                />
                                <DetailItem
                                    label={t('Reviewed by')}
                                    value={attendance.reviewer?.name ?? '-'}
                                />
                                <DetailItem
                                    label={t('Reviewed at')}
                                    value={
                                        attendance.reviewed_at
                                            ? formatDateTime(
                                                  attendance.reviewed_at,
                                              )
                                            : '-'
                                    }
                                />
                            </dl>
                        </div>

                        <section className="overflow-hidden rounded-lg border bg-card lg:col-span-2">
                            <div className="flex items-center gap-3 border-b px-4 py-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Camera className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Proof photo')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {attendance.photo?.name ??
                                            t('No file attached')}
                                    </p>
                                </div>
                            </div>
                            <div className="grid lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
                                {attendance.photo ? (
                                    <a
                                        href={attendance.photo.preview_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                    >
                                        <img
                                            src={attendance.photo.preview_url}
                                            alt={
                                                attendance.photo.name ??
                                                t('Proof photo')
                                            }
                                            className="aspect-[4/3] w-full object-cover"
                                        />
                                    </a>
                                ) : (
                                    <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                                        {t('No proof photo')}
                                    </div>
                                )}
                                {attendance.photo ? (
                                    <dl className="grid content-start gap-3 border-t p-4 text-sm sm:grid-cols-2 lg:border-t-0 lg:border-l">
                                        <DetailItem
                                            label={t('File name')}
                                            value={attendance.photo.name ?? '-'}
                                        />
                                        <DetailItem
                                            label={t('File type')}
                                            value={
                                                attendance.submitted_photo_mime_type ??
                                                '-'
                                            }
                                        />
                                        <DetailItem
                                            label={t('File size')}
                                            value={formatFileSize(
                                                attendance.submitted_photo_size_bytes,
                                            )}
                                        />
                                        <DetailItem
                                            label={t('Photo source')}
                                            value={photoSourceLabel(
                                                attendance.submitted_photo_source,
                                                t,
                                            )}
                                        />
                                        <DetailItem
                                            label={t('Image dimensions')}
                                            value={
                                                attendance.submitted_photo_width &&
                                                attendance.submitted_photo_height
                                                    ? `${attendance.submitted_photo_width} x ${attendance.submitted_photo_height}px`
                                                    : '-'
                                            }
                                        />
                                        <DetailItem
                                            label={t('Uploaded at')}
                                            value={
                                                attendance.submitted_photo_uploaded_at
                                                    ? formatDateTime(
                                                          attendance.submitted_photo_uploaded_at,
                                                      )
                                                    : '-'
                                            }
                                        />
                                    </dl>
                                ) : null}
                            </div>
                        </section>

                        <div className="overflow-hidden rounded-lg border bg-card lg:col-span-2">
                            <div className="flex items-center gap-3 border-b px-4 py-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <FileText className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Remarks')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Coach notes, system flags, and review remarks.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 p-4 text-sm">
                                <RemarkBlock
                                    label={t('Coach remarks')}
                                    value={attendance.coach_remarks ?? '-'}
                                />
                                {attendance.flag_reason ? (
                                    <RemarkBlock
                                        label={t('Flag reason')}
                                        value={attendance.flag_reason}
                                        tone="danger"
                                    />
                                ) : null}
                                {attendance.review_remarks ? (
                                    <RemarkBlock
                                        label={t('Review remarks')}
                                        value={attendance.review_remarks}
                                        tone="info"
                                    />
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <aside className="space-y-4 xl:sticky xl:top-4">
                        <Form
                            action={`/external-training-attendances/${attendance.id}/review`}
                            method="post"
                            className="space-y-4 rounded-lg border bg-card p-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="flex items-center gap-3 border-b pb-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                            <ShieldCheck className="size-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-semibold">
                                                {t('Review action')}
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Update the verification outcome for this attendance.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="hidden"
                                        name="_method"
                                        value="patch"
                                    />
                                    <input
                                        type="hidden"
                                        name="action"
                                        value={reviewAction}
                                    />
                                    <input
                                        type="hidden"
                                        name="attendance_status"
                                        value={correctedStatus}
                                    />
                                    <div className="grid gap-2">
                                        <Label htmlFor="action">
                                            {t('Action')}
                                        </Label>
                                        <Select
                                            value={reviewAction}
                                            onValueChange={setReviewAction}
                                            required
                                        >
                                            <SelectTrigger id="action">
                                                <SelectValue
                                                    placeholder={t(
                                                        'Select action',
                                                    )}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reviewActions.map((action) => (
                                                    <SelectItem
                                                        key={action}
                                                        value={action}
                                                    >
                                                        {reviewFormActionLabel(
                                                            action,
                                                            t,
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.action} />
                                    </div>

                                    {canCorrectAttendance ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="attendance_status">
                                                {t('Corrected status')}
                                            </Label>
                                            <Select
                                                value={correctedStatus}
                                                onValueChange={
                                                    updateCorrectedStatus
                                                }
                                            >
                                                <SelectTrigger id="attendance_status">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select status',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {attendanceStatuses.map(
                                                        (status) => (
                                                            <SelectItem
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {t(status)}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Changing this value will save the review as Correct status.',
                                                )}
                                            </p>
                                            <InputError
                                                message={
                                                    errors.attendance_status
                                                }
                                            />
                                        </div>
                                    ) : null}

                                    <div className="grid gap-2">
                                        <Label htmlFor="review_remarks">
                                            {t('Review remarks')}
                                        </Label>
                                        <Textarea
                                            id="review_remarks"
                                            name="review_remarks"
                                            rows={3}
                                        />
                                        <InputError
                                            message={errors.review_remarks}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full"
                                    >
                                        {t('Save review')}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </aside>
                </div>
            </div>
        </>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-1 font-medium break-words text-foreground">
                {value}
            </dd>
        </div>
    );
}

function DetailLink({
    label,
    value,
    href,
}: {
    label: string;
    value: string;
    href: string;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-1 font-medium break-words">
                <Link href={href} className="text-primary hover:underline">
                    {value}
                </Link>
            </dd>
        </div>
    );
}

function RemarkBlock({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string;
    tone?: 'default' | 'danger' | 'info';
}) {
    const toneClass = {
        default: 'border-border bg-muted/30 text-foreground',
        danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-100',
        info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-100',
    }[tone];

    return (
        <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
            <div className="text-xs font-medium opacity-75">{label}</div>
            <p className="mt-1 break-words">{value}</p>
        </div>
    );
}

function formatDate(value: string): string {
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

function formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatFileSize(value: number | null): string {
    if (!value) {
        return '-';
    }

    if (value < 1024 * 1024) {
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function photoSourceLabel(
    source: string | null,
    t: (key: string) => string,
): string {
    if (source === 'camera') {
        return t('Captured from camera');
    }

    if (source === 'upload') {
        return t('Uploaded from device');
    }

    return '-';
}

function reviewFormActionLabel(
    action: string,
    t: (key: string) => string,
): string {
    const labels: Record<string, string> = {
        accept: t('Accept'),
        reject: t('Reject'),
        correct: t('Correct status'),
        manual_review: t('Mark for manual review'),
        lock: t('Lock review'),
    };

    return labels[action] ?? t(action);
}

function reviewActionLabel(status: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        pending: t('Pending review'),
        accepted: t('Accepted'),
        rejected: t('Rejected'),
        corrected: t('Corrected'),
        locked: t('Locked'),
    };

    return labels[status] ?? t(status);
}

function reviewActionBadgeClass(status: string): string {
    switch (status) {
        case 'accepted':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'rejected':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'corrected':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'locked':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        case 'pending':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function attendanceStatusBadgeClass(status: string): string {
    switch (status) {
        case 'present':
            return 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'late':
            return 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        case 'absent':
            return 'border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-50 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'excused':
            return 'border border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-50 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'not_marked':
            return 'border border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        default:
            return 'border border-muted bg-muted text-muted-foreground hover:bg-muted';
    }
}
