import { formatDate, hasAnyValue } from '../helpers';
import { Section } from '../shared';
import type { CoachSport } from '../types';

export function CoachSportsSection({
    sports,
    t,
}: {
    sports: CoachSport[];
    t: (key: string) => string;
}) {
    if (sports.length === 0) {
        return null;
    }

    const showSportEvent = hasAnyValue(sports, (s) => s.sport_event);
    const showSportLevel = hasAnyValue(sports, (s) => s.level);
    const showSportPeriod = hasAnyValue(
        sports,
        (s) => s.effective_from || s.effective_to,
    );
    const showSportNotes = hasAnyValue(sports, (s) => s.notes);

    return (
        <Section title={t('Playable sports')}>
            <div className="overflow-hidden rounded-md border print:rounded-sm">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                        <tr>
                            <th className="border p-1.5">{t('Sport')}</th>
                            {showSportEvent && (
                                <th className="border p-1.5">
                                    {t('Event / Discipline')}
                                </th>
                            )}
                            {showSportLevel && (
                                <th className="border p-1.5">{t('Level')}</th>
                            )}
                            {showSportPeriod && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Period')}
                                </th>
                            )}
                            {showSportNotes && (
                                <th className="border p-1.5">{t('Notes')}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="print:text-[10px]">
                        {sports.map((sport) => (
                            <tr
                                key={sport.id}
                                className="border-t print:align-middle"
                            >
                                <td className="border p-1.5 font-medium print:py-0.5">
                                    {sport.name}
                                    {sport.is_primary && (
                                        <span className="ml-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase print:text-[8px]">
                                            {t('Primary')}
                                        </span>
                                    )}
                                </td>
                                {showSportEvent && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {sport.sport_event || '—'}
                                    </td>
                                )}
                                {showSportLevel && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {sport.level || '—'}
                                    </td>
                                )}
                                {showSportPeriod && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {[
                                            formatDate(sport.effective_from),
                                            formatDate(sport.effective_to),
                                        ]
                                            .filter(Boolean)
                                            .join(' - ') || '—'}
                                    </td>
                                )}
                                {showSportNotes && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {sport.notes || '—'}
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
