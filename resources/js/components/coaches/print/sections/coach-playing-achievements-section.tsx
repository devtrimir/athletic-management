import { useMemo } from 'react';
import {
    computeRowSpans,
    formatDate,
    formatTournamentDateRange,
    humanize,
    tierLabel,
} from '../helpers';
import { Section } from '../shared';
import type {
    MemberPlayingAchievementRecord,
    PlayingAchievementRecord,
    PlayingAchievementsData,
} from '../types';

export function CoachPlayingAchievementsSection({
    playingAchievements,
    locale,
    t,
}: {
    playingAchievements: PlayingAchievementsData | undefined;
    locale: string;
    t: (key: string) => string;
}) {
    const playingAchievementRecords = useMemo(
        () => playingAchievements?.records ?? [],
        [playingAchievements],
    );

    const groupedMemberPlayingRecords = useMemo(() => {
        if (playingAchievements?.source !== 'member') {
            return [];
        }

        const records =
            playingAchievementRecords as MemberPlayingAchievementRecord[];
        const groups: {
            key: string;
            rows: MemberPlayingAchievementRecord[];
        }[] = [];
        const groupIndexByKey = new Map<string, number>();

        for (const record of records) {
            const key = [
                record.tournament.name,
                record.session.name,
                formatTournamentDateRange(record.tournament),
                record.tournament.venue,
            ].join('|');

            const existingIndex = groupIndexByKey.get(key);

            if (existingIndex !== undefined) {
                groups[existingIndex].rows.push(record);
                continue;
            }

            groupIndexByKey.set(key, groups.length);
            groups.push({ key, rows: [record] });
        }

        return groups;
    }, [playingAchievements, playingAchievementRecords]);

    if (playingAchievementRecords.length === 0) {
        return null;
    }

    return (
        <Section
            title={`${t('Playing career achievements')}${
                playingAchievements?.source === 'member'
                    ? ` (${t('Derived from member record')})`
                    : ` (${t('Legacy')})`
            }`}
        >
            {playingAchievements?.source === 'member' ? (
                <div className="overflow-hidden rounded-md border print:rounded-sm">
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                            <tr>
                                <th className="w-10 border p-1.5  align-top">
                                    {t('S. No.')}
                                </th>
                                <th className="border p-1.5 align-top">
                                    {t('Tournament')}
                                </th>
                                <th className="w-[9%] border p-1.5 align-top whitespace-nowrap">
                                    {t('Tier')}
                                </th>
                                <th className="w-[10%] border p-1.5 align-top whitespace-nowrap">
                                    {t('Session')}
                                </th>
                                <th className="border p-1.5 align-top">
                                    {t('Event')}
                                </th>
                                <th className="w-[9%] border p-1.5 align-top whitespace-nowrap">
                                    {t('Kind')}
                                </th>
                                <th className="w-[12%] border p-1.5 align-top whitespace-nowrap">
                                    {t('Date')}
                                </th>
                                <th className="w-[14%] border p-1.5 align-top">
                                    {t('Venue')}
                                </th>
                                <th className="w-[10%] border p-1.5 align-top">
                                    {t('Result')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y print:text-[10px]">
                            {(() => {
                                let rowNumber = 0;

                                return groupedMemberPlayingRecords.map(
                                    (group) => {
                                        const kindSpans = computeRowSpans(
                                            group.rows,
                                            (r) => r.event_kind,
                                        );

                                        return group.rows.map(
                                            (record, rowIndex) => (
                                                <tr
                                                    key={record.id}
                                                    className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                >
                                                    <td className="border p-1.5  text-xs font-medium text-muted-foreground print:p-1">
                                                        {++rowNumber}
                                                    </td>
                                                    {rowIndex === 0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle print:p-1"
                                                            rowSpan={
                                                                group.rows
                                                                    .length
                                                            }
                                                        >
                                                            <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                {
                                                                    record
                                                                        .tournament
                                                                        .name
                                                                }
                                                            </div>
                                                        </td>
                                                    )}
                                                    {rowIndex === 0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                                            rowSpan={
                                                                group.rows
                                                                    .length
                                                            }
                                                        >
                                                            {tierLabel(
                                                                record.tournament,
                                                                locale,
                                                                t,
                                                            ) || '—'}
                                                        </td>
                                                    )}
                                                    {rowIndex === 0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                                            rowSpan={
                                                                group.rows
                                                                    .length
                                                            }
                                                        >
                                                            {
                                                                record.session
                                                                    .name
                                                            }
                                                        </td>
                                                    )}
                                                    <td className="border p-1.5 align-top text-xs font-medium text-foreground print:p-1 print:text-[9px]">
                                                        {record.event.name}
                                                    </td>
                                                    {kindSpans[rowIndex] >
                                                        0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                                            rowSpan={
                                                                kindSpans[
                                                                    rowIndex
                                                                ]
                                                            }
                                                        >
                                                            {record.event_kind ===
                                                            'team'
                                                                ? t('Team')
                                                                : t(
                                                                      'Individual',
                                                                  )}
                                                        </td>
                                                    )}
                                                    {rowIndex === 0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]"
                                                            rowSpan={
                                                                group.rows
                                                                    .length
                                                            }
                                                        >
                                                            {formatTournamentDateRange(
                                                                record.tournament,
                                                            ) || '—'}
                                                        </td>
                                                    )}
                                                    {rowIndex === 0 && (
                                                        <td
                                                            className="border p-1.5 text-center align-middle text-xs break-words text-foreground print:p-1 print:text-[9px]"
                                                            rowSpan={
                                                                group.rows
                                                                    .length
                                                            }
                                                        >
                                                            {record.tournament
                                                                .venue || '—'}
                                                        </td>
                                                    )}
                                                    <td className="border p-1.5 align-top print:p-1">
                                                        <div className="text-xs leading-4 font-semibold text-foreground print:text-[9px]">
                                                            {record.medal_type
                                                                ? humanize(
                                                                      record.medal_type,
                                                                  )
                                                                : record.position
                                                                  ? `${t('Position')}: ${record.position}`
                                                                  : '—'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ),
                                        );
                                    },
                                );
                            })()}
                        </tbody>
                    </table>
                </div>
            ) : (
                (() => {
                    const legacyRecords =
                        playingAchievementRecords as PlayingAchievementRecord[];
                    const groups = [
                        {
                            key: 'POST_RECRUITMENT',
                            label: t('Post-recruitment'),
                            rows: legacyRecords.filter(
                                (r) => r.period === 'POST_RECRUITMENT',
                            ),
                        },
                        {
                            key: 'PRE_RECRUITMENT',
                            label: t('Pre-recruitment'),
                            rows: legacyRecords.filter(
                                (r) => r.period === 'PRE_RECRUITMENT',
                            ),
                        },
                        {
                            key: 'OTHER',
                            label: t('Other'),
                            rows: legacyRecords.filter(
                                (r) =>
                                    r.period !== 'POST_RECRUITMENT' &&
                                    r.period !== 'PRE_RECRUITMENT',
                            ),
                        },
                    ].filter((g) => g.rows.length > 0);

                    return (
                        <div className="space-y-4">
                            {groups.map((group) => (
                                <div key={group.key}>
                                    <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        {group.label}
                                    </div>
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full border-collapse text-xs">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="w-10 border p-1.5  align-top">
                                                        {t('S. No.')}
                                                    </th>
                                                    <th className="border p-1.5 align-top">
                                                        {t('Title')}
                                                    </th>
                                                    <th className="border p-1.5 align-top">
                                                        {t(
                                                            'Competition / Event',
                                                        )}
                                                    </th>
                                                    <th className="w-[10%] border p-1.5 align-top whitespace-nowrap">
                                                        {t('Level')}
                                                    </th>
                                                    <th className="w-[9%] border p-1.5 align-top whitespace-nowrap">
                                                        {t('Kind')}
                                                    </th>
                                                    <th className="w-[12%] border p-1.5 align-top whitespace-nowrap">
                                                        {t('Event date')}
                                                    </th>
                                                    <th className="w-[14%] border p-1.5 align-top">
                                                        {t('Venue')}
                                                    </th>
                                                    <th className="w-[10%] border p-1.5 align-top">
                                                        {t('Result')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y print:text-[10px]">
                                                {group.rows.map(
                                                    (record, index) => (
                                                        <tr
                                                            key={record.id}
                                                            className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                        >
                                                            <td className="border p-1.5 text-center text-xs font-medium text-muted-foreground print:p-1">
                                                                {index + 1}
                                                            </td>
                                                            <td className="border p-1.5 align-top font-medium text-foreground print:p-1">
                                                                {record.title}
                                                            </td>
                                                            <td className="border p-1.5 align-top text-xs break-words text-foreground print:p-1 print:text-[9px]">
                                                                {[
                                                                    record.competition_details,
                                                                    record.event,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    ) || '—'}
                                                            </td>
                                                            <td className="border p-1.5 align-top text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]">
                                                                {tierLabel(
                                                                    {
                                                                        tier_code:
                                                                            record.level,
                                                                    },
                                                                    locale,
                                                                    t,
                                                                ) ||
                                                                    record.level ||
                                                                    '—'}
                                                            </td>
                                                            <td className="border p-1.5 align-top text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]">
                                                                {record.event_type
                                                                    ? record.event_type ===
                                                                      'team'
                                                                        ? t(
                                                                              'Team',
                                                                          )
                                                                        : t(
                                                                              'Individual',
                                                                          )
                                                                    : '—'}
                                                            </td>
                                                            <td className="border p-1.5 align-top text-xs whitespace-nowrap text-foreground print:p-1 print:text-[9px]">
                                                                {formatDate(
                                                                    record.event_date,
                                                                ) || '—'}
                                                            </td>
                                                            <td className="border p-1.5 align-top text-xs break-words text-foreground print:p-1 print:text-[9px]">
                                                                {record.venue ||
                                                                    '—'}
                                                            </td>
                                                            <td className="border p-1.5 align-top print:p-1">
                                                                <div className="text-xs leading-4 font-semibold text-foreground print:text-[9px]">
                                                                    {record.medal_type
                                                                        ? humanize(
                                                                              record.medal_type,
                                                                          )
                                                                        : '—'}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()
            )}
        </Section>
    );
}
