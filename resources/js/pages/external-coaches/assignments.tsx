import { Head, Link, router, usePage } from '@inertiajs/react';
import { Download, List, Printer } from 'lucide-react';
import { useCallback } from 'react';

import { ListingPagination } from '@/components/listing-pagination';
import type { PaginatedListing } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
};

type Assignment = {
    id: number;
    member?: {
        id: number;
        full_name: string;
        pno: string | null;
        mobile: string | null;
        current_status: string | null;
        rank: string | null;
    } | null;
    sport?: { id: number; name: string } | null;
    training_venue?: { id: number; name: string } | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    attendance_mode: string;
    created_at: string | null;
    updated_at: string | null;
    approved_at: string | null;
    cancellation_reason: string | null;
    completion_remarks: string | null;
    remarks: string | null;
};

type AssignmentStatusRow = {
    label: string;
    value: string;
};

type PaginatedAssignments = PaginatedListing & {
    data: Assignment[];
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

const MINI_TABLE_CLASS = 'w-full text-xs border border-muted/40 border-separate border-spacing-0';
const MINI_HEADER_CELL_CLASS = 'border-r border-b border-muted/40 bg-muted/20 px-2 py-1 text-muted-foreground';
const MINI_VALUE_CELL_CLASS = 'border-b border-muted/40 px-2 py-1';

type Props = {
    externalCoach: ExternalCoach;
    assignments: PaginatedAssignments;
    activeAssignmentMemberIds: number[];
    activeAssignmentsCount: number;
    filters: {
        search: string;
        status: string;
        active: string;
    };
    statusOptions: string[];
    perPage: number;
};

function parseDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value: string | null, locale: string): string {
    const date = parseDate(value);

    if (date === null) {
        return '-';
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}

const ATTENDANCE_MODE_LABELS: Record<string, string> = {
    single_mark: 'Single Mark',
    check_in_check_out: 'Check In / Check Out',
};

function formatAttendanceMode(value: string, t: (key: string) => string): string {
    const label = ATTENDANCE_MODE_LABELS[value] ?? value;

    return t(
        label
            .split(' ')
            .map((word) => (word ? `${word[0]?.toUpperCase()}${word.slice(1)}` : ''))
            .join(' '),
    );
}

function assignmentStatusHistory(
    assignment: Assignment,
    t: (key: string) => string,
    locale: string,
): string {
    const items = [`${t('Created')}: ${formatDate(assignment.created_at, locale)}`];
    const extra = [
        `${t('Last update')}: ${formatDate(assignment.updated_at, locale)}`,
        assignment.approved_at
            ? `${t('Approved')}: ${formatDate(assignment.approved_at, locale)}`
            : null,
        assignment.cancellation_reason
            ? `${t('Cancellation reason')}: ${assignment.cancellation_reason}`
            : null,
        assignment.completion_remarks
            ? `${t('Completion remarks')}: ${assignment.completion_remarks}`
            : null,
        assignment.remarks ? `${t('Remarks')}: ${assignment.remarks}` : null,
    ];

    return [...items, ...extra.filter((item): item is string => item !== null)].join(' | ');
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('\n', '<br/>');
}

function assignmentStatusRows(
    assignment: Assignment,
    t: (key: string) => string,
    locale: string,
): AssignmentStatusRow[] {
    return [
        { label: t('Created'), value: formatDate(assignment.created_at, locale) },
        { label: t('Last update'), value: formatDate(assignment.updated_at, locale) },
        assignment.approved_at
            ? { label: t('Approved'), value: formatDate(assignment.approved_at, locale) }
            : null,
        assignment.cancellation_reason
            ? {
                  label: t('Cancellation reason'),
                  value: assignment.cancellation_reason,
              }
            : null,
        assignment.completion_remarks
            ? {
                  label: t('Completion remarks'),
                  value: assignment.completion_remarks,
              }
            : null,
        assignment.remarks ? { label: t('Remarks'), value: assignment.remarks } : null,
    ].filter((item): item is AssignmentStatusRow => item !== null);
}

export default function ExternalCoachesAssignments({
    externalCoach,
    assignments,
    activeAssignmentMemberIds,
    activeAssignmentsCount,
    filters,
    statusOptions,
    perPage,
}: Props) {
    const { t } = useTranslation();
    const { locale: appLocale } = usePage().props as { locale?: string };
    const locale = appLocale ?? 'en';

    const isActiveNow = (assignment: Assignment): boolean =>
        assignment.member?.id !== undefined
            ? activeAssignmentMemberIds.includes(assignment.member.id)
            : false;
    const activeFilter = filters.active !== '' ? filters.active : 'all';
    const statusFilter = filters.status !== '' ? filters.status : 'all';
    const searchText = filters.search ?? '';

    const changeRowsPerPage = useCallback(
        (value: number) => {
            const params = new URLSearchParams(window.location.search);

            params.set('per_page', String(value));
            params.delete('page');

            const queryString = params.toString();
            const base = `/external-coaches/${externalCoach.id}/assignments`;
            const target = `${base}${queryString ? `?${queryString}` : ''}`;

            router.get(target, {}, { preserveState: false, replace: true });
        },
        [externalCoach.id],
    );

    function exportAssignments() {
        const headers = [
            t('S.No.'),
            t('Player'),
            t('Assignment details'),
            t('Assignment status'),
            t('Status timeline'),
        ];

        const rows = assignments.data.map((assignment, index) => [
            (index + 1).toString(),
            `${t('Player')}: ${assignment.member?.full_name ?? '-'} | ${t('Rank')}: ${assignment.member?.rank ?? '-'} | ${t('PNO')}: ${assignment.member?.pno ?? '-'} | ${t('Phone')}: ${assignment.member?.mobile ?? '-'}`,
            `${t('Sport')}: ${assignment.sport?.name ?? '-'} | ${t('Venue')}: ${assignment.training_venue?.name ?? '-'} | ${t('Attendance')}: ${formatAttendanceMode(assignment.attendance_mode, t)} | ${t('Period')}: ${formatDate(assignment.start_date, locale)} - ${formatDate(assignment.end_date, locale)}`,
            `${t('Assignment status')}: ${t(assignment.status)} | ${t('Player status')}: ${assignment.member?.current_status ? t(assignment.member.current_status) : '-'} | ${t('Active now')}: ${isActiveNow(assignment) ? t('Yes') : t('No')}`,
            assignmentStatusHistory(assignment, t, locale),
        ]);

        const escapeCsvCell = (value: string | number | null): string => {
            const text = String(value ?? '').replaceAll('"', '""');

            return `"${text}"`;
        };

        const csv = [
            headers.map(escapeCsvCell).join(','),
            ...rows.map((row) => row.map(escapeCsvCell).join(',')),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `external-coach-${externalCoach.id}-assignments-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    function printAssignments() {
        const rows = assignments.data
            .map((assignment, index) => {
                const timelineRows = assignmentStatusRows(assignment, t, locale);

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <table class="mini">
                                <tbody>
                                    <tr><td class="mini-label">${escapeHtml(t('Player'))}</td><td class="mini-value"><strong>${escapeHtml(
                                        assignment.member?.full_name ?? '-',
                                    )}</strong></td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Rank'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.member?.rank ?? '-',
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('PNO'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.member?.pno ?? '-',
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Phone'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.member?.mobile ?? '-',
                                    )}</td></tr>
                                </tbody>
                            </table>
                        </td>
                        <td>
                            <table class="mini">
                                <tbody>
                                    <tr><td class="mini-label">${escapeHtml(t('Sport'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.sport?.name ?? '-',
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Venue'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.training_venue?.name ?? '-',
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Attendance'))}</td><td class="mini-value">${escapeHtml(
                                        formatAttendanceMode(assignment.attendance_mode, t),
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Period'))}</td><td class="mini-value">${escapeHtml(
                                        `${formatDate(assignment.start_date, locale)} - ${formatDate(assignment.end_date, locale)}`,
                                    )}</td></tr>
                                </tbody>
                            </table>
                        </td>
                        <td>
                            <table class="mini">
                                <tbody>
                                    <tr><td class="mini-label">${escapeHtml(t('Assignment status'))}</td><td class="mini-value">${escapeHtml(
                                        t(assignment.status),
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Player status'))}</td><td class="mini-value">${escapeHtml(
                                        assignment.member?.current_status ? t(assignment.member.current_status) : '-',
                                    )}</td></tr>
                                    <tr><td class="mini-label">${escapeHtml(t('Active now'))}</td><td class="mini-value">${escapeHtml(
                                        isActiveNow(assignment) ? t('Yes') : t('No'),
                                    )}</td></tr>
                                </tbody>
                            </table>
                        </td>
                        <td>
                            <table class="mini">
                                <tbody>
                                    ${timelineRows
                                        .map(
                                            (statusRow) => `
                                        <tr>
                                            <td class="mini-label">${escapeHtml(statusRow.label)}</td>
                                            <td class="mini-value">${escapeHtml(statusRow.value)}</td>
                                        </tr>
                                    `,
                                        )
                                        .join('')}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                `;
            })
            .join('');

        const printWindow = window.open('', '_blank', 'width=1100,height=800');

        if (!printWindow) {
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${t('External coach assignments')}</title>
                    <style>
                        @page{margin:4mm}
                        body{font-family:Arial,sans-serif;padding:4px;font-size:9px}
                        h2{font-size:14px;margin:0 0 4px}
                        table{width:100%;border-collapse:collapse}
                        .mini{width:100%;border-collapse:collapse;margin:0}
                        .mini td{border:1px solid #d1d5db;padding:2px 4px}
                        .mini-label{background:#f3f4f6;color:#4b5563;width:38%;font-size:8px}
                        .mini-value{width:62%}
                        th,td{border:1px solid #ccc;padding:3px 4px;text-align:left}
                        th{background:#f3f4f6}
                        .muted{color:#666;font-size:8px;margin-bottom:4px}
                    </style>
                </head>
                <body>
                    <h2>${t('Assignments for')} ${externalCoach.name}</h2>
                    <div class="muted">${t('External coach')}: ${externalCoach.name} (${externalCoach.email})</div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('S.No.')}</th>
                                <th>${t('Player')}</th>
                                <th>${t('Assignment details')}</th>
                                <th>${t('Assignment status')}</th>
                                <th>${t('Status timeline')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                    <script>window.onload=()=>{window.print();window.close()};</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    return (
        <>
            <Head title={`${externalCoach.name} - ${t('Assignments')}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {t('Assignments')} - {externalCoach.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {externalCoach.phone ?? externalCoach.email}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/external-coaches/${externalCoach.id}`}>
                                {t('Back to coach')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="assignments">
                    <TabsList className="w-fit">
                        <TabsTrigger value="details" asChild>
                            <Link href={`/external-coaches/${externalCoach.id}`}>
                                {t('Details')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" asChild>
                            <Link href={`/external-coaches/${externalCoach.id}/assignments`}>
                                <List className="mr-2 size-4" />
                                {t('Assignments')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assignments" className="space-y-4">
                        <section className="rounded-lg border bg-card p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-base font-semibold">
                                    {t('Player assignments')}
                                </h2>
                                <span className="text-sm text-muted-foreground">
                                    {t('Active players')}: {activeAssignmentsCount}
                                </span>
                            </div>
                            <form
                                className="mb-3 grid gap-2 sm:grid-cols-5"
                                action={`/external-coaches/${externalCoach.id}/assignments`}
                                method="get"
                            >
                                <input
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    name="search"
                                    placeholder={t('Search player / PNO / phone')}
                                    type="text"
                                    defaultValue={searchText}
                                />
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    name="status"
                                    defaultValue={statusFilter}
                                >
                                    <option value="all">{t('All assignment statuses')}</option>
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>
                                            {t(status)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    name="active"
                                    defaultValue={activeFilter}
                                >
                                    <option value="all">{t('All activity')}</option>
                                    <option value="active">{t('Active now')}</option>
                                    <option value="inactive">{t('Inactive now')}</option>
                                </select>
                                <input
                                    name="per_page"
                                    type="hidden"
                                    defaultValue={perPage}
                                />
                                <Button type="submit" variant="outline">
                                    {t('Apply')}
                                </Button>
                                <Button
                                    asChild
                                    type="button"
                                    variant="outline"
                                >
                                    <Link href={`/external-coaches/${externalCoach.id}/assignments`}>
                                        {t('Reset')}
                                    </Link>
                                </Button>
                            </form>
                            <div className="mb-3 flex items-center justify-end gap-3">
                                <span className="text-xs text-muted-foreground">
                                    {assignments.from !== null
                                        ? `${t('Showing')} ${assignments.from}-${assignments.to ?? assignments.from} ${t(
                                              'of',
                                          )} ${assignments.total}`
                                        : `${t('Showing')} 0 ${t('of')} ${assignments.total}`}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={printAssignments}
                                >
                                    <Printer className="mr-2 size-4" />
                                    {t('Print')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={exportAssignments}
                                >
                                    <Download className="mr-2 size-4" />
                                    {t('Export CSV')}
                                </Button>
                            </div>

                            <div className="overflow-hidden rounded-lg border">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1280px] border-collapse text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="w-[72px] border p-3 text-left text-xs font-semibold">
                                                    {t('S.No.')}
                                                </th>
                                                <th className="w-[260px] border p-3 text-left text-xs font-semibold">
                                                    {t('Player')}
                                                </th>
                                                <th className="min-w-[300px] border p-3 text-left text-xs font-semibold">
                                                    {t('Assignment details')}
                                                </th>
                                                <th className="w-[300px] border p-3 text-left text-xs font-semibold">
                                                    {t('Assignment status')}
                                                </th>
                                                <th className="w-[360px] border p-3 text-left text-xs font-semibold">
                                                    {t('Status timeline')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.data.map((assignment, index) => {
                                                const timelineRows = assignmentStatusRows(assignment, t, locale);

                                                return (
                                                    <tr
                                                        key={assignment.id}
                                                        className="border-t align-top"
                                                    >
                                                        <td className="border p-3 text-xs">
                                                            <span className="font-medium">{index + 1}</span>
                                                        </td>
                                                        <td className="border p-3 text-xs">
                                                            <table className={MINI_TABLE_CLASS}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} w-[90px]`}>
                                                                            {t('Player')}
                                                                        </td>
                                                                        <td className={`${MINI_VALUE_CELL_CLASS} font-medium`}>
                                                                            {assignment.member?.id ? (
                                                                                <Link
                                                                                    href={`/external-coaches/${externalCoach.id}/members/${assignment.member.id}/assignments`}
                                                                                    className="font-bold text-primary underline"
                                                                                >
                                                                                    {assignment.member?.full_name ?? '-'}
                                                                                </Link>
                                                                            ) : (
                                                                                <span className="font-bold">
                                                                                    {assignment.member?.full_name ?? '-'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={MINI_HEADER_CELL_CLASS}>
                                                                            {t('Rank')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            {assignment.member?.rank ?? '-'}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={MINI_HEADER_CELL_CLASS}>
                                                                            {t('PNO')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            {assignment.member?.pno ?? '-'}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} border-b-0`}>
                                                                            {t('Phone')}
                                                                        </td>
                                                                        <td className={`${MINI_VALUE_CELL_CLASS} border-b-0`}>
                                                                            {assignment.member?.mobile ?? '-'}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td className="border p-3 text-xs">
                                                            <table className={MINI_TABLE_CLASS}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} w-[130px]`}>
                                                                            {t('Sport')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            {assignment.sport?.name ?? '-'}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={MINI_HEADER_CELL_CLASS}>
                                                                            {t('Venue')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            {assignment.training_venue?.name ?? '-'}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={MINI_HEADER_CELL_CLASS}>
                                                                            {t('Attendance')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            {formatAttendanceMode(assignment.attendance_mode, t)}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} border-b-0`}>
                                                                            {t('Period')}
                                                                        </td>
                                                                        <td className={`${MINI_VALUE_CELL_CLASS} border-b-0`}>
                                                                            {`${formatDate(assignment.start_date, locale)} - ${formatDate(
                                                                                assignment.end_date,
                                                                                locale,
                                                                            )}`}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td className="border p-3 text-xs">
                                                            <table className={MINI_TABLE_CLASS}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} w-[150px]`}>
                                                                            {t('Assignment status')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            <Badge variant="outline">
                                                                                {t(assignment.status)}
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={MINI_HEADER_CELL_CLASS}>
                                                                            {t('Player status')}
                                                                        </td>
                                                                        <td className={MINI_VALUE_CELL_CLASS}>
                                                                            <Badge variant="outline">
                                                                                {assignment.member?.current_status
                                                                                    ? t(assignment.member.current_status)
                                                                                    : '-'}
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className={`${MINI_HEADER_CELL_CLASS} border-b-0`}>
                                                                            {t('Active now')}
                                                                        </td>
                                                                        <td className={`${MINI_VALUE_CELL_CLASS} border-b-0`}>
                                                                            <Badge
                                                                                variant={
                                                                                    isActiveNow(assignment)
                                                                                        ? 'default'
                                                                                        : 'outline'
                                                                                }
                                                                            >
                                                                                {isActiveNow(assignment) ? t('Yes') : t('No')}
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td className="border p-3 text-xs">
                                                            <table className={MINI_TABLE_CLASS}>
                                                                <tbody>
                                                                    {timelineRows.map((statusRow, statusIndex) => (
                                                                        <tr key={`${assignment.id}-${statusIndex}`}>
                                                                            <td
                                                                                className={`${MINI_HEADER_CELL_CLASS} w-[130px] ${statusIndex === timelineRows.length - 1 ? 'border-b-0' : ''}`}
                                                                            >
                                                                                {statusRow.label}
                                                                            </td>
                                                                            <td
                                                                                className={`${MINI_VALUE_CELL_CLASS} ${statusIndex === timelineRows.length - 1 ? 'border-b-0' : ''}`}
                                                                            >
                                                                                {statusRow.value}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {assignments.data.length === 0 ? (
                                                <tr>
                                                <td
                                                        colSpan={5}
                                                        className="border p-4 text-center text-muted-foreground"
                                                    >
                                                        {t('No assignments found.')}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <ListingPagination
                                paginator={assignments}
                                itemLabel={t('assignments')}
                                rowsPerPage={{
                                    value: perPage,
                                    options: [...PER_PAGE_OPTIONS],
                                    onChange: changeRowsPerPage,
                                }}
                            />
                        </section>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
