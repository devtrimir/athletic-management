import { formatDate, hasAnyValue, humanize } from '../helpers';
import { Section } from '../shared';
import type { SpecialAchievementsData } from '../types';

export function CoachSpecialAchievementsSection({
    specialAchievements,
    t,
}: {
    specialAchievements: SpecialAchievementsData | undefined;
    t: (key: string) => string;
}) {
    const specialAchievementRecords = specialAchievements?.records ?? [];

    if (specialAchievementRecords.length === 0) {
        return null;
    }

    const showSpecialAwardedOn = hasAnyValue(
        specialAchievementRecords,
        (r) => r.awarded_on,
    );
    const showSpecialIssuingAuthority = hasAnyValue(
        specialAchievementRecords,
        (r) => r.issuing_authority,
    );
    const showSpecialOrderReference = hasAnyValue(
        specialAchievementRecords,
        (r) => r.order_reference,
    );
    const showSpecialPlace = hasAnyValue(
        specialAchievementRecords,
        (r) => r.place,
    );
    const showSpecialRemarks = hasAnyValue(
        specialAchievementRecords,
        (r) => r.remarks,
    );

    return (
        <Section title={t('Special achievements')}>
            <div className="overflow-hidden rounded-md border print:rounded-sm">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                        <tr>
                            <th className="w-10 border p-1.5 text-center align-top">
                                {t('S. No.')}
                            </th>
                            <th className="border p-1.5">
                                {t('Achievement type')}
                            </th>
                            <th className="border p-1.5">{t('Title')}</th>
                            {showSpecialAwardedOn && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Award date')}
                                </th>
                            )}
                            {showSpecialIssuingAuthority && (
                                <th className="border p-1.5">
                                    {t('Issuing authority')}
                                </th>
                            )}
                            {showSpecialOrderReference && (
                                <th className="border p-1.5">
                                    {t('Order reference')}
                                </th>
                            )}
                            {showSpecialPlace && (
                                <th className="border p-1.5">{t('Place')}</th>
                            )}
                            {showSpecialRemarks && (
                                <th className="border p-1.5">{t('Remarks')}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="print:text-[10px]">
                        {specialAchievementRecords.map((record, index) => (
                            <tr
                                key={record.id}
                                className="border-t print:align-top"
                            >
                                <td className="border p-1.5 text-center text-muted-foreground print:py-0.5">
                                    {index + 1}
                                </td>
                                <td className="border p-1.5 print:py-0.5">
                                    {humanize(record.achievement_type)}
                                </td>
                                <td className="border p-1.5 font-medium text-foreground print:py-0.5">
                                    {record.title}
                                </td>
                                {showSpecialAwardedOn && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {formatDate(record.awarded_on) || '—'}
                                    </td>
                                )}
                                {showSpecialIssuingAuthority && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {record.issuing_authority || '—'}
                                    </td>
                                )}
                                {showSpecialOrderReference && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {record.order_reference || '—'}
                                    </td>
                                )}
                                {showSpecialPlace && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {record.place || '—'}
                                    </td>
                                )}
                                {showSpecialRemarks && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {record.remarks || '—'}
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
