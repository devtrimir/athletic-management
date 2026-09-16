import { useMemo } from 'react';
import {
    computeRowSpans,
    formatTournamentDateRange,
    humanize,
    tierLabel,
} from '../helpers';
import { Section } from '../shared';
import type { CoachAchievementsData } from '../types';

export function CoachAchievementsSection({
    coachAchievements,
    locale,
    t,
}: {
    coachAchievements: CoachAchievementsData | undefined;
    locale: string;
    t: (key: string) => string;
}) {
    const achievements = useMemo(
        () => coachAchievements?.groups ?? [],
        [coachAchievements],
    );

    const teamAchievementRowSpans = useMemo(
        () =>
            computeRowSpans(achievements, (group) =>
                [
                    group.tournament.name,
                    group.tournament.venue,
                    formatTournamentDateRange(group.tournament),
                    group.session.name,
                    group.team.name,
                ].join('|'),
            ),
        [achievements],
    );

    if (achievements.length === 0) {
        return null;
    }

    return (
        <Section title={t('Achievements')}>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-6 print:grid-cols-6 print:p-2 print:text-[9px]">
                {(['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const).map(
                    (medal) => (
                        <div key={medal} className="text-center">
                            <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                                {humanize(medal)}
                            </div>
                            <div className="text-sm font-bold text-foreground print:text-[11px]">
                                {coachAchievements?.summary[medal] ?? 0}
                            </div>
                        </div>
                    ),
                )}
                <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                        {t('Events')}
                    </div>
                    <div className="text-sm font-bold text-foreground print:text-[11px]">
                        {coachAchievements?.summary.total_events ?? 0}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                        {t('Players')}
                    </div>
                    <div className="text-sm font-bold text-foreground print:text-[11px]">
                        {coachAchievements?.summary.medal_winning_players ?? 0}
                    </div>
                </div>
            </div>
            <div className="space-y-1.5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase print:text-[10px] print:text-black">
                    {t('Team achievements')}
                </h3>
                <div className="overflow-hidden rounded-md border print:rounded-sm">
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                            <tr>
                                <th className="w-10 border p-1.5 text-center align-middle">
                                    {t('S. No.')}
                                </th>
                                <th className="border p-1.5 align-middle">
                                    {t('Tournament')}
                                </th>
                                <th className="w-[14%] border p-1.5 align-middle">
                                    {t('Venue')}
                                </th>
                                <th className="w-[12%] border p-1.5 align-middle whitespace-nowrap">
                                    {t('Date')}
                                </th>
                                <th className="w-[10%] border p-1.5 align-middle whitespace-nowrap">
                                    {t('Tier')}
                                </th>
                                <th className="w-[10%] border p-1.5 align-middle whitespace-nowrap">
                                    {t('Session')}
                                </th>
                                <th className="w-[12%] border p-1.5 align-middle">
                                    {t('Team')}
                                </th>
                                <th className="border p-1.5 align-middle">
                                    {t('Event')}
                                </th>
                                <th className="w-[10%] border p-1.5 align-middle whitespace-nowrap">
                                    {t('Event type')}
                                </th>
                                <th className="w-[14%] border p-1.5 align-middle whitespace-nowrap">
                                    {t('Medals')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y print:text-[10px]">
                            {achievements.map((group, index) => (
                                <tr
                                    key={group.id}
                                    className="align-middle odd:bg-muted/10 print:break-inside-avoid"
                                >
                                    <td className="border p-1.5 text-center text-xs font-medium text-muted-foreground print:p-1">
                                        {index + 1}
                                    </td>
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 text-center align-middle print:p-1"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                {group.tournament.name}
                                            </div>
                                        </td>
                                    )}
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 align-middle text-xs break-words text-foreground print:p-1 print:text-[9px]"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            {group.tournament.venue || '—'}
                                        </td>
                                    )}
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            {formatTournamentDateRange(
                                                group.tournament,
                                            ) || '—'}
                                        </td>
                                    )}
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            {tierLabel(
                                                group.tournament,
                                                locale,
                                                t,
                                            ) || '—'}
                                        </td>
                                    )}
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 text-center align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            {group.session.name}
                                        </td>
                                    )}
                                    {teamAchievementRowSpans[index] > 0 && (
                                        <td
                                            className="border p-1.5 text-center align-middle text-xs font-medium text-foreground print:p-1 print:text-[9px]"
                                            rowSpan={
                                                teamAchievementRowSpans[index]
                                            }
                                        >
                                            {group.team.name}
                                        </td>
                                    )}
                                    <td className="border p-1.5 align-middle print:p-1">
                                        <div className="text-xs font-medium text-foreground print:text-[9px]">
                                            {group.event.name}
                                        </div>
                                        {group.event.weight_category && (
                                            <div className="text-xs text-muted-foreground print:text-[9px]">
                                                {group.event.weight_category}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border p-1.5 align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]">
                                        {group.event.event_type === 'team'
                                            ? t('Team')
                                            : group.event.event_type ===
                                                'individual'
                                              ? t('Individual')
                                              : '—'}
                                    </td>
                                    <td className="border p-1.5 align-middle whitespace-nowrap print:p-1">
                                        <div className="space-y-0.5 text-xs print:text-[9px]">
                                            {(
                                                [
                                                    'GOLD',
                                                    'SILVER',
                                                    'BRONZE',
                                                    'MERIT',
                                                ] as const
                                            )
                                                .filter(
                                                    (m) =>
                                                        (group.medal_counts[
                                                            m
                                                        ] ?? 0) > 0,
                                                )
                                                .map((m) => (
                                                    <div
                                                        key={m}
                                                        className="font-semibold text-foreground"
                                                    >
                                                        {locale === 'hi'
                                                            ? t(m)
                                                            : humanize(m)}
                                                        :{' '}
                                                        {group.medal_counts[m]}
                                                    </div>
                                                ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Section>
    );
}
