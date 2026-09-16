import { Fragment } from 'react';
import { resolveRankLabel } from '@/lib/ranks';
import type { RankOption } from '@/lib/ranks';
import {
    formatDate,
    hasAnyValue,
    hasPromotionFields,
    hasRewardFields,
    hasValue,
    promotionEvidenceTableRows,
} from '../helpers';
import { PromotionEvidenceTable } from '../promotion-evidence-table';
import { DetailStack, Section } from '../shared';
import type { CoachPromotion } from '../types';

export function CoachPromotionsSection({
    promotions,
    ranks = [],
    locale,
    t,
}: {
    promotions: CoachPromotion[];
    ranks?: RankOption[];
    locale: string;
    t: (key: string) => string;
}) {
    const promotionRows = promotions.filter(hasPromotionFields);
    const rewardRows = promotions.filter(hasRewardFields);

    const showPromotionFromRank = hasAnyValue(
        promotionRows,
        (row) => row.from_rank,
    );
    const showPromotionDate = hasAnyValue(
        promotionRows,
        (row) => row.promotion_date,
    );
    const showPromotionReason = hasAnyValue(promotionRows, (row) => row.reason);
    const showPromotionRemarks = hasAnyValue(
        promotionRows,
        (row) => row.remarks,
    );
    const showPromotionEvidence = hasAnyValue(
        promotionRows,
        (row) => row.evidences.length,
    );

    const showRewardAmount = hasAnyValue(
        rewardRows,
        (row) => row.cash_reward_amount,
    );
    const showRewardDate = hasAnyValue(
        rewardRows,
        (row) => row.cash_reward_date,
    );
    const showRewardReference = hasAnyValue(
        rewardRows,
        (row) => row.cash_reward_reference,
    );
    const showRewardRemarks = hasAnyValue(
        rewardRows,
        (row) => row.cash_reward_remarks,
    );
    const showRewardEvidence = hasAnyValue(
        rewardRows,
        (row) => row.evidences.length,
    );

    const showRewardReferenceColumn = !showRewardAmount;
    const rewardColSpan =
        1 +
        (showRewardReferenceColumn ? 1 : 0) +
        (showRewardAmount ? 1 : 0) +
        (showRewardDate ? 1 : 0);

    return (
        <Section title={t('Promotions / rewards')}>
            {promotions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t('No promotions yet.')}
                </p>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('Promotions')}
                        </h3>
                        {promotionRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No promotions yet.')}
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full border-collapse text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="w-10 border p-1.5 text-center align-top">
                                                {t('S. No.')}
                                            </th>
                                            <th className="border p-1.5 align-top">
                                                {t('Promotion')}
                                            </th>
                                            {showPromotionDate && (
                                                <th className="w-[20%] border p-1.5 align-top">
                                                    {t('Promotion date')}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y print:text-[10px]">
                                        {promotionRows.map((row, index) => {
                                            const evidenceRows =
                                                promotionEvidenceTableRows(
                                                    row,
                                                    locale,
                                                    t,
                                                );
                                            const detailItems = [
                                                {
                                                    label: t('Reason'),
                                                    value: showPromotionReason
                                                        ? row.reason
                                                        : null,
                                                },
                                                {
                                                    label: t('Remarks'),
                                                    value: showPromotionRemarks
                                                        ? row.remarks
                                                        : null,
                                                    muted: true,
                                                },
                                            ];
                                            const hasEvidence =
                                                showPromotionEvidence &&
                                                evidenceRows.length > 0;
                                            const hasDetails =
                                                detailItems.some((item) =>
                                                    hasValue(item.value),
                                                ) || hasEvidence;

                                            return (
                                                <Fragment
                                                    key={`promotion-${row.id}`}
                                                >
                                                    <tr className="align-top odd:bg-muted/10">
                                                        <td className="border p-1.5 text-center text-xs font-medium text-muted-foreground print:p-1">
                                                            {index + 1}
                                                        </td>
                                                        <td className="border p-1.5 align-top print:p-1">
                                                            <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                {resolveRankLabel(
                                                                    row.to_rank,
                                                                    ranks,
                                                                    '',
                                                                ) || '—'}
                                                            </div>
                                                            {showPromotionFromRank &&
                                                                hasValue(
                                                                    row.from_rank,
                                                                ) && (
                                                                    <div className="mt-1 text-xs leading-4 break-words text-muted-foreground print:text-[9px]">
                                                                        {t(
                                                                            'From rank',
                                                                        )}
                                                                        :{' '}
                                                                        {resolveRankLabel(
                                                                            row.from_rank,
                                                                            ranks,
                                                                            '',
                                                                        )}
                                                                    </div>
                                                                )}
                                                        </td>
                                                        {showPromotionDate && (
                                                            <td className="border p-1.5 align-top text-xs leading-4 break-words text-foreground print:p-1 print:text-[9px]">
                                                                {formatDate(
                                                                    row.promotion_date,
                                                                ) || '—'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                    {hasDetails && (
                                                        <tr className="bg-muted/5 print:break-inside-avoid">
                                                            <td
                                                                className="border px-2 py-2 print:px-1.5 print:pb-1"
                                                                colSpan={
                                                                    2 +
                                                                    (showPromotionDate
                                                                        ? 1
                                                                        : 0)
                                                                }
                                                            >
                                                                <DetailStack
                                                                    items={
                                                                        detailItems
                                                                    }
                                                                />
                                                                {hasEvidence && (
                                                                    <div className="mt-2 space-y-1">
                                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                                            {t(
                                                                                'Evidence',
                                                                            )}
                                                                        </p>
                                                                        <PromotionEvidenceTable
                                                                            rows={
                                                                                evidenceRows
                                                                            }
                                                                            t={
                                                                                t
                                                                            }
                                                                            locale={
                                                                                locale
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('Rewards')}
                        </h3>
                        {rewardRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No rewards yet.')}
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full border-collapse text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="w-10 border p-1.5 text-center align-top">
                                                {t('S. No.')}
                                            </th>
                                            {showRewardReferenceColumn && (
                                                <th className="border p-1.5 align-top">
                                                    {t('Cash reward reference')}
                                                </th>
                                            )}
                                            {showRewardAmount && (
                                                <th className="w-[35%] border p-1.5 align-top">
                                                    {t('Cash reward amount')}
                                                </th>
                                            )}
                                            {showRewardDate && (
                                                <th className="w-[25%] border p-1.5 align-top">
                                                    {t('Cash reward date')}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y print:text-[10px]">
                                        {rewardRows.map((row, index) => {
                                            const evidenceRows =
                                                promotionEvidenceTableRows(
                                                    row,
                                                    locale,
                                                    t,
                                                );
                                            const detailItems = [
                                                ...(showRewardAmount &&
                                                showRewardReference
                                                    ? [
                                                          {
                                                              label: t(
                                                                  'Cash reward reference',
                                                              ),
                                                              value: row.cash_reward_reference,
                                                          },
                                                      ]
                                                    : []),
                                                {
                                                    label: t('Remarks'),
                                                    value: showRewardRemarks
                                                        ? row.cash_reward_remarks
                                                        : null,
                                                    muted: true,
                                                },
                                            ];
                                            const hasEvidence =
                                                showRewardEvidence &&
                                                evidenceRows.length > 0;
                                            const hasDetails =
                                                detailItems.some((item) =>
                                                    hasValue(item.value),
                                                ) || hasEvidence;

                                            return (
                                                <Fragment
                                                    key={`reward-${row.id}`}
                                                >
                                                    <tr className="align-top odd:bg-muted/10">
                                                        <td className="border p-1.5 text-center text-xs font-medium text-muted-foreground print:p-1">
                                                            {index + 1}
                                                        </td>
                                                        {showRewardReferenceColumn && (
                                                            <td className="border p-1.5 align-top font-medium text-foreground print:p-1">
                                                                {row.cash_reward_reference ||
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showRewardAmount && (
                                                            <td className="border p-1.5 align-top font-medium text-foreground print:p-1">
                                                                {row.cash_reward_amount
                                                                    ? `₹${row.cash_reward_amount}`
                                                                    : '—'}
                                                            </td>
                                                        )}
                                                        {showRewardDate && (
                                                            <td className="border p-1.5 align-top text-xs leading-4 break-words text-foreground print:p-1 print:text-[9px]">
                                                                {formatDate(
                                                                    row.cash_reward_date,
                                                                ) || '—'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                    {hasDetails && (
                                                        <tr className="bg-muted/5 print:break-inside-avoid">
                                                            <td
                                                                className="border px-2 py-2 print:px-1.5 print:pb-1"
                                                                colSpan={
                                                                    rewardColSpan
                                                                }
                                                            >
                                                                <DetailStack
                                                                    items={
                                                                        detailItems
                                                                    }
                                                                />
                                                                {hasEvidence && (
                                                                    <div className="mt-2 space-y-1">
                                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                                            {t(
                                                                                'Evidence',
                                                                            )}
                                                                        </p>
                                                                        <PromotionEvidenceTable
                                                                            rows={
                                                                                evidenceRows
                                                                            }
                                                                            t={
                                                                                t
                                                                            }
                                                                            locale={
                                                                                locale
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Section>
    );
}
