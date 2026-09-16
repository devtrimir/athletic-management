import { router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Coins,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    Trophy,
    Upload,
    X,
} from 'lucide-react';
import { Fragment } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
import type { ConfidentialDocument } from '@/components/shared/confidential-document-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate, formatDateRange } from '@/lib/dates';
import { resolveRankLabel as resolveRankLabelShared } from '@/lib/ranks';

type LiveAchievement = {
    id: number;
    medal_type: string;
    position: number | null;
    remarks: string | null;
    session: { id: number; name: string };
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        date_from?: string | null;
        date_to?: string | null;
        venue?: string | null;
    };
    event: {
        id: number;
        name: string;
        gender_class?: string;
        discipline?: string | null;
        event_type?: string | null;
    };
    benefits: {
        id: number;
        benefit_type: string;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }[];
};
type ParticipationItem = {
    id: number;
    position: number | null;
    remarks?: string | null;
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        date_from?: string | null;
        date_to?: string | null;
        venue?: string | null;
    };
    event: {
        id: number;
        name: string;
        gender_class?: string;
        discipline?: string | null;
        event_type?: string | null;
    };
    achievement: {
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        benefits?: {
            id: number;
            benefit_type: string;
            cash_amount: string | null;
            benefit_date: string | null;
            order_reference: string | null;
            remarks: string | null;
        }[];
    } | null;
};
type ParticipationGroup = {
    session: { id: number; name: string; is_current?: boolean };
    participations: ParticipationItem[];
};

type EvidenceOption = {
    key: string;
    label: string;
    evidences: PromotionEvidenceRef[];
    priority: number;
    tournamentId: number;
    tournamentName: string;
    tierCode: string | null;
    venue?: string | null;
    dateFrom?: string | null;
    sessionName?: string | null;
    eventId: number;
    eventName: string;
    genderClass?: string | null;
    discipline?: string | null;
    eventType?: string | null;
    medalType?: string | null;
    position?: number | null;
    benefitsSummary?: string | null;
};

type TournamentEvidenceGroup = {
    tournamentId: number;
    tournamentName: string;
    tierCode: string | null;
    venue?: string | null;
    dateFrom?: string | null;
    sessionName?: string | null;
    events: EvidenceOption[];
};
type PromotionEvidence = {
    id: number;
    type: 'achievement' | 'participation';
    evidence_id: number;
    summary?: string | null;
    position?: number | null;
    medal_type?: string | null;
    remarks?: string | null;
    session?: {
        id: number;
        name: string;
    } | null;
    tournament?: {
        id: number;
        name: string;
        tier_code: string | null;
    };
    event?: {
        id: number;
        name: string;
        gender_class?: string;
        event_type?: string | null;
    };
    period?: string | null;
    level?: string | null;
    competition_details?: string | null;
    event_date?: string | null;
    venue?: string | null;
    sport_discipline?: string | null;
    date_from?: string | null;
    benefits?: {
        id?: number;
        benefit_type?: string;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }[];
    achievement?: {
        id: number;
        medal_type: string | null;
        position: number | null;
        remarks: string | null;
        benefits: {
            id?: number;
            benefit_type?: string;
            cash_amount: string | null;
            benefit_date: string | null;
            order_reference: string | null;
            remarks: string | null;
            promoted_from_rank?: string | null;
            promoted_to_rank?: string | null;
        }[];
    };
};
type PromotionEvidenceRef = { type: PromotionEvidence['type']; id: number };

type PromotionRow = {
    id: number;
    record_type: 'promotion' | 'reward' | 'promotion_reward';
    promotion_date: string | null;
    from_rank: string | null;
    to_rank: string;
    cash_reward_amount?: string | null;
    cash_reward_date?: string | null;
    cash_reward_reference?: string | null;
    cash_reward_remarks?: string | null;
    reason: string | null;
    remarks: string | null;
    recorded_by_name: string | null;
    document: ConfidentialDocument | null;
    evidences: PromotionEvidence[];
};
type RankOption = {
    code: string;
    name: string;
    short_name: string | null;
    rank_order?: number | null;
};
type InlineRankPayload = {
    code: string;
    name: string;
    rank_order: string;
    short_name: string;
    is_gazetted: boolean;
    is_active: boolean;
};
type Props = {
    memberId: number;
    memberRank: string | null;
    ranks: RankOption[];
    promotions: PromotionRow[] | undefined;
    participations: ParticipationGroup[] | undefined;
    achievements: LiveAchievement[];
    onSaved: () => void;
    showActions?: boolean;
};

function humanize(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function evidenceKey(type: string, id: number): string {
    return `${type}:${id}`;
}

function evidenceSelectionKey(evidence: PromotionEvidence): string {
    if (evidence.tournament?.id && evidence.event?.id) {
        return `event:${evidence.tournament.id}:${evidence.event.id}`;
    }

    return evidenceKey(evidence.type, evidence.evidence_id);
}

function medalEmoji(medalType?: string | null): string {
    if (!medalType) {
        return '🏅';
    }

    const upper = medalType.toUpperCase();

    if (upper === 'GOLD') {
        return '🥇';
    }

    if (upper === 'SILVER') {
        return '🥈';
    }

    if (upper === 'BRONZE') {
        return '🥉';
    }

    return '🏅';
}

function renderMedalBadge(
    medalType: string | null | undefined,
    position: number | null | undefined,
    t: (k: string) => string,
) {
    if (!medalType && !position) {
        return (
            <Badge
                variant="outline"
                className="text-[11px] font-normal text-muted-foreground"
            >
                {t('Participation')}
            </Badge>
        );
    }

    if (medalType === 'GOLD' || position === 1) {
        return (
            <Badge className="gap-1 border-amber-300 bg-amber-100 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                🥇 {medalType ? t(medalType) : '#1'}
            </Badge>
        );
    }

    if (medalType === 'SILVER' || position === 2) {
        return (
            <Badge className="gap-1 border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                🥈 {medalType ? t(medalType) : '#2'}
            </Badge>
        );
    }

    if (medalType === 'BRONZE' || position === 3) {
        return (
            <Badge className="gap-1 border-orange-300 bg-orange-100 text-[11px] font-semibold text-orange-900 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-200">
                🥉 {medalType ? t(medalType) : '#3'}
            </Badge>
        );
    }

    return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
            {medalType ? t(medalType) : `#${position}`}
        </Badge>
    );
}

function groupedEvidenceRefs(
    evidences: PromotionEvidence[] = [],
): Map<string, PromotionEvidenceRef[]> {
    const grouped = new Map<string, PromotionEvidenceRef[]>();

    for (const evidence of evidences) {
        const key = evidenceSelectionKey(evidence);
        const refs = grouped.get(key) ?? [];

        refs.push({ type: evidence.type, id: evidence.evidence_id });
        grouped.set(key, refs);
    }

    return grouped;
}

function visibleEvidenceRows(
    evidences: PromotionEvidence[] = [],
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
): PromotionEvidence[] {
    const visible = new Map<string, PromotionEvidence>();

    for (const evidence of evidences) {
        if (isOtherTierEvidence(evidence, participations, achievements)) {
            continue;
        }

        const key = evidenceSelectionKey(evidence);

        if (!visible.has(key)) {
            visible.set(key, evidence);
        }
    }

    return Array.from(visible.values());
}

