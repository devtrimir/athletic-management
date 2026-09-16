import { coachRoleLabel } from '@/lib/coach';
import { formatDate, hasAnyValue } from '../helpers';
import { Section } from '../shared';
import type { CoachAssignment } from '../types';

export function CoachAssignmentsSection({
    coachTeams,
    t,
}: {
    coachTeams: CoachAssignment[];
    t: (key: string) => string;
}) {
    if (coachTeams.length === 0) {
        return null;
    }

    const showAssignmentSport = hasAnyValue(coachTeams, (a) => a.sport?.name);
    const showAssignmentSession = hasAnyValue(
        coachTeams,
        (a) => a.session?.name,
    );
    const showAssignmentRole = hasAnyValue(coachTeams, (a) => a.role);
    const showAssignmentAssignedAt = hasAnyValue(
        coachTeams,
        (a) => a.assigned_at,
    );
    const showAssignmentRemovedAt = hasAnyValue(
        coachTeams,
        (a) => a.removed_at,
    );

    return (
        <Section title={t('Team assignments')}>
            <div className="overflow-hidden rounded-md border print:rounded-sm">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                        <tr>
                            <th className="w-10 border p-1.5 text-center align-top">
                                {t('S. No.')}
                            </th>
                            <th className="border p-1.5">{t('Team')}</th>
                            {showAssignmentSport && (
                                <th className="border p-1.5">{t('Sport')}</th>
                            )}
                            {showAssignmentSession && (
                                <th className="border p-1.5">{t('Session')}</th>
                            )}
                            {showAssignmentRole && (
                                <th className="border p-1.5">{t('Role')}</th>
                            )}
                            {showAssignmentAssignedAt && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Assigned at')}
                                </th>
                            )}
                            {showAssignmentRemovedAt && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Removed at')}
                                </th>
                            )}
                            <th className="border p-1.5 whitespace-nowrap">
                                {t('Status')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="print:text-[10px]">
                        {coachTeams.map((assignment, index) => (
                            <tr
                                key={assignment.id}
                                className="border-t print:align-top"
                            >
                                <td className="border p-1.5 text-center text-muted-foreground print:py-0.5">
                                    {index + 1}
                                </td>
                                <td className="border p-1.5 font-medium print:py-0.5">
                                    {assignment.team?.name ?? '—'}
                                </td>
                                {showAssignmentSport && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {assignment.sport?.name ?? '—'}
                                    </td>
                                )}
                                {showAssignmentSession && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {assignment.session?.name ?? '—'}
                                    </td>
                                )}
                                {showAssignmentRole && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {coachRoleLabel(assignment.role, t) ||
                                            '—'}
                                    </td>
                                )}
                                {showAssignmentAssignedAt && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {formatDate(assignment.assigned_at) ||
                                            '—'}
                                    </td>
                                )}
                                {showAssignmentRemovedAt && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {formatDate(assignment.removed_at) ||
                                            '—'}
                                    </td>
                                )}
                                <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                    <span
                                        className={
                                            assignment.is_current
                                                ? 'font-medium text-emerald-700'
                                                : 'text-muted-foreground'
                                        }
                                    >
                                        {assignment.is_current
                                            ? t('Current')
                                            : t('Removed')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}
