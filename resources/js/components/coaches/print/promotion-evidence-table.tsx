import { Fragment } from 'react';
import { humanize } from './helpers';
import type { PromotionEvidenceTableRow } from './types';

export function PromotionEvidenceTable({
    rows,
    t,
    locale,
    showPlayers = true,
}: {
    rows: PromotionEvidenceTableRow[];
    t: (key: string) => string;
    locale: string;
    showPlayers?: boolean;
}) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <table className="w-full border-collapse text-xs print:text-[9px]">
            <thead className="bg-muted/40 text-left text-[10px] tracking-wide text-muted-foreground uppercase print:text-[8px]">
                <tr>
                    <th className="w-12 border p-1.5 whitespace-nowrap">
                        {t('S. No.')}
                    </th>
                    <th className="w-16 border p-1.5 whitespace-nowrap">
                        {t('Session')}
                    </th>
                    <th className="border p-1.5">{t('Tournament')}</th>
                    <th className="border p-1.5">{t('Event')}</th>
                    <th className="w-16 border p-1.5 whitespace-nowrap">
                        {t('Event type')}
                    </th>
                    <th className="w-20 border p-1.5 whitespace-nowrap">
                        {t('Level')}
                    </th>
                    <th className="w-24 border p-1.5 whitespace-nowrap">
                        {t('Event date')}
                    </th>
                    <th className="w-14 border p-1.5 whitespace-nowrap">
                        {t('Gender')}
                    </th>
                    <th className="border p-1.5 whitespace-nowrap">
                        {t('Result')}
                    </th>
                    <th className="border p-1.5">{t('Venue')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => {
                    const hasPlayers =
                        showPlayers &&
                        Array.isArray(row.players) &&
                        row.players.length > 0;

                    return (
                        <Fragment key={row.key}>
                            <tr className="align-top odd:bg-muted/10">
                                <td className="border p-1.5 text-center text-muted-foreground">
                                    {index + 1}
                                </td>
                                <td className="border p-1.5 align-top whitespace-nowrap">
                                    {row.session || '—'}
                                </td>
                                <td className="border p-1.5 align-top">
                                    {row.tournament || '—'}
                                </td>
                                <td className="border p-1.5 align-top">
                                    {row.event || '—'}
                                </td>
                                <td className="border p-1.5 align-top whitespace-nowrap">
                                    {row.eventType || '—'}
                                </td>
                                <td className="border p-1.5 align-top whitespace-nowrap">
                                    {row.level || '—'}
                                </td>
                                <td className="border p-1.5 align-top whitespace-nowrap">
                                    {row.date || '—'}
                                </td>
                                <td className="border p-1.5 align-top whitespace-nowrap">
                                    {row.gender || '—'}
                                </td>
                                <td className="border p-1.5 align-top font-medium whitespace-nowrap">
                                    {row.result || '—'}
                                </td>
                                <td className="border p-1.5 align-top">
                                    {row.venue || '—'}
                                </td>
                            </tr>
                            {hasPlayers && (
                                <tr className="bg-muted/15 print:break-inside-avoid">
                                    <td
                                        colSpan={10}
                                        className="border p-2 print:p-1.5"
                                    >
                                        <div className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase print:text-[8px]">
                                            {t('Players')} (
                                            {row.players!.length})
                                        </div>
                                        <table className="w-full border-collapse text-xs print:text-[9px]">
                                            <thead className="bg-muted/40 text-left text-[10px] tracking-wide text-muted-foreground uppercase print:text-[8px]">
                                                <tr>
                                                    <th className="w-12 border p-1.5 text-center whitespace-nowrap">
                                                        {t('S. No.')}
                                                    </th>
                                                    <th className="border p-1.5">
                                                        {t('Player name')}
                                                    </th>
                                                    <th className="w-32 border p-1.5 whitespace-nowrap">
                                                        {t('PNO')}
                                                    </th>
                                                    <th className="w-32 border p-1.5 whitespace-nowrap">
                                                        {t('Medal')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {row.players!.map(
                                                    (player, playerIndex) => (
                                                        <tr
                                                            key={`${row.key}-${player.member.id}`}
                                                            className="odd:bg-muted/10"
                                                        >
                                                            <td className="border p-1.5 text-muted-foreground">
                                                                {playerIndex +
                                                                    1}
                                                            </td>
                                                            <td className="border p-1.5 font-medium text-foreground">
                                                                <span>
                                                                    {
                                                                        player
                                                                            .member
                                                                            .full_name
                                                                    }
                                                                </span>
                                                                {player.member
                                                                    .is_coach && (
                                                                    <span className="py-0.2 ml-1.5 inline-block rounded border border-amber-300 bg-amber-50 px-1 text-[9px] font-semibold text-amber-900 print:border-amber-400 print:bg-amber-50 print:text-[8px] print:text-amber-900">
                                                                        {t(
                                                                            'Coach',
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="border p-1.5 font-mono text-muted-foreground">
                                                                {player.member
                                                                    .pno || '—'}
                                                            </td>
                                                            <td className="border p-1.5 font-semibold text-foreground">
                                                                {player.medal_type
                                                                    ? locale ===
                                                                      'hi'
                                                                        ? t(
                                                                              player.medal_type,
                                                                          )
                                                                        : humanize(
                                                                              player.medal_type,
                                                                          )
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    );
                })}
            </tbody>
        </table>
    );
}