function EvidenceSummaryCell({
    evidences,
    participations,
    achievements,
    t,
}: {
    evidences: PromotionEvidence[];
    participations: ParticipationGroup[];
    achievements: LiveAchievement[];
    t: (k: string) => string;
}) {
    const rows = visibleEvidenceRows(evidences, participations, achievements);

    if (rows.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const firstTwo = rows.slice(0, 2);
    const remaining = rows.slice(2);

    return (
        <TooltipProvider>
            <div className="flex flex-wrap items-center gap-1.5">
                {firstTwo.map((row, idx) => {
                    const medal = row.achievement?.medal_type ?? row.medal_type;
                    const eventName = row.event?.name ?? t('Event');
                    const tournamentName = row.tournament?.name;

                    return (
                        <span
                            key={idx}
                            title={
                                tournamentName
                                    ? `${tournamentName} · ${eventName}`
                                    : eventName
                            }
                            className="inline-flex max-w-[170px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                            <span className="shrink-0">
                                {medalEmoji(medal)}
                            </span>
                            <span className="truncate">{eventName}</span>
                        </span>
                    );
                })}

                {remaining.length > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex cursor-pointer items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                +{remaining.length} {t('more')}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-1.5 p-2 text-xs">
                            <p className="border-b border-border/50 pb-1 font-semibold text-muted-foreground">
                                {t('Additional events')}
                            </p>
                            {remaining.map((row, idx) => {
                                const medal =
                                    row.achievement?.medal_type ??
                                    row.medal_type;
                                const eventName = row.event?.name ?? t('Event');
                                const tournamentName = row.tournament?.name;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-1.5 text-left"
                                    >
                                        <span>{medalEmoji(medal)}</span>
                                        <span className="font-medium text-foreground">
                                            {eventName}
                                        </span>
                                        {tournamentName && (
                                            <span className="text-muted-foreground">
                                                ({tournamentName})
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

function participationGroupsForSession(
    participations: ParticipationGroup[],
    sessionId: string,
): ParticipationGroup[] {
    if (!sessionId || sessionId === 'all') {
        return participations;
    }

    return participations.filter(
        (group) => String(group.session.id) === sessionId,
    );
}

function sessionLabelById(
    participations: ParticipationGroup[],
): Map<number, string> {
    const sessionNames = new Map<number, string>();

    for (const group of participations) {
        sessionNames.set(group.session.id, group.session.name);
    }

    return sessionNames;
}


function isOtherTierEvent(tierCode?: string | null): boolean {
    return tierCode?.trim().toUpperCase() === 'OTHER';
}

type PromotionEventBlockSet = {
    eventKeys: Set<string>;
};
function promotedEventKeys(
    promotions: PromotionRow[] | undefined,
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
    rewardMode = false,
    excludedPromotionId?: number,
): PromotionEventBlockSet {
    const participationMap = new Map<
        number,
        { tournamentId: number; eventId: number }
    >();
    const achievementMap = new Map<
        number,
        { tournamentId: number; eventId: number }
    >();
    const eventKeys = new Set<string>();

    for (const group of participations) {
        for (const item of group.participations) {
            participationMap.set(item.id, {
                tournamentId: item.tournament.id,
                eventId: item.event.id,
            });
        }
    }

    for (const item of achievements) {
        achievementMap.set(item.id, {
            tournamentId: item.tournament.id,
            eventId: item.event.id,
        });
    }

    for (const item of promotions ?? []) {
        if (item.id === excludedPromotionId) {
            continue;
        }

        const shouldTrackEvent = rewardMode
            ? Boolean(
                  item.cash_reward_amount !== null &&
                  item.cash_reward_amount !== '' &&
                  item.cash_reward_amount !== undefined,
              )
            : isActualPromotionRow(item);

        for (const evidence of item.evidences) {
            if (!shouldTrackEvent) {
                continue;
            }

            const payloadTournament = evidence.tournament;
            const payloadEvent = evidence.event;

            if (payloadTournament?.id && payloadEvent?.id) {
                eventKeys.add(
                    `event:${payloadTournament.id}:${payloadEvent.id}`,
                );
                continue;
            }

            if (evidence.type === 'participation') {
                const participation = participationMap.get(
                    evidence.evidence_id,
                );

                if (participation) {
                    eventKeys.add(
                        `event:${participation.tournamentId}:${participation.eventId}`,
                    );
                }

                continue;
            }

            if (evidence.type === 'achievement') {
                const achievement = achievementMap.get(evidence.evidence_id);

                if (achievement) {
                    eventKeys.add(
                        `event:${achievement.tournamentId}:${achievement.eventId}`,
                    );
                }
            }
        }
    }

    return { eventKeys };
}

function isActualPromotionRow(item: PromotionRow): boolean {
    const hasPromotionDate = Boolean(
        item.promotion_date !== null &&
        item.promotion_date !== '' &&
        item.promotion_date !== undefined,
    );
    const hasRankChange = Boolean(
        item.from_rank && item.to_rank && item.from_rank !== item.to_rank,
    );
    const hasReason = Boolean(item.reason && item.reason.trim() !== '');

    return hasPromotionDate || hasRankChange || hasReason;
}

function hasPromotionBenefit(
    benefits: { benefit_type: string }[] | undefined,
): boolean {
    return (
        benefits?.some((benefit) =>
            ['PROMOTION', 'OUT_OF_TURN_PROMOTION'].includes(
                benefit.benefit_type,
            ),
        ) ?? false
    );
}
function hasCashAward(
    benefits: { benefit_type: string }[] | undefined,
): boolean {
    return (
        benefits?.some((benefit) =>
            ['CASH_AWARD'].includes(benefit.benefit_type),
        ) ?? false
    );
}
function isOtherTierEvidence(
    evidence: PromotionEvidence,
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
): boolean {
    if (evidence.tournament?.tier_code) {
        return isOtherTierEvent(evidence.tournament.tier_code);
    }

    if (evidence.type === 'participation') {
        for (const group of participations) {
            const item = group.participations.find(
                (p) => p.id === evidence.evidence_id,
            );

            if (item) {
                return isOtherTierEvent(item.tournament.tier_code);
            }
        }

        return false;
    }

    if (evidence.type === 'achievement') {
        const item = achievements.find(
            (item) => item.id === evidence.evidence_id,
        );

        if (!item) {
            return false;
        }

        return isOtherTierEvent(item.tournament.tier_code);
    }

    return false;
}

function evidenceSessionId(
    evidences: PromotionEvidence[],
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
): string {
    for (const evidence of evidences) {
        if (evidence.session?.id) {
            return String(evidence.session.id);
        }

        if (evidence.type === 'participation') {
            for (const group of participations) {
                if (
                    group.participations.some(
                        (item) => item.id === evidence.evidence_id,
                    )
                ) {
                    return String(group.session.id);
                }
            }

            continue;
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (item) => item.id === evidence.evidence_id,
            );

            if (item) {
                return String(item.session.id);
            }

            continue;
        }
    }

    return '';
}

function rankDisplay(rank: RankOption): string {
    return rank.name;
}

function resolveRankInputValue(
    rankValue: string | null | undefined,
    availableRanks: RankOption[],
): string {
    if (!rankValue) {
        return '';
    }

    const normalized = rankValue.trim();
    const exactMatch = availableRanks.find(
        (rank) =>
            rank.code === normalized ||
            rank.name === normalized ||
            rank.short_name === normalized,
    );

    return exactMatch?.code ?? normalized;
}

function resolveRankOrder(
    ranks: RankOption[],
    rankCode: string,
): number | null {
    if (!rankCode) {
        return null;
    }

    return rankOrderByCode(ranks).get(rankCode) ?? null;
}

function rankItemsWithMemberFallback(
    availableRanks: RankOption[],
    fallbackValues: Array<string | null | undefined>,
): ComboboxItem[] {
    const items = availableRanks.map((rank) => ({
        value: rank.code,
        label: rankDisplay(rank),
    }));

    for (const fallback of fallbackValues) {
        const value = resolveRankInputValue(fallback, availableRanks);

        if (!value) {
            continue;
        }

        if (!items.some((item) => item.value === value)) {
            items.unshift({ value, label: value });
        }
    }

    return items;
}

function rankOrderByCode(ranks: RankOption[]): Map<string, number> {
    return new Map(
        ranks.map((rank, index) => [rank.code, rank.rank_order ?? index]),
    );
}

function summarizeBenefits(
    benefits: {
        benefit_type: string;
        cash_amount: string | null;
        order_reference: string | null;
    }[],
    t: (key: string) => string,
): string {
    if (benefits.length === 0) {
        return '';
    }

    return benefits
        .map((benefit) => {
            const parts = [t(benefit.benefit_type)];

            if (benefit.cash_amount) {
                parts.push(`₹${benefit.cash_amount}`);
            }

            if (benefit.order_reference) {
                parts.push(benefit.order_reference);
            }

            return parts.join(' · ');
        })
        .join(' | ');
}

function resolveRankLabel(value: string | null, ranks: RankOption[]): string {
    // Delegates to the shared rank resolver (@/lib/ranks) so rank matching stays in one
    // place; locale is accepted but currently unused by the shared implementation.
    const normalizedRanks = ranks.map((rank) => ({
        code: rank.code,
        name: rank.name,
        short_name: rank.short_name ?? null,
    }));

    return resolveRankLabelShared(value, normalizedRanks, '');
}
function getCsrfToken(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function InlineRankDialog({
    onCreated,
}: {
    onCreated: (rank: RankOption) => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [data, setData] = useState<InlineRankPayload>({
        code: '',
        name: '',
        rank_order: '',
        short_name: '',
        is_gazetted: false,
        is_active: true,
    });
    function setField<K extends keyof InlineRankPayload>(
        field: K,
        value: InlineRankPayload[K],
    ) {
        setData((prev) => ({ ...prev, [field]: value }));
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const response = await fetch('/settings/ranks/inline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    code: data.code,
                    name: data.name,
                    rank_order: Number(data.rank_order),
                    short_name: data.short_name || null,
                    is_gazetted: data.is_gazetted,
                    is_active: data.is_active,
                }),
            });

            if (response.status === 422) {
                const json = (await response.json()) as {
                    errors?: Record<string, string[]>;
                };
                const nextErrors: Record<string, string> = {};
                Object.entries(json.errors ?? {}).forEach(
                    ([field, messages]) => {
                        nextErrors[field] =
                            messages[0] ?? t('The field is invalid.');
                    },
                );
                setErrors(nextErrors);

                return;
            }

            if (!response.ok) {
                throw new Error('Unable to create rank.');
            }

            const json = (await response.json()) as { rank: RankOption };
            onCreated(json.rank);
            setData({
                code: '',
                name: '',
                rank_order: '',
                short_name: '',
                is_gazetted: false,
                is_active: true,
            });
            setOpen(false);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    setErrors({});
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[11px] font-normal text-muted-foreground hover:text-primary"
                >
                    <Plus className="mr-1 size-3" />
                    {t('New rank')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Create rank')}</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-code">
                                {t('Code')}
                            </Label>
                            <Input
                                id="inline-rank-code"
                                value={data.code}
                                onChange={(e) =>
                                    setField('code', e.target.value)
                                }
                            />
                            <InputError message={errors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-order">
                                {t('Order')}
                            </Label>
                            <Input
                                id="inline-rank-order"
                                type="number"
                                min={1}
                                value={data.rank_order}
                                onChange={(e) =>
                                    setField('rank_order', e.target.value)
                                }
                            />
                            <InputError message={errors.rank_order} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-name-en">
                                {t('Name')}
                            </Label>
                            <Input
                                id="inline-rank-name-en"
                                value={data.name}
                                onChange={(e) =>
                                    setField('name', e.target.value)
                                }
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-short-name">
                                {t('Short name')}
                            </Label>
                            <Input
                                id="inline-rank-short-name"
                                value={data.short_name}
                                onChange={(e) =>
                                    setField('short_name', e.target.value)
                                }
                            />
                            <InputError message={errors.short_name} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-gazetted">
                                {t('Gazetted')}
                            </Label>
                            <select
                                id="inline-rank-gazetted"
                                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                                value={data.is_gazetted ? '1' : '0'}
                                onChange={(e) =>
                                    setField(
                                        'is_gazetted',
                                        e.target.value === '1',
                                    )
                                }
                            >
                                <option value="1">{t('Yes')}</option>
                                <option value="0">{t('No')}</option>
                            </select>
                            <InputError message={errors.is_gazetted} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-active">
                                {t('Active')}
                            </Label>
                            <select
                                id="inline-rank-active"
                                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                                value={data.is_active ? '1' : '0'}
                                onChange={(e) =>
                                    setField(
                                        'is_active',
                                        e.target.value === '1',
                                    )
                                }
                            >
                                <option value="1">{t('Yes')}</option>
                                <option value="0">{t('No')}</option>
                            </select>
                            <InputError message={errors.is_active} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && (
                                <Loader2 className="mr-1.5 size-4 animate-spin" />
                            )}
                            {t('Create rank')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function PromotionDialog({
    memberId,
    memberRank,
    ranks,
    promotions = [],
    participations,
    achievements,
    promotion,
    onSaved,
    subjectName,
    triggerLabel,
    mode = 'promotion',
}: {
    memberId: number;
    memberRank: string | null;
    ranks: RankOption[];
    promotions?: PromotionRow[];
    participations: ParticipationGroup[];
    achievements: LiveAchievement[];
    promotion?: PromotionRow;
    onSaved: () => void;
    subjectName?: string;
    triggerLabel?: string;
    mode?: 'promotion' | 'reward';
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableRanks, setAvailableRanks] = useState(ranks);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentError, setDocumentError] = useState<string | null>(null);
    const isRewardAction = mode === 'reward';
    const rewardActionLabel = t('Add cash reward');
    const selectedDefaultEvidenceKeys = useMemo(
        () =>
            promotion?.evidences.map((evidence) =>
                evidenceKey(evidence.type, evidence.evidence_id),
            ) ?? [],
        [promotion],
    );
    const selectedDefaultRefsByKey = useMemo(
        () => groupedEvidenceRefs(promotion?.evidences ?? []),
        [promotion?.evidences],
    );
    const selectedDefaults = useMemo(
        () => Array.from(selectedDefaultRefsByKey.keys()),
        [selectedDefaultRefsByKey],
    );
    const selectedDefaultSet = useMemo(
        () => new Set(selectedDefaultEvidenceKeys),
        [selectedDefaultEvidenceKeys],
    );

    const form = useForm({
        promotion_date: promotion?.promotion_date ?? '',
        from_rank: resolveRankInputValue(
            promotion?.from_rank || memberRank || '',
            availableRanks,
        ),
        to_rank: isRewardAction
            ? resolveRankInputValue(
                  promotion?.to_rank ||
                      promotion?.from_rank ||
                      memberRank ||
                      '',
                  availableRanks,
              )
            : resolveRankInputValue(promotion?.to_rank ?? '', availableRanks),

        cash_reward_amount: promotion?.cash_reward_amount ?? '',
        cash_reward_date: promotion?.cash_reward_date ?? '',
        cash_reward_reference: promotion?.cash_reward_reference ?? '',
        cash_reward_remarks: promotion?.cash_reward_remarks ?? '',
        reason: promotion?.reason ?? '',
        remarks: promotion?.remarks ?? '',
        evidences: selectedDefaults.map((key) => {
            const [type, id] = key.split(':');

            return { type, id: Number(id) };
        }),
    });
    const initialSessionId = useMemo(
        () =>
            evidenceSessionId(
                promotion?.evidences ?? [],
                participations,
                achievements,
            ) || 'all',
        [achievements, participations, promotion],
    );
    const [selected, setSelected] = useState<string[]>(selectedDefaults);
    const [selectedSessionId, setSelectedSessionId] =
        useState(initialSessionId);
    const selectedParticipationGroups = useMemo(
        () => participationGroupsForSession(participations, selectedSessionId),
        [participations, selectedSessionId],
    );
    const excludedPromotionId = promotion?.id;
    const disabledEvidenceKeys = useMemo(
        () =>
            promotedEventKeys(
                promotions,
                participations,
                achievements,
                isRewardAction,
                excludedPromotionId,
            ),
        [
            achievements,
            isRewardAction,
            participations,
            promotions,
            excludedPromotionId,
        ],
    );
    const rankItems: ComboboxItem[] = useMemo(
        () =>
            rankItemsWithMemberFallback(availableRanks, [
                memberRank,
                form.data.from_rank,
                form.data.to_rank,
            ]),
        [availableRanks, form.data.from_rank, form.data.to_rank, memberRank],
    );
    const rankOrderLookup = useMemo(
        () => rankOrderByCode(availableRanks),
        [availableRanks],
    );
    const toRankItems = useMemo(() => {
        const fromRankOrder = resolveRankOrder(
            availableRanks,
            form.data.from_rank,
        );

        if (fromRankOrder === null) {
            return rankItems;
        }

        return rankItems.filter((item) => {
            const rankOrder = rankOrderLookup.get(item.value);

            return (
                item.value === form.data.to_rank ||
                (rankOrder !== undefined && rankOrder > fromRankOrder)
            );
        });
    }, [
        availableRanks,
        form.data.from_rank,
        form.data.to_rank,
        rankItems,
        rankOrderLookup,
    ]);

    const [evidenceSearch, setEvidenceSearch] = useState('');

    function resetFormState() {
        setEvidenceSearch('');
        setDocumentFile(null);
        setDocumentError(null);
        form.setData({
            promotion_date: promotion?.promotion_date ?? '',
            from_rank: resolveRankInputValue(
                promotion?.from_rank || memberRank || '',
                availableRanks,
            ),
            to_rank: isRewardAction
                ? resolveRankInputValue(
                      promotion?.to_rank ||
                          promotion?.from_rank ||
                          memberRank ||
                          '',
                      availableRanks,
                  )
                : resolveRankInputValue(
                      promotion?.to_rank ?? '',
                      availableRanks,
                  ),
            cash_reward_amount: promotion?.cash_reward_amount ?? '',
            cash_reward_date: promotion?.cash_reward_date ?? '',
            cash_reward_reference: promotion?.cash_reward_reference ?? '',
            cash_reward_remarks: promotion?.cash_reward_remarks ?? '',
            reason: promotion?.reason ?? '',
            remarks: promotion?.remarks ?? '',
            evidences: selectedDefaults.map((key) => {
                const [type, id] = key.split(':');

                return { type, id: Number(id) };
            }),
        });
        setSelected(selectedDefaults);
        setSelectedSessionId(
            evidenceSessionId(
                promotion?.evidences ?? [],
                participations,
                achievements,
            ) || 'all',
        );
        form.clearErrors();
        setIsSubmitting(false);
    }

    const sessionOptions = useMemo(() => {
        const uniqueSessionIds = new Set<string>();

        for (const group of participations) {
            uniqueSessionIds.add(String(group.session.id));
        }

        for (const item of achievements) {
            uniqueSessionIds.add(String(item.session.id));
        }

        const labelMap = sessionLabelById(participations);

        for (const item of achievements) {
            if (!labelMap.has(item.session.id)) {
                labelMap.set(item.session.id, item.session.name);
            }
        }

        return [
            { id: 'all', name: t('All sessions') },
            ...Array.from(uniqueSessionIds).map((sessionId) => ({
                id: sessionId,
                name: labelMap.get(Number(sessionId)) ?? `#${sessionId}`,
            })),
        ];
    }, [achievements, participations, t]);

    function handleRankCreated(rank: RankOption) {
        setAvailableRanks((prev) => {
            if (prev.some((item) => item.code === rank.code)) {
                return prev;
            }

            return [...prev, rank].sort((left, right) => {
                const leftOrder = left.rank_order ?? Number.MAX_SAFE_INTEGER;
                const rightOrder = right.rank_order ?? Number.MAX_SAFE_INTEGER;

                if (leftOrder === rightOrder) {
                    return (left.name ?? left.code).localeCompare(
                        right.name ?? right.code,
                    );
                }

                return leftOrder - rightOrder;
            });
        });
        form.setData('to_rank', rank.code);
    }
    useEffect(() => {
        if (
            form.data.to_rank &&
            !toRankItems.some((item) => item.value === form.data.to_rank)
        ) {
            form.setData('to_rank', '');
        }
    }, [form, form.data.to_rank, toRankItems]);

    const options: EvidenceOption[] = useMemo(() => {
        const deduped = new Map<string, EvidenceOption>();

        for (const group of selectedParticipationGroups) {
            for (const item of group.participations) {
                const key = `event:${item.tournament.id}:${item.event.id}`;
                const participationEvidenceKey = evidenceKey(
                    'participation',
                    item.id,
                );
                const participationBenefitBlocked = isRewardAction
                    ? hasCashAward(item.achievement?.benefits)
                    : hasPromotionBenefit(item.achievement?.benefits);

                if (
                    participationBenefitBlocked &&
                    !selectedDefaultSet.has(participationEvidenceKey)
                ) {
                    continue;
                }

                if (
                    isOtherTierEvent(item.tournament.tier_code) &&
                    !selectedDefaultSet.has(participationEvidenceKey)
                ) {
                    continue;
                }

                if (disabledEvidenceKeys.eventKeys.has(key)) {
                    continue;
                }

                const evidences: PromotionEvidenceRef[] = [
                    { type: 'participation', id: item.id },
                ];

                if (item.achievement?.id) {
                    evidences.push({
                        type: 'achievement',
                        id: item.achievement.id,
                    });
                }

                const medalType = item.achievement?.medal_type ?? null;
                const position =
                    item.position ?? item.achievement?.position ?? null;
                const benefitsSummary =
                    item.achievement?.benefits &&
                    item.achievement.benefits.length > 0
                        ? summarizeBenefits(item.achievement.benefits, t)
                        : null;

                const label = `${group.session.name} · ${item.tournament.name} · ${item.event.name}${medalType ? ` · ${t(medalType)}` : ''}${position ? ` · #${position}` : ''}${benefitsSummary ? ` · ${benefitsSummary}` : ''}`;
                const existing = deduped.get(key);

                if (!existing || existing.priority < 2) {
                    deduped.set(key, {
                        key,
                        label,
                        evidences,
                        priority: 2,
                        tournamentId: item.tournament.id,
                        tournamentName: item.tournament.name,
                        tierCode: item.tournament.tier_code,
                        venue: item.tournament.venue,
                        dateFrom: item.tournament.date_from,
                        sessionName: group.session.name,
                        eventId: item.event.id,
                        eventName: item.event.name,
                        genderClass: item.event.gender_class,
                        discipline: item.event.discipline,
                        eventType: item.event.event_type,
                        medalType,
                        position,
                        benefitsSummary,
                    });
                }
            }
        }

        for (const item of achievements) {
            const key = `event:${item.tournament.id}:${item.event.id}`;
            const evidenceKeyValue = evidenceKey('achievement', item.id);
            const achievementBlocked = isRewardAction
                ? hasCashAward(item.benefits)
                : hasPromotionBenefit(item.benefits);

            if (
                achievementBlocked &&
                !selectedDefaultSet.has(evidenceKeyValue)
            ) {
                continue;
            }

            if (
                isOtherTierEvent(item.tournament.tier_code) &&
                !selectedDefaultSet.has(evidenceKeyValue)
            ) {
                continue;
            }

            if (
                selectedSessionId !== 'all' &&
                String(item.session.id) !== selectedSessionId
            ) {
                continue;
            }

            if (disabledEvidenceKeys.eventKeys.has(key)) {
                continue;
            }

            const medalType = item.medal_type ?? null;
            const position = item.position ?? null;
            const benefitsSummary =
                item.benefits && item.benefits.length > 0
                    ? t('Benefit recorded')
                    : null;

            const existing = deduped.get(key);

            if (existing) {
                if (!existing.medalType && medalType) {
                    existing.medalType = medalType;
                    existing.position = position ?? existing.position;
                    existing.label = `${existing.sessionName} · ${existing.tournamentName} · ${existing.eventName} · ${t(medalType)}${existing.position ? ` · #${existing.position}` : ''}`;
                }

                if (
                    !existing.evidences.some(
                        (e) => e.type === 'achievement' && e.id === item.id,
                    )
                ) {
                    existing.evidences.push({
                        type: 'achievement',
                        id: item.id,
                    });
                }
            } else {
                deduped.set(key, {
                    key,
                    label: `${t(item.medal_type)} · ${item.tournament.name} · ${item.event.name}${benefitsSummary ? ` · ${benefitsSummary}` : ''}`,
                    evidences: [{ type: 'achievement', id: item.id }],
                    priority: 1,
                    tournamentId: item.tournament.id,
                    tournamentName: item.tournament.name,
                    tierCode: item.tournament.tier_code,
                    venue: item.tournament.venue,
                    dateFrom: item.tournament.date_from,
                    sessionName: item.session.name,
                    eventId: item.event.id,
                    eventName: item.event.name,
                    genderClass: item.event.gender_class,
                    discipline: item.event.discipline,
                    eventType: item.event.event_type,
                    medalType,
                    position,
                    benefitsSummary,
                });
            }
        }

        return Array.from(deduped.values());
    }, [
        achievements,
        disabledEvidenceKeys.eventKeys,
        selectedDefaultSet,
        selectedParticipationGroups,
        selectedSessionId,
        isRewardAction,
        t,
    ]);

    const tournamentGroups = useMemo(() => {
        const groups = new Map<number, TournamentEvidenceGroup>();

        for (const opt of options) {
            let group = groups.get(opt.tournamentId);

            if (!group) {
                group = {
                    tournamentId: opt.tournamentId,
                    tournamentName: opt.tournamentName,
                    tierCode: opt.tierCode,
                    venue: opt.venue,
                    dateFrom: opt.dateFrom,
                    sessionName: opt.sessionName,
                    events: [],
                };
                groups.set(opt.tournamentId, group);
            }

            group.events.push(opt);
        }

        return Array.from(groups.values());
    }, [options]);

    const filteredTournamentGroups = useMemo(() => {
        const query = evidenceSearch.trim().toLowerCase();

        if (!query) {
            return tournamentGroups;
        }

        return tournamentGroups
            .map((group) => {
                const tournamentMatches =
                    group.tournamentName.toLowerCase().includes(query) ||
                    (group.tierCode?.toLowerCase().includes(query) ?? false) ||
                    (group.venue?.toLowerCase().includes(query) ?? false);

                if (tournamentMatches) {
                    return group;
                }

                const matchingEvents = group.events.filter((event) => {
                    return (
                        event.eventName.toLowerCase().includes(query) ||
                        (event.medalType?.toLowerCase().includes(query) ??
                            false) ||
                        (event.discipline?.toLowerCase().includes(query) ??
                            false) ||
                        (event.genderClass?.toLowerCase().includes(query) ??
                            false)
                    );
                });

                if (matchingEvents.length === 0) {
                    return null;
                }

                return {
                    ...group,
                    events: matchingEvents,
                };
            })
            .filter(
                (group): group is TournamentEvidenceGroup => group !== null,
            );
    }, [tournamentGroups, evidenceSearch]);

    function toggleTournamentSelection(group: TournamentEvidenceGroup) {
        const keys = group.events.map((e) => e.key);
        const allSelected = keys.every((k) => selected.includes(k));

        if (allSelected) {
            setSelected((prev) => prev.filter((k) => !keys.includes(k)));
        } else {
            setSelected((prev) => Array.from(new Set([...prev, ...keys])));
        }
    }

    const selectedEvidenceDetails = useMemo(() => {
        const optionByKey = new Map<string, EvidenceOption>();

        for (const opt of options) {
            optionByKey.set(opt.key, opt);
        }

        return selected.map((key) => {
            const opt = optionByKey.get(key);

            if (opt) {
                return {
                    key,
                    label: opt.label,
                    tournamentName: opt.tournamentName,
                    eventName: opt.eventName,
                    medalType: opt.medalType,
                    position: opt.position,
                    tierCode: opt.tierCode,
                    evidences: opt.evidences,
                };
            }

            const refs = selectedDefaultRefsByKey.get(key) ?? [];

            return {
                key,
                label: key,
                tournamentName: t('Recorded tournament'),
                eventName: key,
                medalType: null,
                position: null,
                tierCode: null,
                evidences: refs,
            };
        });
    }, [options, selected, selectedDefaultRefsByKey, t]);

    function buildPayload() {
        const rewardRank = form.data.from_rank || memberRank || null;

        return {
            promotion_date: isRewardAction
                ? null
                : form.data.promotion_date || null,
            cash_reward_only: isRewardAction,
            from_rank: isRewardAction
                ? rewardRank
                : form.data.from_rank || null,
            to_rank: isRewardAction ? rewardRank : form.data.to_rank || null,
            cash_reward_amount: isRewardAction
                ? form.data.cash_reward_amount || null
                : null,
            cash_reward_date: isRewardAction
                ? form.data.cash_reward_date || null
                : null,
            cash_reward_reference: isRewardAction
                ? form.data.cash_reward_reference || null
                : null,
            cash_reward_remarks: isRewardAction
                ? form.data.cash_reward_remarks || null
                : null,
            reason: isRewardAction ? null : form.data.reason || null,
            remarks: isRewardAction ? null : form.data.remarks || null,
            evidences: selected.flatMap(
                (key) =>
                    options.find((item) => item.key === key)?.evidences ??
                    selectedDefaultRefsByKey.get(key) ??
                    [],
            ),
            document: documentFile,
        };
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.clearErrors();

        let hasError = false;

        if (!isRewardAction) {
            if (
                !form.data.promotion_date ||
                form.data.promotion_date.trim() === ''
            ) {
                form.setError(
                    'promotion_date',
                    t('The promotion date is required.'),
                );
                hasError = true;
            }

            if (!form.data.to_rank || form.data.to_rank.trim() === '') {
                form.setError('to_rank', t('The target rank is required.'));
                hasError = true;
            }
        } else {
            if (
                !form.data.cash_reward_amount ||
                Number(form.data.cash_reward_amount) <= 0
            ) {
                form.setError(
                    'cash_reward_amount',
                    t('The cash reward amount is required.'),
                );
                hasError = true;
            }

            if (
                !form.data.cash_reward_date ||
                form.data.cash_reward_date.trim() === ''
            ) {
                form.setError(
                    'cash_reward_date',
                    t('The cash reward date is required.'),
                );
                hasError = true;
            }

            if (
                !form.data.cash_reward_reference ||
                form.data.cash_reward_reference.trim() === ''
            ) {
                form.setError(
                    'cash_reward_reference',
                    t('The cash reward reference is required.'),
                );
                hasError = true;
            }
        }

        if (selected.length === 0) {
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setIsSubmitting(true);
        const payload = buildPayload();

        if (promotion) {
            router.patch(
                `/members/${memberId}/promotions/${promotion.id}`,
                payload,
                {
                    onSuccess: () => {
                        setIsSubmitting(false);
                        setOpen(false);
                        onSaved();
                    },
                    onError: (errors) => {
                        setIsSubmitting(false);

                        if (errors.document) {
                            setDocumentError(errors.document);
                        }
                    },
                },
            );

            return;
        }

        router.post(`/members/${memberId}/promotions`, payload, {
            onSuccess: () => {
                setIsSubmitting(false);
                setOpen(false);
                form.reset();
                setSelected([]);
                setDocumentFile(null);
                onSaved();
            },
            onError: (errors) => {
                setIsSubmitting(false);

                if (errors.document) {
                    setDocumentError(errors.document);
                }
            },
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (nextOpen) {
                    resetFormState();
                } else {
                    setIsSubmitting(false);
                }
            }}
        >
            <DialogTrigger asChild>
                {promotion ? (
                    <Button variant="outline" size="sm">
                        <Pencil className="mr-1.5 size-3.5" />
                        {t('Edit')}
                    </Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-1.5 size-3.5" />
                        {triggerLabel ??
                            (isRewardAction
                                ? rewardActionLabel
                                : t('Add promotion'))}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent
                className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-4xl"
                aria-describedby="promotion-dialog-description"
            >
                <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex size-10 items-center justify-center rounded-lg ${
                                isRewardAction
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'bg-primary/10 text-primary'
                            }`}
                        >
                            {isRewardAction ? (
                                <Coins className="size-5" />
                            ) : (
                                <Award className="size-5" />
                            )}
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold sm:text-lg">
                                {subjectName
                                    ? `${promotion ? (isRewardAction ? t('Edit cash reward') : t('Edit promotion')) : isRewardAction ? t('Record cash reward') : t('Record promotion')} - ${subjectName}`
                                    : promotion
                                      ? isRewardAction
                                          ? t('Edit cash reward')
                                          : t('Edit promotion')
                                      : isRewardAction
                                        ? t('Record cash reward')
                                        : t('Record promotion')}
                            </DialogTitle>
                            <DialogDescription
                                id="promotion-dialog-description"
                                className="mt-0.5 text-xs text-muted-foreground"
                            >
                                {isRewardAction
                                    ? t(
                                          'Record sanctioned cash reward for meritorious tournament performance.',
                                      )
                                    : t(
                                          'Promote member to a higher rank based on verified tournament achievements.',
                                      )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form
                    id="promotion-dialog-form"
                    onSubmit={handleSubmit}
                    className="flex-1 space-y-5 overflow-y-auto p-6"
                >
                    {isRewardAction ? (
                        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-2xs">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    {t('Reward details')}
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-emerald-300 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                                >
                                    {t('Sanctioned Amount')}
                                </Badge>
                            </div>

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Cash reward amount')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute top-2.5 left-3 text-xs font-bold text-muted-foreground">
                                            ₹
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={form.data.cash_reward_amount}
                                            onChange={(e) =>
                                                form.setData(
                                                    'cash_reward_amount',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="50000"
                                            className="h-9 pl-7 text-xs font-medium"
                                        />
                                    </div>
                                    <InputError
                                        message={form.errors.cash_reward_amount}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Cash reward date')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                    </div>
                                    <DatePicker
                                        value={form.data.cash_reward_date}
                                        onChange={(v) =>
                                            form.setData('cash_reward_date', v)
                                        }
                                    />
                                    <InputError
                                        message={form.errors.cash_reward_date}
                                    />
                                </div>
                            </div>

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Sanction / Order reference')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                    </div>
                                    <Input
                                        value={form.data.cash_reward_reference}
                                        onChange={(e) =>
                                            form.setData(
                                                'cash_reward_reference',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'e.g. GO No. 128/Sports/2026',
                                        )}
                                        className="h-9 text-xs"
                                    />
                                    <InputError
                                        message={
                                            form.errors.cash_reward_reference
                                        }
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Remarks / Notes')}
                                        </Label>
                                    </div>
                                    <Input
                                        value={form.data.cash_reward_remarks}
                                        onChange={(e) =>
                                            form.setData(
                                                'cash_reward_remarks',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'Disbursement notes or remarks',
                                        )}
                                        className="h-9 text-xs"
                                    />
                                    <InputError
                                        message={
                                            form.errors.cash_reward_remarks
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-2xs">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    {t('Rank & Order Details')}
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-primary/30 text-[11px] font-medium text-primary"
                                >
                                    {t('Rank Progression')}
                                </Badge>
                            </div>

                            {/* Visual Rank Ladder Preview */}
                            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                        {t('Current rank')}
                                    </span>
                                    <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                                        {resolveRankLabel(
                                            form.data.from_rank,
                                            ranks,
                                        ) || t('Unknown')}
                                    </span>
                                </div>
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <ArrowRight className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                    <span className="block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                        {t('Promoted to rank')}
                                    </span>
                                    <span
                                        className={`mt-0.5 block truncate text-sm font-semibold ${
                                            form.data.to_rank
                                                ? 'text-primary'
                                                : 'text-muted-foreground italic'
                                        }`}
                                    >
                                        {resolveRankLabel(
                                            form.data.to_rank,
                                            ranks,
                                        ) || t('Select target rank')}
                                    </span>
                                </div>
                            </div>

                            {/* Fields Grid */}
                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Promotion date')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                    </div>
                                    <DatePicker
                                        value={form.data.promotion_date}
                                        onChange={(v) =>
                                            form.setData('promotion_date', v)
                                        }
                                    />
                                    <InputError
                                        message={form.errors.promotion_date}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Promoted to rank')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <InlineRankDialog
                                            onCreated={handleRankCreated}
                                        />
                                    </div>
                                    <Combobox
                                        value={form.data.to_rank}
                                        onValueChange={(v) =>
                                            form.setData('to_rank', v)
                                        }
                                        items={toRankItems}
                                        placeholder={t(
                                            'Search and select rank',
                                        )}
                                        searchPlaceholder={t(
                                            'Search ranks by code or name…',
                                        )}
                                        emptyMessage={t('No ranks found.')}
                                    />
                                    <InputError message={form.errors.to_rank} />
                                </div>
                            </div>

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Order number / Reason')}
                                        </Label>
                                    </div>
                                    <Input
                                        value={form.data.reason}
                                        onChange={(e) =>
                                            form.setData(
                                                'reason',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'e.g. PHQ Order No. 45/Sports/2026 - Out of turn promotion',
                                        )}
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={form.errors.reason} />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Remarks / Notes')}
                                        </Label>
                                    </div>
                                    <Input
                                        value={form.data.remarks}
                                        onChange={(e) =>
                                            form.setData(
                                                'remarks',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'Additional committee remarks or remarks',
                                        )}
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={form.errors.remarks} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 2: Supporting Tournament Evidence */}
                    <div className="space-y-3.5 rounded-lg border bg-card p-4 shadow-2xs">
                        <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Trophy className="size-4 shrink-0 text-amber-500" />
                                    <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        {t('Supporting tournament evidence')}
                                    </span>
                                    <span className="font-bold text-destructive">
                                        *
                                    </span>
                                    {selected.length > 0 && (
                                        <Badge
                                            variant="default"
                                            className="h-5 px-1.5 text-[11px] font-semibold"
                                        >
                                            {selected.length} {t('selected')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {isRewardAction
                                        ? t(
                                              'Select verified tournament achievements that justify this cash reward.',
                                          )
                                        : t(
                                              'Select verified tournament achievements that justify this rank promotion.',
                                          )}
                                </p>
                            </div>

                            {/* Session Filter & Search */}
                            <div className="flex items-center gap-2">
                                <Select
                                    value={selectedSessionId}
                                    onValueChange={(val) =>
                                        setSelectedSessionId(val)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-36 text-xs">
                                        <SelectValue
                                            placeholder={t('Session')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessionOptions.map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={s.id}
                                                className="text-xs"
                                            >
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="relative w-44 sm:w-56">
                                    <Search className="absolute top-2.5 left-2.5 size-3 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder={t(
                                            'Search events, medals…',
                                        )}
                                        value={evidenceSearch}
                                        onChange={(e) =>
                                            setEvidenceSearch(e.target.value)
                                        }
                                        className="h-8 pr-7 pl-7 text-xs"
                                    />
                                    {evidenceSearch && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEvidenceSearch('')
                                            }
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tournament and Events List */}
                        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                            {filteredTournamentGroups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/10 p-8 text-center">
                                    <Trophy className="mb-2 size-8 text-muted-foreground/40" />
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {options.length === 0
                                            ? t(
                                                  'No eligible tournament events or achievements found in this session.',
                                              )
                                            : t('No events matching search.')}
                                    </p>
                                    {options.length === 0 && (
                                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                                            {t(
                                                "Try selecting All sessions to view the member's complete career history.",
                                            )}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                filteredTournamentGroups.map((group) => {
                                    const groupKeys = group.events.map(
                                        (e) => e.key,
                                    );
                                    const allSelected =
                                        groupKeys.length > 0 &&
                                        groupKeys.every((k) =>
                                            selected.includes(k),
                                        );

                                    return (
                                        <div
                                            key={group.tournamentId}
                                            className="overflow-hidden rounded-md border bg-card text-card-foreground shadow-2xs"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {group.tournamentName}
                                                    </span>
                                                    {group.sessionName && (
                                                        <Badge
                                                            variant="outline"
                                                            className="h-4 px-1.5 py-0 text-[10px] text-muted-foreground"
                                                        >
                                                            {group.sessionName}
                                                        </Badge>
                                                    )}
                                                    {group.tierCode && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="h-4 px-1.5 py-0 text-[10px]"
                                                        >
                                                            {group.tierCode}
                                                        </Badge>
                                                    )}
                                                    {group.venue && (
                                                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                                            📍 {group.venue}
                                                        </span>
                                                    )}
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant={
                                                        allSelected
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleTournamentSelection(
                                                            group,
                                                        )
                                                    }
                                                    className="h-6 px-2 text-[11px] font-normal"
                                                >
                                                    {allSelected
                                                        ? t(
                                                              'Deselect tournament',
                                                          )
                                                        : `${t('Select all')} (${group.events.length})`}
                                                </Button>
                                            </div>

                                            <div className="divide-y divide-border/50">
                                                {group.events.map((item) => {
                                                    const isChecked =
                                                        selected.includes(
                                                            item.key,
                                                        );

                                                    return (
                                                        <label
                                                            key={item.key}
                                                            className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-muted/30 ${
                                                                isChecked
                                                                    ? 'border-l-2 border-l-primary bg-primary/5'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2.5">
                                                                <Checkbox
                                                                    checked={
                                                                        isChecked
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) => {
                                                                        setSelected(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                checked
                                                                                    ? [
                                                                                          ...prev,
                                                                                          item.key,
                                                                                      ]
                                                                                    : prev.filter(
                                                                                          (
                                                                                              k,
                                                                                          ) =>
                                                                                              k !==
                                                                                              item.key,
                                                                                      ),
                                                                        );
                                                                    }}
                                                                />
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    {renderMedalBadge(
                                                                        item.medalType,
                                                                        item.position,
                                                                        t,
                                                                    )}
                                                                    <span className="truncate text-xs font-medium text-foreground">
                                                                        {
                                                                            item.eventName
                                                                        }
                                                                    </span>
                                                                    {item.genderClass && (
                                                                        <span className="hidden text-[11px] text-muted-foreground md:inline">
                                                                            (
                                                                            {
                                                                                item.genderClass
                                                                            }
                                                                            )
                                                                        </span>
                                                                    )}
                                                                    {item.discipline && (
                                                                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                                                            ·{' '}
                                                                            {
                                                                                item.discipline
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-1.5">
                                                                {item.eventType && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            item.eventType ===
                                                                            'team'
                                                                                ? 'border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200'
                                                                                : 'border-teal-200 bg-teal-50 text-[10px] text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200'
                                                                        }
                                                                    >
                                                                        {item.eventType ===
                                                                        'team'
                                                                            ? t(
                                                                                  'Team',
                                                                              )
                                                                            : t(
                                                                                  'Individual',
                                                                              )}
                                                                    </Badge>
                                                                )}
                                                                {item.benefitsSummary && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                                                    >
                                                                        {
                                                                            item.benefitsSummary
                                                                        }
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Evidence Chips */}
                        {selected.length > 0 ? (
                            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <CheckCircle2 className="size-3.5 text-primary" />
                                        <span>{t('Selected evidence')}</span>
                                        <Badge
                                            variant="default"
                                            className="h-4 px-1.5 text-[10px]"
                                        >
                                            {selected.length}
                                        </Badge>
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelected([])}
                                        className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                                    >
                                        {t('Clear all')}
                                    </Button>
                                </div>
                                <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                                    {selectedEvidenceDetails.map((item) => (
                                        <span
                                            key={item.key}
                                            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium shadow-2xs"
                                        >
                                            <span>
                                                {medalEmoji(item.medalType)}
                                            </span>
                                            <span className="max-w-[160px] truncate text-foreground">
                                                {item.eventName}
                                            </span>
                                            <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
                                                ({item.tournamentName})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelected((prev) =>
                                                        prev.filter(
                                                            (k) =>
                                                                k !== item.key,
                                                        ),
                                                    );
                                                }}
                                                className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                aria-label={t('Remove')}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                ⚠{' '}
                                {t(
                                    'At least one tournament achievement must be selected as justification.',
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Supporting Document */}
                    <div className="space-y-2 rounded-lg border bg-card p-4 shadow-2xs">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                {t('Supporting document')}
                            </span>
                        </div>
                        <label className="relative flex min-w-0 cursor-pointer items-start gap-3 overflow-hidden rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                            <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                <Upload className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium break-words">
                                    {documentFile?.name ??
                                        promotion?.document?.original_name ??
                                        t('Upload supporting document')}
                                </span>
                                <span className="mt-1 block text-xs break-words text-muted-foreground">
                                    {t(
                                        'PDF, JPG, PNG, or WEBP. Stored privately and available only to authorized users.',
                                    )}
                                </span>
                            </span>
                            <input
                                className="sr-only"
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;

                                    if (file) {
                                        const allowedTypes = [
                                            'application/pdf',
                                            'image/jpeg',
                                            'image/png',
                                            'image/webp',
                                        ];

                                        if (!allowedTypes.includes(file.type)) {
                                            setDocumentError(
                                                t(
                                                    'Only PDF, JPG, PNG, or WEBP files are allowed.',
                                                ),
                                            );
                                            e.target.value = '';

                                            return;
                                        }

                                        if (file.size > 5 * 1024 * 1024) {
                                            setDocumentError(
                                                t(
                                                    'The document must not be larger than 5 MB.',
                                                ),
                                            );
                                            e.target.value = '';

                                            return;
                                        }
                                    }

                                    setDocumentError(null);
                                    setDocumentFile(file);
                                }}
                            />
                        </label>
                        <InputError message={documentError ?? undefined} />
                    </div>
                </form>

                <DialogFooter className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3.5 sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                        {selected.length > 0 ? (
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5" />
                                {selected.length}{' '}
                                {t('achievement(s) attached as evidence')}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {t('Select evidence to continue')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            form="promotion-dialog-form"
                            disabled={selected.length === 0 || isSubmitting}
                        >
                            {isSubmitting && (
                                <Loader2 className="mr-1.5 size-4 animate-spin" />
                            )}
                            {isRewardAction
                                ? promotion
                                    ? t('Save cash reward')
                                    : t('Add cash reward')
                                : promotion
                                  ? t('Save changes')
                                  : t('Save promotion')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function PromotionsTab({
    memberId,
    memberRank,
    ranks,
    promotions,
    participations = [],
    achievements,
    onSaved,
    showActions = true,
}: Props) {
    const { t } = useTranslation();
    const [expandedPromotionIds, setExpandedPromotionIds] = useState<number[]>(
        [],
    );
    const [activePromoTab, setActivePromoTab] = useState<
        'promotions' | 'rewards'
    >('promotions');
    function isPromotionExpanded(promotionId: number): boolean {
        return expandedPromotionIds.includes(promotionId);
    }
    function togglePromotionDetails(promotionId: number) {
        setExpandedPromotionIds((prev) =>
            prev.includes(promotionId)
                ? prev.filter((id) => id !== promotionId)
                : [...prev, promotionId],
        );
    }

    function promotionCategory(promotion: PromotionRow): string {
        if (promotion.record_type === 'promotion_reward') {
            return t('Promotion + Reward');
        }

        if (promotion.record_type === 'reward') {
            return t('Reward');
        }

        return t('Promotion');
    }
    function promotionCategoryClass(promotion: PromotionRow): string {
        if (promotion.record_type === 'promotion_reward') {
            return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
        }

        if (promotion.record_type === 'reward') {
            return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
        }

        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
    }
    function evidenceTypeClass(type: PromotionEvidence['type']): string {
        if (type === 'participation') {
            return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200';
        }

        if (type === 'achievement') {
            return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200';
        }

        return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200';
    }
    function evidenceTypeLabel(evidence: PromotionEvidence): string {
        if (evidence.type === 'participation') {
            return t('Participation');
        }

        if (evidence.type === 'achievement') {
            return t('Achievement');
        }

        return t('Evidence');
    }
    function evidenceSessionLabel(evidence: PromotionEvidence): string {
        if (evidence.session?.name) {
            return evidence.session.name;
        }

        if (evidence.type === 'participation') {
            const participation = participations
                .flatMap((group) => group.participations)
                .find((item) => item.id === evidence.evidence_id);

            if (participation) {
                const session = participations.find((group) =>
                    group.participations.some(
                        (item) => item.id === evidence.evidence_id,
                    ),
                )?.session;

                return session?.name ?? t('No session');
            }
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            if (item) {
                const sessionName = sessionLabelById(participations).get(
                    item.session.id,
                );

                return sessionName ?? String(item.session.id);
            }
        }

        return t('No session');
    }
    function evidenceTournamentLabel(evidence: PromotionEvidence): string {
        if (evidence.tournament?.name) {
            return evidence.tournament.name;
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            return item?.tournament.name ?? t('—');
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.tournament.name ?? t('—');
        }

        return t('—');
    }
    function evidenceEventLabel(evidence: PromotionEvidence): string {
        if (evidence.event?.name) {
            return evidence.event.name;
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            return item?.event.name ?? t('—');
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.event.name ?? t('—');
        }

        return t('—');
    }
    function evidenceEventTypeLabel(evidence: PromotionEvidence): string {
        let eventType = evidence.event?.event_type;

        if (!eventType && evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            eventType = item?.event.event_type;
        }

        if (!eventType && evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            eventType = item?.event.event_type;
        }

        if (eventType === 'team') {
            return t('Team');
        }

        if (eventType === 'individual') {
            return t('Individual');
        }

        return t('—');
    }
    function evidenceTierLabel(evidence: PromotionEvidence): string {
        const tierCode =
            evidence.tournament?.tier_code ??
            (evidence.type === 'participation'
                ? (participations
                      .flatMap((group) => group.participations)
                      .find((record) => record.id === evidence.evidence_id)
                      ?.tournament.tier_code ?? null)
                : evidence.type === 'achievement'
                  ? (achievements.find((a) => a.id === evidence.evidence_id)
                        ?.tournament.tier_code ?? null)
                  : null);

        if (!tierCode) {
            return '—';
        }

        const translated = t(tierCode);

        return translated === tierCode ? humanize(tierCode) : translated;
    }
    function evidenceVenueLabel(evidence: PromotionEvidence): string {
        if (evidence.venue) {
            return evidence.venue;
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            return item?.tournament.venue ?? '—';
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.tournament.venue ?? '—';
        }

        return '—';
    }
    function evidenceDateLabel(evidence: PromotionEvidence): string {
        if (evidence.date_from) {
            return formatDate(evidence.date_from);
        }

        if (evidence.event_date) {
            return formatDate(evidence.event_date);
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            if (item?.tournament.date_from) {
                return formatDateRange(
                    item.tournament.date_from,
                    item.tournament.date_to,
                );
            }
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            if (item?.tournament.date_from) {
                return formatDateRange(
                    item.tournament.date_from,
                    item.tournament.date_to,
                );
            }
        }

        return '—';
    }
    function evidenceDetailLabel(evidence: PromotionEvidence): string {
        const details = new Array<string>();

        if (evidence.remarks) {
            details.push(evidence.remarks);
        }

        if (evidence.benefits?.length) {
            const benefitText = evidence.benefits
                .map((benefit) => {
                    const parts = new Array<string>();

                    if (benefit.benefit_type) {
                        parts.push(t(benefit.benefit_type));
                    }

                    if (benefit.cash_amount) {
                        parts.push(`₹${benefit.cash_amount}`);
                    }

                    if (benefit.benefit_date) {
                        parts.push(formatDate(benefit.benefit_date));
                    }

                    if (benefit.order_reference) {
                        parts.push(benefit.order_reference);
                    }

                    if (benefit.remarks) {
                        parts.push(benefit.remarks);
                    }

                    return parts.join(' · ');
                })
                .filter((value) => value.length > 0);

            if (benefitText.length > 0) {
                details.push(benefitText.join(' | '));
            }
        }

        if (details.length > 0) {
            return details.join(' · ');
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            if (item?.achievement?.remarks) {
                return item.achievement.remarks;
            }

            if (item?.remarks) {
                return item.remarks;
            }
        }

        if (evidence.type === 'achievement') {
            if (evidence.achievement?.remarks) {
                return evidence.achievement.remarks;
            }

            const item = achievements.find(
                (item) => item.id === evidence.evidence_id,
            );

            if (item?.remarks) {
                return item.remarks;
            }
        }

        return '';
    }

    function evidenceMedalLabel(evidence: PromotionEvidence): string {
        if (evidence.medal_type) {
            return t(evidence.medal_type);
        }

        if (evidence.type === 'participation') {
            if (evidence.achievement?.medal_type) {
                return t(evidence.achievement.medal_type);
            }

            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            return item?.achievement?.medal_type
                ? t(item.achievement.medal_type)
                : '—';
        }

        if (evidence.type === 'achievement') {
            if (evidence.achievement?.medal_type) {
                return t(evidence.achievement.medal_type);
            }

            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.medal_type ? t(item.medal_type) : '—';
        }

        return '—';
    }
    function evidenceValue(evidence: PromotionEvidence): string {
        if (evidence.type === 'participation') {
            if (evidence.position) {
                return `#${evidence.position}`;
            }

            if (evidence.achievement?.position) {
                return `#${evidence.achievement.position}`;
            }

            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            if (item?.position) {
                return `#${item.position}`;
            }
        }

        return `#${evidence.evidence_id}`;
    }
    function handleDelete(id: number) {
        router.delete(`/members/${memberId}/promotions/${id}`, {
            onSuccess: onSaved,
        });
    }
    function hasPromotionFields(promotion: PromotionRow): boolean {
        return promotion.record_type !== 'reward';
    }
    function hasRewardFields(promotion: PromotionRow): boolean {
        return promotion.record_type !== 'promotion';
    }
    const promotionRows = useMemo(
        () =>
            (promotions ?? []).filter((promotion) =>
                hasPromotionFields(promotion),
            ),
        [promotions],
    );
    const rewardRows = useMemo(
        () =>
            (promotions ?? []).filter((promotion) =>
                hasRewardFields(promotion),
            ),
        [promotions],
    );
    const activeRows =
        activePromoTab === 'promotions' ? promotionRows : rewardRows;

    return (
        <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-medium">
                        {t('Promotions & rewards')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t('Current rank')}:{' '}
                        {memberRank
                            ? resolveRankLabel(memberRank, ranks)
                            : t('Unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Promotion decisions based on multiple achievements and performance evidence.',
                        )}
                    </p>
                </div>
                {showActions ? (
                    <div className="flex flex-wrap gap-2">
                        {activePromoTab === 'promotions' ? (
                            <PromotionDialog
                                memberId={memberId}
                                memberRank={memberRank}
                                ranks={ranks}
                                promotions={promotions}
                                participations={participations}
                                achievements={achievements}
                                onSaved={onSaved}
                            />
                        ) : (
                            <PromotionDialog
                                memberId={memberId}
                                memberRank={memberRank}
                                ranks={ranks}
                                promotions={promotions}
                                participations={participations}
                                achievements={achievements}
                                onSaved={onSaved}
                                triggerLabel={t('Add cash reward')}
                                mode="reward"
                            />
                        )}
                    </div>
                ) : null}
            </div>
            <Tabs
                value={activePromoTab}
                onValueChange={(value) =>
                    setActivePromoTab(value as 'promotions' | 'rewards')
                }
            >
                <TabsList>
                    <TabsTrigger value="promotions">
                        {t('Promotions')}
                    </TabsTrigger>
                    <TabsTrigger value="rewards">{t('Rewards')}</TabsTrigger>
                </TabsList>
            </Tabs>
            {activeRows.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                    {activePromoTab === 'promotions'
                        ? t('No promotions yet.')
                        : t('No rewards yet.')}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700">
                    {activePromoTab === 'promotions' ? (
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left dark:bg-slate-900">
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('No.')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Type')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('From rank')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('To rank')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Decision date')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Reason / Remarks')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Evidence')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Recorded by')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRows.map((promotion, index) => {
                                    const showDetails = isPromotionExpanded(
                                        promotion.id,
                                    );

                                    return (
                                        <Fragment key={promotion.id}>
                                            <tr className="border-b align-top hover:bg-slate-50/70 dark:hover:bg-slate-950">
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-sm text-slate-500 dark:border-slate-700">
                                                    {index + 1}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`px-2 py-0.5 text-xs ${promotionCategoryClass(promotion)}`}
                                                    >
                                                        {promotionCategory(
                                                            promotion,
                                                        )}
                                                    </Badge>
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs font-medium">
                                                    {resolveRankLabel(
                                                        promotion.from_rank,
                                                        ranks,
                                                    ) || t('Unknown')}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs font-medium">
                                                    {resolveRankLabel(
                                                        promotion.to_rank,
                                                        ranks,
                                                    ) || t('Unknown')}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    {formatDate(
                                                        promotion.promotion_date,
                                                    ) || '—'}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    <div className="space-y-1">
                                                        {promotion.reason ? (
                                                            <p className="leading-tight">
                                                                {
                                                                    promotion.reason
                                                                }
                                                            </p>
                                                        ) : (
                                                            <p className="leading-tight text-muted-foreground">
                                                                {promotion.remarks
                                                                    ? promotion.remarks
                                                                    : t(
                                                                          'No reason provided',
                                                                      )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    <EvidenceSummaryCell
                                                        evidences={
                                                            promotion.evidences
                                                        }
                                                        participations={
                                                            participations
                                                        }
                                                        achievements={
                                                            achievements
                                                        }
                                                        t={t}
                                                    />
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.recorded_by_name ? (
                                                        promotion.recorded_by_name
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                togglePromotionDetails(
                                                                    promotion.id,
                                                                )
                                                            }
                                                        >
                                                            {showDetails ? (
                                                                <ChevronDown className="mr-1 size-4" />
                                                            ) : (
                                                                <ChevronRight className="mr-1 size-4" />
                                                            )}
                                                            {showDetails
                                                                ? t(
                                                                      'Hide details',
                                                                  )
                                                                : t(
                                                                      'Show details',
                                                                  )}
                                                        </Button>
                                                        {promotion.document && (
                                                            <ConfidentialDocumentPreview
                                                                document={
                                                                    promotion.document
                                                                }
                                                                triggerLabel={t(
                                                                    'View document',
                                                                )}
                                                            />
                                                        )}
                                                        <PromotionDialog
                                                            memberId={memberId}
                                                            memberRank={
                                                                memberRank
                                                            }
                                                            ranks={ranks}
                                                            promotions={
                                                                promotions
                                                            }
                                                            participations={
                                                                participations
                                                            }
                                                            achievements={
                                                                achievements
                                                            }
                                                            promotion={
                                                                promotion
                                                            }
                                                            onSaved={onSaved}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    promotion.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {showDetails ? (
                                                <tr className="border-b">
                                                    <td
                                                        className="px-2 py-1.5"
                                                        colSpan={9}
                                                    >
                                                        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/20">
                                                            <p className="mb-1.5 text-xs font-medium tracking-[0.02em] text-muted-foreground uppercase">
                                                                {t(
                                                                    'Evidence list',
                                                                )}
                                                            </p>
                                                            {(() => {
                                                                const rows =
                                                                    visibleEvidenceRows(
                                                                        promotion.evidences,
                                                                        participations,
                                                                        achievements,
                                                                    );

                                                                return (
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full border-collapse text-xs">
                                                                            <thead>
                                                                                <tr className="border-b text-left">
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'No.',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Type',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tournament',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Venue',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Date',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Tier',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Session',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Event',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Event type',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Evidence',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Medal',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Details',
                                                                                        )}
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {rows.length ===
                                                                                0 ? (
                                                                                    <tr>
                                                                                        <td
                                                                                            colSpan={
                                                                                                12
                                                                                            }
                                                                                            className="px-2 py-2 text-muted-foreground"
                                                                                        >
                                                                                            {t(
                                                                                                'No evidence linked',
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ) : (
                                                                                    rows.map(
                                                                                        (
                                                                                            evidence,
                                                                                            index,
                                                                                        ) => (
                                                                                            <tr
                                                                                                key={evidenceKey(
                                                                                                    evidence.type,
                                                                                                    evidence.evidence_id,
                                                                                                )}
                                                                                                className="border-b last:border-0 hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                                                                                            >
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {index +
                                                                                                        1}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    <Badge
                                                                                                        variant="outline"
                                                                                                        className={`px-2 py-0.5 text-xs ${evidenceTypeClass(evidence.type)}`}
                                                                                                    >
                                                                                                        {evidenceTypeLabel(
                                                                                                            evidence,
                                                                                                        )}
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTournamentLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceVenueLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceDateLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceTierLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceSessionLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceEventLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceEventTypeLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceValue(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceMedalLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="px-2 py-1.5">
                                                                                                    {evidenceDetailLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ),
                                                                                    )
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-left dark:bg-slate-900">
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('No.')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Type')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Reward date')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Reward amount')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Reference')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Evidence')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Recorded by')}
                                    </th>
                                    <th className="px-2 py-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRows.map((promotion, index) => {
                                    const isRewardOnly =
                                        !hasPromotionFields(promotion);
                                    const showDetails = isPromotionExpanded(
                                        promotion.id,
                                    );

                                    return (
                                        <Fragment key={promotion.id}>
                                            <tr className="border-b align-top hover:bg-slate-50/70 dark:hover:bg-slate-950">
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-sm text-slate-500 dark:border-slate-700">
                                                    {index + 1}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`px-2 py-0.5 text-xs ${promotionCategoryClass(promotion)}`}
                                                    >
                                                        {promotionCategory(
                                                            promotion,
                                                        )}
                                                    </Badge>
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    {formatDate(
                                                        promotion.cash_reward_date ??
                                                            promotion.promotion_date,
                                                    ) || '—'}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.cash_reward_amount ? (
                                                        `₹${promotion.cash_reward_amount}`
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.cash_reward_reference ? (
                                                        promotion.cash_reward_reference
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5">
                                                    <EvidenceSummaryCell
                                                        evidences={
                                                            promotion.evidences
                                                        }
                                                        participations={
                                                            participations
                                                        }
                                                        achievements={
                                                            achievements
                                                        }
                                                        t={t}
                                                    />
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.recorded_by_name ? (
                                                        promotion.recorded_by_name
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                togglePromotionDetails(
                                                                    promotion.id,
                                                                )
                                                            }
                                                        >
                                                            {showDetails ? (
                                                                <ChevronDown className="mr-1 size-4" />
                                                            ) : (
                                                                <ChevronRight className="mr-1 size-4" />
                                                            )}
                                                            {showDetails
                                                                ? t(
                                                                      'Hide details',
                                                                  )
                                                                : t(
                                                                      'Show details',
                                                                  )}
                                                        </Button>
                                                        {promotion.document && (
                                                            <ConfidentialDocumentPreview
                                                                document={
                                                                    promotion.document
                                                                }
                                                                triggerLabel={t(
                                                                    'View document',
                                                                )}
                                                            />
                                                        )}
                                                        <PromotionDialog
                                                            memberId={memberId}
                                                            memberRank={
                                                                memberRank
                                                            }
                                                            ranks={ranks}
                                                            promotions={
                                                                promotions
                                                            }
                                                            participations={
                                                                participations
                                                            }
                                                            achievements={
                                                                achievements
                                                            }
                                                            promotion={
                                                                promotion
                                                            }
                                                            mode={
                                                                isRewardOnly
                                                                    ? 'reward'
                                                                    : undefined
                                                            }
                                                            triggerLabel={t(
                                                                'Edit',
                                                            )}
                                                            onSaved={onSaved}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    promotion.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {showDetails ? (
                                                <tr className="border-b">
                                                    <td
                                                        className="px-2 py-1.5"
                                                        colSpan={8}
                                                    >
                                                        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/20">
                                                            <p className="mb-1.5 text-xs font-medium tracking-[0.02em] text-muted-foreground uppercase">
                                                                {t(
                                                                    'Evidence list',
                                                                )}
                                                            </p>
                                                            {(() => {
                                                                const rows =
                                                                    visibleEvidenceRows(
                                                                        promotion.evidences,
                                                                        participations,
                                                                        achievements,
                                                                    );

                                                                return (
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full border-collapse text-xs">
                                                                            <thead>
                                                                                <tr className="border-b text-left">
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'No.',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Type',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tournament',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Venue',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Date',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Tier',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Session',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Event',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                                                        {t(
                                                                                            'Event type',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Evidence',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Medal',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Details',
                                                                                        )}
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {rows.length ===
                                                                                0 ? (
                                                                                    <tr>
                                                                                        <td
                                                                                            colSpan={
                                                                                                12
                                                                                            }
                                                                                            className="px-2 py-2 text-muted-foreground"
                                                                                        >
                                                                                            {t(
                                                                                                'No evidence linked',
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ) : (
                                                                                    rows.map(
                                                                                        (
                                                                                            evidence,
                                                                                            evidenceIndex,
                                                                                        ) => (
                                                                                            <tr
                                                                                                key={evidenceKey(
                                                                                                    evidence.type,
                                                                                                    evidence.evidence_id,
                                                                                                )}
                                                                                                className="border-b last:border-0 hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                                                                                            >
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceIndex +
                                                                                                        1}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    <Badge
                                                                                                        variant="outline"
                                                                                                        className={`px-2 py-0.5 text-xs ${evidenceTypeClass(evidence.type)}`}
                                                                                                    >
                                                                                                        {evidenceTypeLabel(
                                                                                                            evidence,
                                                                                                        )}
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTournamentLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceVenueLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceDateLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceTierLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceSessionLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceEventLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                                                                                                    {evidenceEventTypeLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceValue(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceMedalLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="px-2 py-1.5">
                                                                                                    {evidenceDetailLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ),
                                                                                    )
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
