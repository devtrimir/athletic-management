import { Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { edit } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import { MemberAvatar } from '@/components/members/member-table-cells';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate, formatTimeRange } from '@/lib/dates';
import {
    attendanceModeHint,
    attendanceModeLabel,
    translateValue,
} from '@/lib/external-coaching';

export type AssignmentQuickViewData = {
    id: number;
    start_date: string;
    end_date: string;
    status: string;
    training_days?: string[] | null;
    training_start_time?: string | null;
    training_end_time?: string | null;
    attendance_mode?: string | null;
    permission_reference_number?: string | null;
    remarks?: string | null;
    cancellation_reason?: string | null;
    completion_remarks?: string | null;
    member?: {
        full_name: string;
        pno: string | null;
        photo_path: string | null;
    } | null;
    external_coach?: { name: string; phone?: string | null } | null;
    training_venue?: { name: string } | null;
    sport?: { name: string } | null;
};

const WEEK = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium break-words">
                {children}
            </dd>
        </div>
    );
}

/** Assignment details in a dialog, with an Edit shortcut (when permitted). */
export function AssignmentQuickView({
    assignment,
    canEdit,
    onClose,
}: {
    assignment: AssignmentQuickViewData | null;
    canEdit: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const notSet = t('Not set');
    const days = WEEK.filter((day) => assignment?.training_days?.includes(day));

    return (
        <Dialog
            open={assignment !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent
                className="sm:max-w-2xl"
                aria-describedby={undefined}
            >
                {assignment && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 pr-6">
                                <MemberAvatar
                                    photoPath={assignment.member?.photo_path}
                                    name={assignment.member?.full_name ?? ''}
                                />
                                <span className="min-w-0">
                                    <span className="block truncate">
                                        {assignment.member?.full_name ??
                                            t('Unknown member')}
                                    </span>
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        {assignment.member?.pno ?? t('No PNO')}
                                    </span>
                                </span>
                                <Badge
                                    variant={
                                        assignment.status === 'active'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                    className="ml-auto shrink-0"
                                >
                                    {translateValue(assignment.status, t)}
                                </Badge>
                            </DialogTitle>
                        </DialogHeader>

                        <dl className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('Coach')}>
                                {assignment.external_coach?.name ?? notSet}
                                {assignment.external_coach?.phone && (
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        {assignment.external_coach.phone}
                                    </span>
                                )}
                            </Field>
                            <Field label={t('Sport')}>
                                {assignment.sport?.name ?? notSet}
                            </Field>
                            <Field label={t('Venue')}>
                                {assignment.training_venue?.name ?? notSet}
                            </Field>
                            <Field label={t('Period')}>
                                {formatDate(assignment.start_date)} -{' '}
                                {formatDate(assignment.end_date)}
                            </Field>
                            <Field label={t('Training days')}>
                                {days.length > 0
                                    ? days
                                          .map((day) => translateValue(day, t))
                                          .join(', ')
                                    : notSet}
                            </Field>
                            <Field label={t('Training time')}>
                                {formatTimeRange(
                                    assignment.training_start_time,
                                    assignment.training_end_time,
                                    ' - ',
                                    notSet,
                                )}
                            </Field>
                            <Field label={t('Attendance mode')}>
                                {attendanceModeLabel(
                                    assignment.attendance_mode,
                                    t,
                                )}
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {attendanceModeHint(
                                        assignment.attendance_mode,
                                        t,
                                    )}
                                </span>
                            </Field>
                            <Field label={t('Permission reference')}>
                                {assignment.permission_reference_number ??
                                    notSet}
                            </Field>
                            {(assignment.remarks ||
                                assignment.cancellation_reason ||
                                assignment.completion_remarks) && (
                                <div className="sm:col-span-2">
                                    <Field label={t('Remarks')}>
                                        {[
                                            assignment.remarks,
                                            assignment.cancellation_reason,
                                            assignment.completion_remarks,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </Field>
                                </div>
                            )}
                        </dl>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={onClose}>
                                {t('Close')}
                            </Button>
                            {canEdit && (
                                <Button asChild>
                                    <Link href={edit.url(assignment)}>
                                        <Pencil className="size-4" />
                                        {t('Edit')}
                                    </Link>
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
