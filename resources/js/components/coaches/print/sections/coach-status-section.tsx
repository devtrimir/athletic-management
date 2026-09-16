import { formatDate, hasAnyValue, humanize } from '../helpers';
import { Section } from '../shared';
import type { CoachStatusHistory } from '../types';

export function CoachStatusSection({
    statusHistory,
    t,
}: {
    statusHistory: CoachStatusHistory[];
    t: (key: string) => string;
}) {
    if (statusHistory.length === 0) {
        return null;
    }

    const showStatusReason = hasAnyValue(statusHistory, (s) => s.reason);
    const showStatusRecordedBy = hasAnyValue(
        statusHistory,
        (s) => s.recorded_by_name,
    );

    return (
        <Section title={t('Status history')}>
            <div className="overflow-hidden rounded-md border print:rounded-sm">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                        <tr>
                            <th className="border p-1.5">{t('Status')}</th>
                            <th className="border p-1.5 whitespace-nowrap">
                                {t('Effective on')}
                            </th>
                            {showStatusReason && (
                                <th className="border p-1.5">{t('Reason')}</th>
                            )}
                            {showStatusRecordedBy && (
                                <th className="border p-1.5">
                                    {t('Recorded by')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="print:text-[10px]">
                        {statusHistory.map((row) => (
                            <tr
                                key={row.id}
                                className="border-t print:align-top"
                            >
                                <td className="border p-1.5 font-medium print:py-0.5">
                                    {humanize(row.status)}
                                </td>
                                <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                    {formatDate(row.effective_on) || '—'}
                                </td>
                                {showStatusReason && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {row.reason || '—'}
                                    </td>
                                )}
                                {showStatusRecordedBy && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {row.recorded_by_name || '—'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}
