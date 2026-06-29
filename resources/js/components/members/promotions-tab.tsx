import { router, useForm } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Loader2,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { Fragment } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type LegacyAchievement = {
    id: number;
    period: string;
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    medal_type: string | null;
    position: number | null;
    sort_order: number | null;
    benefits: {
        id: number;
        benefit_type: string;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }[];
    remarks: string | null;
    session: {
        id: number;
        name: string;
    } | null;
};
type LiveAchievement = {
    id: number;
    medal_type: string;
    position: number | null;
    remarks: string | null;
    session: { id: number; name: string };
    tournament: { id: number; name: string; tier_code: string | null };
    event: { id: number; name: string };
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
        date_from: string | null;
    };
    event: { id: number; name: string; gender_class: string };
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
type PromotionEvidence = {
    id: number;
    type: 'member_legacy_achievement' | 'achievement' | 'participation';
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
    legacy_achievement?: {
        id: number;
        period: string | null;
        level: string | null;
        competition_details: string | null;
        event: string | null;
        event_date: string | null;
        venue: string | null;
        sport_discipline: string | null;
        medal_type: string | null;
        position: number | null;
        remarks: string | null;
        session: {
            id: number;
            name: string;
        } | null;
        benefits: {
            id?: number;
            benefit_type: string | null;
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
    evidences: PromotionEvidence[];
};
type PromotionMediaFile = {
    id: number;
    url: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    caption: string | null;
    uploaded_by: { id: number; name: string };
    created_at: string;
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
    legacyAchievements: LegacyAchievement[] | undefined;
    achievements: LiveAchievement[];
    onSaved: () => void;
    showActions?: boolean;
};

function evidenceKey(type: string, id: number): string {
    return `${type}:${id}`;
}

function evidenceSelectionKey(evidence: PromotionEvidence): string {
    if (
        evidence.type !== 'member_legacy_achievement' &&
        evidence.tournament?.id &&
        evidence.event?.id
    ) {
        return `event:${evidence.tournament.id}:${evidence.event.id}`;
    }

    return evidenceKey(evidence.type, evidence.evidence_id);
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

function visibleEvidenceGroupCount(
    evidences: PromotionEvidence[] = [],
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
    legacyAchievements: LegacyAchievement[],
): number {
    return visibleEvidenceRows(
        evidences,
        participations,
        achievements,
        legacyAchievements,
    ).length;
}

function visibleEvidenceRows(
    evidences: PromotionEvidence[] = [],
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
    legacyAchievements: LegacyAchievement[],
): PromotionEvidence[] {
    const visible = new Map<string, PromotionEvidence>();

    for (const evidence of evidences) {
        if (
            isOtherTierEvidence(
                evidence,
                participations,
                achievements,
                legacyAchievements,
            )
        ) {
            continue;
        }

        const key = evidenceSelectionKey(evidence);

        if (!visible.has(key)) {
            visible.set(key, evidence);
        }
    }

    return Array.from(visible.values());
}

function currentSessionId(
    participations: ParticipationGroup[],
    legacyAchievements: LegacyAchievement[] = [],
): string {
    return String(
        participations.find((group) => group.session.is_current)?.session.id ??
            participations[0]?.session.id ??
            legacyAchievements.find((item) => item.session)?.session?.id ??
            '',
    );
}

function participationGroupsForSession(
    participations: ParticipationGroup[],
    sessionId: string,
): ParticipationGroup[] {
    if (!sessionId) {
        return [];
    }

    return participations.filter(
        (group) => String(group.session.id) === sessionId,
    );
}

function sessionById(
    participations: ParticipationGroup[],
    sessionId: string,
): ParticipationGroup['session'] | undefined {
    return participations.find(
        (group) => String(group.session.id) === sessionId,
    )?.session;
}

function sessionLabelById(
    participations: ParticipationGroup[],
    legacyAchievements: LegacyAchievement[],
): Map<number, string> {
    const sessionNames = new Map<number, string>();

    for (const group of participations) {
        sessionNames.set(group.session.id, group.session.name);
    }

    for (const achievement of legacyAchievements) {
        if (achievement.session?.id) {
            sessionNames.set(achievement.session.id, achievement.session.name);
        }
    }

    return sessionNames;
}

function allSessions(
    participations: ParticipationGroup[],
    legacyAchievements: LegacyAchievement[],
) {
    const legacySessionIds = new Set<string>(
        legacyAchievements
            .map((item) => item.session?.id)
            .filter((value): value is number => Boolean(value))
            .map((value) => String(value)),
    );
    const values = new Set<string>([
        ...participations.map((group) => String(group.session.id)),
        ...legacySessionIds,
    ]);

    return Array.from(values);
}

function sessionStartDate(
    session?: ParticipationGroup['session'],
): string | undefined {
    if (!session?.is_current) {
        return undefined;
    }

    const match = session.name.match(/(\d{4})/);

    return match ? `${match[1]}-01-01` : undefined;
}

function isOtherTierEvent(tierCode?: string | null): boolean {
    return tierCode?.trim().toUpperCase() === 'OTHER';
}

function isOtherTierLegacyAchievement(item: LegacyAchievement): boolean {
    return item.level?.trim().toUpperCase() === 'OTHER';
}

type PromotionEventBlockSet = {
    eventKeys: Set<string>;
    legacyEvidenceKeys: Set<string>;
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
    const legacyEvidenceKeys = new Set<string>();

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
            ? item.cash_reward_amount !== null && item.cash_reward_amount !== ''
            : true;

        for (const evidence of item.evidences) {
            if (
                evidence.type === 'member_legacy_achievement' &&
                (rewardMode ? shouldTrackEvent : true)
            ) {
                legacyEvidenceKeys.add(
                    evidenceKey(
                        'member_legacy_achievement',
                        evidence.evidence_id,
                    ),
                );
            }

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

    return { eventKeys, legacyEvidenceKeys };
}
function hasPromotionOrCashAward(
    benefits: { benefit_type: string }[] | undefined,
): boolean {
    return (
        benefits?.some((benefit) =>
            ['PROMOTION', 'OUT_OF_TURN_PROMOTION', 'CASH_AWARD'].includes(
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
    legacyAchievements: LegacyAchievement[],
): boolean {
    const legacyLevel =
        evidence.level ??
        evidence.legacy_achievement?.level ??
        legacyAchievements.find((item) => item.id === evidence.evidence_id)
            ?.level;

    if (legacyLevel?.trim().toUpperCase() === 'OTHER') {
        return true;
    }

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

    if (evidence.type === 'member_legacy_achievement') {
        const item = legacyAchievements.find(
            (item) => item.id === evidence.evidence_id,
        );

        if (!item) {
            return false;
        }

        return isOtherTierLegacyAchievement(item);
    }

    return false;
}

function evidenceSessionId(
    evidences: PromotionEvidence[],
    participations: ParticipationGroup[],
    achievements: LiveAchievement[],
    legacyAchievements: LegacyAchievement[],
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

        if (evidence.type === 'member_legacy_achievement') {
            const item = legacyAchievements.find(
                (item) => item.id === evidence.evidence_id,
            );

            if (item?.session?.id) {
                return String(item.session.id);
            }
        }
    }

    return '';
}

function isBeforeDate(value: string, minDate?: string): boolean {
    return Boolean(value && minDate && value < minDate);
}

function rankDisplay(rank: RankOption): string {
    const label = rank.name;

    return `${rank.code} · ${label}${rank.short_name ? ` · ${rank.short_name}` : ''}`;
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

function rankDisplaySimple(rank: RankOption): string {
    if (rank.short_name) {
        return rank.short_name;
    }

    if (rank.name) {
        return rank.name;
    }

    return rank.code;
}

function resolveRankLabelSimple(
    value: string | null,
    ranks: RankOption[],
): string {
    if (!value) {
        return '';
    }

    const rank = ranks.find(
        (item) =>
            item.code === value ||
            item.name === value ||
            item.short_name === value,
    );

    return rank ? rankDisplaySimple(rank) : value;
}

function resolveRankOrder(
    ranks: RankOption[],
    rankCode: string,
): number | null {
    return ranks.find((rank) => rank.code === rankCode)?.rank_order ?? null;
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
    if (!value) {
        return '';
    }

    const rank = ranks.find(
        (item) =>
            item.code === value ||
            item.name === value ||
            item.short_name === value,
    );

    return rank ? rankDisplay(rank) : value;
}
function getCsrfToken(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function PromotionDocuments({
    memberId,
    promotionId,
}: {
    memberId: number;
    promotionId: number;
}) {
    const { t } = useTranslation();
    const [files, setFiles] = useState<PromotionMediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const response = await fetch(
                    `/members/${memberId}/promotions/${promotionId}/media`,
                    {
                        headers: { Accept: 'application/json' },
                    },
                );

                if (!active) {
                    return;
                }

                if (response.ok) {
                    const json = (await response.json()) as
                        | PromotionMediaFile[]
                        | { data: PromotionMediaFile[] };
                    setFiles(Array.isArray(json) ? json : json.data);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [memberId, promotionId]);

    async function handleUpload(file: File) {
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(
                `/members/${memberId}/promotions/${promotionId}/media`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: formData,
                },
            );

            if (response.ok) {
                const json = (await (
                    await fetch(
                        `/members/${memberId}/promotions/${promotionId}/media`,
                        {
                            headers: { Accept: 'application/json' },
                        },
                    )
                ).json()) as
                    | PromotionMediaFile[]
                    | { data: PromotionMediaFile[] };
                setFiles(Array.isArray(json) ? json : json.data);
            }
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                    {t('Promotion documents')}
                </p>
                <label className="cursor-pointer text-xs text-primary">
                    {uploading ? t('Uploading…') : t('Upload file')}
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];

                            if (file) {
                                void handleUpload(file);
                            }

                            e.currentTarget.value = '';
                        }}
                    />
                </label>
            </div>
            {loading ? (
                <p className="text-xs text-muted-foreground">{t('Loading…')}</p>
            ) : files.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    {t('No documents uploaded.')}
                </p>
            ) : (
                <div className="space-y-1">
                    {files.map((file) => (
                        <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                        >
                            {file.original_name}
                        </a>
                    ))}
                </div>
            )}
        </div>
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
                    className="px-0 text-xs"
                >
                    <Plus className="mr-1.5 size-3.5" />
                    {t('Create new rank')}
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
    legacyAchievements,
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
    legacyAchievements: LegacyAchievement[];
    achievements: LiveAchievement[];
    promotion?: PromotionRow;
    onSaved: () => void;
    subjectName?: string;
    triggerLabel?: string;
    mode?: 'promotion' | 'reward';
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [availableRanks, setAvailableRanks] = useState(ranks);
    const isRewardAction = mode === 'reward';
    const rewardActionLabel = t('Add cash reward');
    const [pendingPayload, setPendingPayload] = useState<{
        promotion_date: string | null;
        cash_reward_only: boolean;
        from_rank: string | null;
        to_rank: string | null;
        cash_reward_amount: string | null;
        cash_reward_date: string | null;
        cash_reward_reference: string | null;
        cash_reward_remarks: string | null;
        reason: string | null;
        remarks: string | null;
        evidences: PromotionEvidenceRef[];
    } | null>(null);
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
                legacyAchievements,
            ) || currentSessionId(participations, legacyAchievements),
        [achievements, legacyAchievements, participations, promotion],
    );
    const [selected, setSelected] = useState<string[]>(selectedDefaults);
    const [selectedSessionId, setSelectedSessionId] =
        useState(initialSessionId);
    const selectedParticipationGroups = useMemo(
        () => participationGroupsForSession(participations, selectedSessionId),
        [participations, selectedSessionId],
    );
    const selectedSession = sessionById(participations, selectedSessionId);
    const currentSessionMinDate = sessionStartDate(selectedSession);
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

    function resetFormState() {
        form.setData({
            promotion_date: promotion?.promotion_date ?? '',
            from_rank: promotion?.from_rank ?? memberRank ?? '',
            to_rank: promotion?.to_rank ?? '',
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
                legacyAchievements,
            ) || currentSessionId(participations, legacyAchievements),
        );
        form.clearErrors();
        setPendingPayload(null);
        setConfirmOpen(false);
    }

    const sessionOptions = useMemo(
        () =>
            allSessions(participations, legacyAchievements).map(
                (sessionId) => ({
                    id: sessionId,
                    name: sessionLabelById(
                        participations,
                        legacyAchievements,
                    ).get(Number(sessionId)),
                    isCurrent: false,
                }),
            ),
        [legacyAchievements, participations],
    );

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

    const options = useMemo(() => {
        const deduped = new Map<
            string,
            {
                key: string;
                label: string;
                evidences: PromotionEvidenceRef[];
                priority: number;
            }
        >();

        for (const group of selectedParticipationGroups) {
            for (const item of group.participations) {
                const key = `event:${item.tournament.id}:${item.event.id}`;
                const participationEvidenceKey = evidenceKey(
                    'participation',
                    item.id,
                );
                const participationBenefitBlocked = isRewardAction
                    ? hasCashAward(item.achievement?.benefits)
                    : hasPromotionOrCashAward(item.achievement?.benefits);

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

                const label = `${group.session.name} · ${item.tournament.name} · ${item.event.name}${item.achievement?.medal_type ? ` · ${t(item.achievement.medal_type)}` : ''}${item.position ? ` · #${item.position}` : ''}${item.achievement?.benefits && item.achievement.benefits.length > 0 ? ` · ${summarizeBenefits(item.achievement.benefits, t)}` : ''}`;
                const existing = deduped.get(key);

                if (!existing || existing.priority < 2) {
                    deduped.set(key, { key, label, evidences, priority: 2 });
                }
            }
        }

        for (const item of achievements) {
            const key = `event:${item.tournament.id}:${item.event.id}`;
            const evidenceKeyValue = evidenceKey('achievement', item.id);
            const achievementBlocked = isRewardAction
                ? hasCashAward(item.benefits)
                : hasPromotionOrCashAward(item.benefits);

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

            if (String(item.session.id) !== selectedSessionId) {
                continue;
            }

            if (disabledEvidenceKeys.eventKeys.has(key)) {
                continue;
            }

            if (!deduped.has(key)) {
                deduped.set(key, {
                    key,
                    label: `${t(item.medal_type)} · ${item.tournament.name} · ${item.event.name}${item.benefits.length > 0 ? ` · ${t('Benefit recorded')}` : ''}`,
                    evidences: [{ type: 'achievement', id: item.id }],
                    priority: 1,
                });
            }
        }

        for (const item of legacyAchievements) {
            const evidenceKeyValue = evidenceKey(
                'member_legacy_achievement',
                item.id,
            );
            const legacyBlocked = isRewardAction
                ? hasCashAward(item.benefits)
                : hasPromotionOrCashAward(item.benefits);

            if (legacyBlocked && !selectedDefaultSet.has(evidenceKeyValue)) {
                continue;
            }

            if (
                isOtherTierLegacyAchievement(item) &&
                !selectedDefaultSet.has(evidenceKeyValue)
            ) {
                continue;
            }

            if (
                disabledEvidenceKeys.legacyEvidenceKeys.has(evidenceKeyValue) &&
                !selectedDefaultSet.has(evidenceKeyValue)
            ) {
                continue;
            }

            if (String(item.session?.id ?? '') !== selectedSessionId) {
                continue;
            }

            if (!deduped.has(evidenceKeyValue)) {
                deduped.set(evidenceKeyValue, {
                    key: evidenceKeyValue,

                    label: `${t(item.period)} · ${t(item.level)} · ${item.competition_details}`,
                    evidences: [
                        { type: 'member_legacy_achievement', id: item.id },
                    ],
                    priority: 0,
                });
            }
        }

        return Array.from(deduped.values()).map(
            ({ key, label, evidences }) => ({ key, label, evidences }),
        );
    }, [
        achievements,
        disabledEvidenceKeys.eventKeys,
        disabledEvidenceKeys.legacyEvidenceKeys,
        legacyAchievements,
        selectedDefaultSet,
        selectedParticipationGroups,
        selectedSessionId,
        isRewardAction,
        t,
    ]);

    const selectedEvidenceLabels = useMemo(() => {
        const optionMap = new Map(options.map((opt) => [opt.key, opt.label]));
        const optionByKey = new Map(options.map((opt) => [opt.key, opt]));
        const evidencesByKey = new Map<string, PromotionEvidenceRef[]>(
            selectedDefaultRefsByKey,
        );

        for (const [key, option] of optionByKey) {
            evidencesByKey.set(key, option.evidences);
        }

        return selected.map((key) => ({
            key,
            label: optionMap.get(key) || key,
            evidences: evidencesByKey.get(key) ?? [],
        }));
    }, [options, selected, selectedDefaultRefsByKey]);

    const promotionEvidenceByRef = useMemo(() => {
        const evidenceMap = new Map<string, PromotionEvidence>();

        for (const evidence of promotion?.evidences ?? []) {
            evidenceMap.set(
                evidenceKey(evidence.type, evidence.evidence_id),
                evidence,
            );
        }

        return evidenceMap;
    }, [promotion?.evidences]);
    function getEvidenceByRef(
        evidence: PromotionEvidenceRef,
    ): PromotionEvidence | null {
        return (
            promotionEvidenceByRef.get(
                evidenceKey(evidence.type, evidence.id),
            ) ?? null
        );
    }

    function evidenceContextFromRefs(
        evidenceRefs: PromotionEvidenceRef[] = [],
    ): { session: string; tournament: string; event: string; tier: string } {
        const primaryEvidence = primaryEvidenceRefFromRefs(evidenceRefs);

        if (!primaryEvidence) {
            return {
                session: t('No session'),
                tournament: t('—'),
                event: t('—'),
                tier: t('—'),
            };
        }

        if (primaryEvidence.type === 'participation') {
            const payload = getEvidenceByRef(primaryEvidence);

            if (payload?.session?.name) {
                return {
                    session: payload.session.name,
                    tournament: payload.tournament?.name ?? t('—'),
                    event: payload.event?.name ?? t('—'),
                    tier: payload.tournament?.tier_code ?? t('—'),
                };
            }

            for (const group of participations) {
                const participation = group.participations.find(
                    (record) => record.id === primaryEvidence.id,
                );

                if (participation) {
                    return {
                        session: group.session.name,
                        tournament: participation.tournament.name,
                        event: participation.event.name,
                        tier: participation.tournament.tier_code ?? t('—'),
                    };
                }
            }

            return {
                session: t('No session'),
                tournament: t('—'),
                event: t('—'),
                tier: t('—'),
            };
        }

        if (primaryEvidence.type === 'achievement') {
            const payload = getEvidenceByRef(primaryEvidence);

            if (payload?.session?.name && payload.tournament && payload.event) {
                return {
                    session: payload.session.name,
                    tournament: payload.tournament.name,
                    event: payload.event.name,
                    tier: payload.tournament.tier_code ?? t('—'),
                };
            }

            const item = achievements.find((a) => a.id === primaryEvidence.id);

            if (item) {
                return {
                    session:
                        sessionLabelById(
                            participations,
                            legacyAchievements,
                        ).get(item.session.id) ?? String(item.session.id),
                    tournament: item.tournament.name,
                    event: item.event.name,
                    tier: item.tournament.tier_code ?? t('—'),
                };
            }

            return {
                session: t('No session'),
                tournament: t('—'),
                event: t('—'),
                tier: t('—'),
            };
        }

        const payload = getEvidenceByRef(primaryEvidence);
        const legacy = legacyAchievements.find(
            (item) => item.id === primaryEvidence.id,
        );
        const legacyPayload = payload?.legacy_achievement;

        return {
            session:
                legacyPayload?.session?.name ??
                legacy?.session?.name ??
                t('No session'),
            tournament:
                legacyPayload?.competition_details ??
                legacy?.competition_details ??
                t('—'),
            event: legacyPayload?.event ?? legacy?.event ?? t('—'),
            tier: legacyPayload?.level ?? legacy?.level ?? t('—'),
        };
    }
    function evidenceValueFromRefs(
        evidences: PromotionEvidenceRef[] = [],
    ): string {
        const primary = primaryEvidenceRefFromRefs(evidences);

        if (!primary) {
            return '—';
        }

        if (primary.type === 'participation') {
            const payload = getEvidenceByRef(primary);
            const payloadPosition =
                payload?.position ?? payload?.achievement?.position ?? null;

            if (payloadPosition) {
                return `#${payloadPosition}`;
            }

            const participation = participations
                .flatMap((group) => group.participations)
                .find((item) => item.id === primary.id);

            if (participation?.position) {
                return `#${participation.position}`;
            }

            return `#${primary.id}`;
        }

        if (primary.type === 'achievement') {
            const payload = getEvidenceByRef(primary);

            if (payload?.position) {
                return `#${payload.position}`;
            }

            if (payload?.achievement?.position) {
                return `#${payload.achievement.position}`;
            }

            return `#${primary.id}`;
        }

        const payload = getEvidenceByRef(primary);

        if (payload?.legacy_achievement?.position) {
            return `#${payload.legacy_achievement.position}`;
        }

        const legacy = legacyAchievements.find(
            (item) => item.id === primary.id,
        );

        if (legacy?.position) {
            return `#${legacy.position}`;
        }

        return legacy?.period ?? `#${primary.id}`;
    }
    function evidenceLabelFromRefs(
        evidences: PromotionEvidenceRef[] = [],
    ): string {
        const hasParticipation = evidences.some(
            (item) => item.type === 'participation',
        );
        const hasAchievement = evidences.some(
            (item) => item.type === 'achievement',
        );
        const hasLegacy = evidences.some(
            (item) => item.type === 'member_legacy_achievement',
        );

        if (hasParticipation && hasAchievement) {
            return t('Participation + Achievement');
        }

        if (hasParticipation) {
            return t('Participation');
        }

        if (hasAchievement) {
            return t('Achievement');
        }

        if (hasLegacy) {
            return t('Legacy achievement');
        }

        return t('Evidence');
    }
    function primaryEvidenceRefFromRefs(
        evidences: PromotionEvidenceRef[] = [],
    ): PromotionEvidenceRef | null {
        return (
            evidences.find((item) => item.type === 'participation') ??
            evidences.find((item) => item.type === 'achievement') ??
            evidences.find(
                (item) => item.type === 'member_legacy_achievement',
            ) ??
            null
        );
    }
    function evidenceMedalFromRefs(
        evidences: PromotionEvidenceRef[] = [],
    ): string {
        const primary = primaryEvidenceRefFromRefs(evidences);

        if (!primary) {
            return '—';
        }

        if (primary.type === 'participation') {
            const payload = getEvidenceByRef(primary);

            if (payload?.achievement?.medal_type) {
                return t(payload.achievement.medal_type);
            }

            const participation = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === primary.id);

            if (!participation?.achievement?.medal_type) {
                return '—';
            }

            return t(participation.achievement.medal_type);
        }

        if (primary.type === 'achievement') {
            const payload = getEvidenceByRef(primary);

            if (payload?.achievement?.medal_type) {
                return t(payload.achievement.medal_type);
            }

            const item = achievements.find((a) => a.id === primary.id);

            if (!item?.medal_type) {
                return '—';
            }

            return t(item.medal_type);
        }

        if (primary.type === 'member_legacy_achievement') {
            const payload = getEvidenceByRef(primary);

            if (payload?.legacy_achievement?.medal_type) {
                return t(payload.legacy_achievement.medal_type);
            }

            const legacy = legacyAchievements.find(
                (item) => item.id === primary.id,
            );

            if (!legacy?.medal_type) {
                return '—';
            }

            return t(legacy.medal_type);
        }

        return '—';
    }
    function evidenceDetailsFromRefs(
        evidences: PromotionEvidenceRef[] = [],
    ): string {
        const primary = primaryEvidenceRefFromRefs(evidences);

        if (!primary) {
            return '';
        }

        if (primary.type === 'participation') {
            const payload = getEvidenceByRef(primary);

            if (payload?.remarks) {
                return payload.remarks;
            }

            if (payload?.achievement?.remarks) {
                return payload.achievement.remarks ?? '';
            }

            const participation = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === primary.id);

            if (participation) {
                return participation.achievement?.remarks
                    ? participation.achievement.remarks
                    : (participation.remarks ?? '');
            }
        }

        if (primary.type === 'achievement') {
            const payload = getEvidenceByRef(primary);

            if (payload?.remarks) {
                return payload.remarks;
            }

            if (payload?.achievement?.remarks) {
                return payload.achievement.remarks ?? '';
            }

            const item = achievements.find((a) => a.id === primary.id);

            if (item) {
                return item.remarks ?? '';
            }
        }

        if (primary.type === 'member_legacy_achievement') {
            const payload = getEvidenceByRef(primary);

            if (payload?.legacy_achievement?.remarks) {
                return payload.legacy_achievement.remarks;
            }

            const item = legacyAchievements.find(
                (legacy) => legacy.id === primary.id,
            );

            if (item) {
                return item.competition_details ?? '';
            }
        }

        return '';
    }
    function buildPayload() {
        const rewardRank = form.data.from_rank || memberRank || null;

        return {
            promotion_date: isRewardAction ? null : form.data.promotion_date,
            cash_reward_only: isRewardAction,
            from_rank: isRewardAction ? rewardRank : form.data.from_rank,
            to_rank: isRewardAction ? rewardRank : form.data.to_rank,
            cash_reward_amount: form.data.cash_reward_amount || null,
            cash_reward_date: form.data.cash_reward_date || null,
            cash_reward_reference: form.data.cash_reward_reference || null,
            cash_reward_remarks: form.data.cash_reward_remarks || null,
            reason: isRewardAction ? null : form.data.reason,
            remarks: isRewardAction ? null : form.data.remarks,
            evidences: selected.flatMap(
                (key) =>
                    options.find((item) => item.key === key)?.evidences ??
                    selectedDefaultRefsByKey.get(key) ??
                    [],
            ),
        };
    }
    function submitPromotion(payload: ReturnType<typeof buildPayload>) {
        if (promotion) {
            router.patch(
                `/members/${memberId}/promotions/${promotion.id}`,
                payload,
                {
                    onSuccess: () => {
                        setOpen(false);
                        setConfirmOpen(false);
                        setPendingPayload(null);
                        onSaved();
                    },
                },
            );

            return;
        }

        router.post(`/members/${memberId}/promotions`, payload, {
            onSuccess: () => {
                setOpen(false);
                setConfirmOpen(false);
                setPendingPayload(null);
                form.reset();
                setSelected([]);
                onSaved();
            },
        });
    }
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (
            !isRewardAction &&
            isBeforeDate(form.data.promotion_date, currentSessionMinDate)
        ) {
            form.setError(
                'promotion_date',
                t(
                    'Current session dates cannot be older than the selected session year. Choose an older session to back fill older entries.',
                ),
            );

            return;
        }

        setPendingPayload(buildPayload());
        setConfirmOpen(true);
    }

    function handleConfirmSave() {
        const payload = pendingPayload ?? buildPayload();
        submitPromotion(payload);
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (nextOpen) {
                    resetFormState();
                } else {
                    setConfirmOpen(false);
                    setPendingPayload(null);
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
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        {subjectName
                            ? `${promotion ? (isRewardAction ? t('Edit cash reward') : t('Edit promotion')) : isRewardAction ? rewardActionLabel : t('Add promotion')} - ${subjectName}`
                            : promotion
                              ? isRewardAction
                                  ? t('Edit cash reward')
                                  : t('Edit promotion')
                              : isRewardAction
                                ? rewardActionLabel
                                : t('Add promotion')}
                    </DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {isRewardAction ? null : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Promotion date')}</Label>
                                <DatePicker
                                    value={form.data.promotion_date}
                                    minDate={currentSessionMinDate}
                                    onChange={(v) =>
                                        form.setData('promotion_date', v)
                                    }
                                />
                                <InputError
                                    message={form.errors.promotion_date}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('From rank')}</Label>
                                <Combobox
                                    value={form.data.from_rank}
                                    onValueChange={(v) =>
                                        form.setData('from_rank', v)
                                    }
                                    items={rankItems}
                                    placeholder={t('Search and select rank')}
                                    searchPlaceholder={t(
                                        'Search ranks by code or name…',
                                    )}
                                    emptyMessage={t('No ranks found.')}
                                />
                                <InputError message={form.errors.from_rank} />
                            </div>
                        </div>
                    )}
                    {isRewardAction ? null : (
                        <div className="grid gap-2">
                            <Label>
                                {t('To rank')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Combobox
                                value={form.data.to_rank}
                                onValueChange={(v) =>
                                    form.setData('to_rank', v)
                                }
                                items={toRankItems}
                                placeholder={t('Search and select rank')}
                                searchPlaceholder={t(
                                    'Search ranks by code or name…',
                                )}
                                emptyMessage={t('No ranks found.')}
                            />
                            <InlineRankDialog onCreated={handleRankCreated} />
                            <InputError message={form.errors.to_rank} />
                        </div>
                    )}
                    {isRewardAction ? null : (
                        <div className="grid gap-2">
                            <Label>{t('Reason')}</Label>
                            <Textarea
                                value={form.data.reason}
                                onChange={(e) =>
                                    form.setData('reason', e.target.value)
                                }
                                rows={3}
                            />
                            <InputError message={form.errors.reason} />
                        </div>
                    )}
                    {isRewardAction ? null : (
                        <div className="grid gap-2">
                            <Label>{t('Remarks')}</Label>
                            <Textarea
                                value={form.data.remarks}
                                onChange={(e) =>
                                    form.setData('remarks', e.target.value)
                                }
                                rows={3}
                            />
                            <InputError message={form.errors.remarks} />
                        </div>
                    )}
                    {isRewardAction ? (
                        <div className="space-y-4 rounded-md border border-dashed border-slate-200 p-3">
                            <p className="text-sm font-medium">
                                {t('Cash reward entry')}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Cash reward amount')}</Label>
                                    <Input
                                        value={form.data.cash_reward_amount}
                                        onChange={(e) =>
                                            form.setData(
                                                'cash_reward_amount',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={t('e.g. 5000')}
                                    />
                                    <InputError
                                        message={form.errors.cash_reward_amount}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Cash reward date')}</Label>
                                    <DatePicker
                                        value={form.data.cash_reward_date}
                                        minDate={currentSessionMinDate}
                                        onChange={(e) =>
                                            form.setData('cash_reward_date', e)
                                        }
                                    />
                                    <InputError
                                        message={form.errors.cash_reward_date}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Cash reward reference')}</Label>
                                <Input
                                    value={form.data.cash_reward_reference}
                                    onChange={(e) =>
                                        form.setData(
                                            'cash_reward_reference',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.cash_reward_reference}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Cash reward remarks')}</Label>
                                <Textarea
                                    value={form.data.cash_reward_remarks}
                                    onChange={(e) =>
                                        form.setData(
                                            'cash_reward_remarks',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                />
                                <InputError
                                    message={form.errors.cash_reward_remarks}
                                />
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-2">
                        <Label>{t('Session')}</Label>
                        <Select
                            value={selectedSessionId}
                            onValueChange={(value) => {
                                setSelectedSessionId(value);
                                setSelected([]);
                                form.setData('evidences', []);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t('Select session')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {sessionOptions.map((session) => (
                                    <SelectItem
                                        key={session.id}
                                        value={session.id}
                                    >
                                        {session.name ?? `#${session.id}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'Only current session participations are shown by default. To back fill an older entry, choose that session and load its events here.',
                            )}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label>
                            {t('Supporting evidence')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        {isRewardAction ? (
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Reward mode only excludes events with existing cash reward records. Events with previous promotions but no cash reward remain selectable.',
                                )}
                            </p>
                        ) : null}
                        <div className="max-h-56 overflow-y-auto rounded-md border p-3">
                            <div className="space-y-2">
                                {options.map((opt) => (
                                    <label
                                        key={opt.key}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={selected.includes(opt.key)}
                                            onCheckedChange={(checked) => {
                                                setSelected((prev) =>
                                                    checked
                                                        ? [...prev, opt.key]
                                                        : prev.filter(
                                                              (k) =>
                                                                  k !== opt.key,
                                                          ),
                                                );
                                            }}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {selected.length === 0 && (
                            <p className="text-xs text-destructive">
                                {t('Select at least one evidence item.')}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={selected.length === 0}>
                            {isRewardAction
                                ? promotion
                                    ? t('Save cash reward')
                                    : t('Add cash reward')
                                : promotion
                                  ? t('Save changes')
                                  : t('Save promotion')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent
                    className="max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {isRewardAction
                                ? t('Confirm reward')
                                : t('Confirm promotion')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                        {isRewardAction ? (
                            <p className="text-muted-foreground">
                                {t(
                                    'Please review the reward details before saving.',
                                )}
                            </p>
                        ) : (
                            <p className="text-muted-foreground">
                                {t(
                                    'Please review the promotion details before saving.',
                                )}
                            </p>
                        )}
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                            {isRewardAction ? null : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">
                                        {resolveRankLabelSimple(
                                            form.data.from_rank,
                                            ranks,
                                        ) || t('Unknown')}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                        →
                                    </span>
                                    <Badge>
                                        {resolveRankLabelSimple(
                                            form.data.to_rank,
                                            ranks,
                                        ) || t('Unknown')}
                                    </Badge>
                                </div>
                            )}
                            {isRewardAction ? null : (
                                <p>
                                    <span className="font-medium">
                                        {t('Promotion date')}:
                                    </span>{' '}
                                    {form.data.promotion_date || '—'}
                                </p>
                            )}
                            {(form.data.cash_reward_amount ||
                                form.data.cash_reward_date ||
                                form.data.cash_reward_reference ||
                                form.data.cash_reward_remarks) && (
                                <div>
                                    <p className="font-medium">
                                        {t('Reward details')}:
                                    </p>
                                    <ul className="mt-1 space-y-1 text-xs">
                                        {form.data.cash_reward_amount ? (
                                            <li className="rounded border px-2 py-1">
                                                {t('Amount')}:{' '}
                                                {`₹${form.data.cash_reward_amount}`}
                                            </li>
                                        ) : null}
                                        {form.data.cash_reward_date ? (
                                            <li className="rounded border px-2 py-1">
                                                {t('Date')}:{' '}
                                                {form.data.cash_reward_date}
                                            </li>
                                        ) : null}
                                        {form.data.cash_reward_reference ? (
                                            <li className="rounded border px-2 py-1">
                                                {t('Reference')}:{' '}
                                                {
                                                    form.data
                                                        .cash_reward_reference
                                                }
                                            </li>
                                        ) : null}
                                        {form.data.cash_reward_remarks ? (
                                            <li className="rounded border px-2 py-1">
                                                {t('Remarks')}:{' '}
                                                {form.data.cash_reward_remarks}
                                            </li>
                                        ) : null}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <p className="font-medium">
                                    {t('Supporting evidence')}:
                                </p>
                                <div className="mt-1 space-y-2">
                                    {selectedEvidenceLabels.length === 0 ? (
                                        <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">
                                            {t('No evidence selected')}
                                        </p>
                                    ) : (
                                        selectedEvidenceLabels.map(
                                            (evidence, index) => {
                                                const typeLabel =
                                                    evidenceLabelFromRefs(
                                                        evidence.evidences,
                                                    );
                                                const eventContext =
                                                    evidenceContextFromRefs(
                                                        evidence.evidences,
                                                    );

                                                return (
                                                    <div
                                                        key={evidence.key}
                                                        className="overflow-hidden rounded-md border text-xs"
                                                    >
                                                        <div className="flex items-center justify-between border-b bg-slate-50 px-2 py-1.5">
                                                            <Badge
                                                                variant="outline"
                                                                className="px-2 py-0.5"
                                                            >
                                                                {typeLabel}
                                                            </Badge>
                                                            <span className="text-muted-foreground">
                                                                {index + 1}.
                                                            </span>
                                                        </div>
                                                        <div className="divide-y">
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t(
                                                                        'Session',
                                                                    )}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {
                                                                        eventContext.session
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t(
                                                                        'Tournament',
                                                                    )}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {
                                                                        eventContext.tournament
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t('Event')}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {
                                                                        eventContext.event
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t('Tier')}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {
                                                                        eventContext.tier
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 font-medium text-foreground dark:bg-slate-900">
                                                                    {t(
                                                                        'Evidence',
                                                                    )}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {evidenceValueFromRefs(
                                                                        evidence.evidences,
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t('Medal')}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {evidenceMedalFromRefs(
                                                                        evidence.evidences,
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-px bg-slate-200 sm:grid-cols-[130px_1fr] dark:bg-slate-700">
                                                                <div className="bg-white px-2 py-1.5 dark:bg-slate-900">
                                                                    {t(
                                                                        'Details',
                                                                    )}
                                                                </div>
                                                                <div className="bg-white px-2 py-1.5 text-muted-foreground dark:bg-slate-900">
                                                                    {evidenceDetailsFromRefs(
                                                                        evidence.evidences,
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            {t('Back')}
                        </Button>
                        <Button type="button" onClick={handleConfirmSave}>
                            {isRewardAction
                                ? promotion
                                    ? t('Confirm reward update')
                                    : t('Confirm reward')
                                : promotion
                                  ? t('Confirm update')
                                  : t('Confirm save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

export function PromotionsTab({
    memberId,
    memberRank,
    ranks,
    promotions,
    participations = [],
    legacyAchievements = [],
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
        const hasRewardFields = !!(
            promotion.cash_reward_amount ||
            promotion.cash_reward_date ||
            promotion.cash_reward_reference ||
            promotion.cash_reward_remarks
        );
        const hasPromotionFields = !!(
            promotion.promotion_date ||
            (promotion.from_rank &&
                promotion.to_rank &&
                promotion.from_rank !== promotion.to_rank) ||
            promotion.reason ||
            promotion.remarks
        );

        if (hasRewardFields && hasPromotionFields) {
            return t('Promotion + Reward');
        }

        if (hasRewardFields && !hasPromotionFields) {
            return t('Reward');
        }

        return t('Promotion');
    }
    function promotionCategoryClass(promotion: PromotionRow): string {
        const hasRewardFields = !!(
            promotion.cash_reward_amount ||
            promotion.cash_reward_date ||
            promotion.cash_reward_reference ||
            promotion.cash_reward_remarks
        );
        const hasPromotionFields = !!(
            promotion.promotion_date ||
            (promotion.from_rank &&
                promotion.to_rank &&
                promotion.from_rank !== promotion.to_rank) ||
            promotion.reason ||
            promotion.remarks
        );

        if (hasRewardFields && hasPromotionFields) {
            return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
        }

        if (hasRewardFields && !hasPromotionFields) {
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

        return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/30 dark:text-fuchsia-200';
    }
    function evidenceTypeLabel(evidence: PromotionEvidence): string {
        if (evidence.type === 'participation') {
            return t('Participation');
        }

        if (evidence.type === 'achievement') {
            return t('Achievement');
        }

        return t('Legacy achievement');
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
                const sessionName = sessionLabelById(
                    participations,
                    legacyAchievements,
                ).get(item.session.id);

                return sessionName ?? String(item.session.id);
            }
        }

        if (evidence.type === 'member_legacy_achievement') {
            if (evidence.legacy_achievement?.session?.name) {
                return evidence.legacy_achievement.session.name;
            }

            const item = legacyAchievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.session?.name ?? t('No session');
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

        if (evidence.legacy_achievement?.competition_details) {
            return evidence.legacy_achievement.competition_details;
        }

        const item = legacyAchievements.find(
            (a) => a.id === evidence.evidence_id,
        );

        return item?.competition_details ?? t('—');
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

        if (evidence.legacy_achievement?.event) {
            return evidence.legacy_achievement.event;
        }

        const item = legacyAchievements.find(
            (a) => a.id === evidence.evidence_id,
        );

        return item?.event ?? t('—');
    }
    function evidenceTierLabel(evidence: PromotionEvidence): string {
        if (evidence.tournament?.tier_code) {
            return evidence.tournament.tier_code;
        }

        if (evidence.type === 'participation') {
            const item = participations
                .flatMap((group) => group.participations)
                .find((record) => record.id === evidence.evidence_id);

            return item?.tournament.tier_code ?? t('—');
        }

        if (evidence.type === 'achievement') {
            const item = achievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            return item?.tournament.tier_code ?? t('—');
        }

        return evidence.legacy_achievement?.level ?? t('—');
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
                        parts.push(benefit.benefit_date);
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

        if (evidence.type === 'member_legacy_achievement') {
            if (evidence.legacy_achievement?.remarks) {
                return evidence.legacy_achievement.remarks;
            }

            const item = legacyAchievements.find(
                (item) => item.id === evidence.evidence_id,
            );

            if (item?.event) {
                return item.event;
            }

            if (item?.competition_details) {
                return item.competition_details;
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

        if (evidence.type === 'member_legacy_achievement') {
            if (evidence.legacy_achievement?.medal_type) {
                return t(evidence.legacy_achievement.medal_type);
            }

            const item = legacyAchievements.find(
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

        if (evidence.type === 'member_legacy_achievement') {
            if (evidence.legacy_achievement?.position) {
                return `#${evidence.legacy_achievement.position}`;
            }

            if (evidence.position) {
                return `#${evidence.position}`;
            }

            const item = legacyAchievements.find(
                (a) => a.id === evidence.evidence_id,
            );

            if (item?.position) {
                return `#${item.position}`;
            }

            if (item?.period) {
                return item.period;
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
        return !!(
            promotion.promotion_date ||
            (promotion.from_rank &&
                promotion.to_rank &&
                promotion.from_rank !== promotion.to_rank) ||
            promotion.reason ||
            promotion.remarks
        );
    }
    function hasRewardFields(promotion: PromotionRow): boolean {
        return !!(
            promotion.cash_reward_amount ||
            promotion.cash_reward_date ||
            promotion.cash_reward_reference ||
            promotion.cash_reward_remarks
        );
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
                                legacyAchievements={legacyAchievements}
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
                                legacyAchievements={legacyAchievements}
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
                                                    {promotion.promotion_date ||
                                                        '—'}
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
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge
                                                            variant="secondary"
                                                            className="px-2 py-1 text-xs"
                                                        >
                                                            {visibleEvidenceGroupCount(
                                                                promotion.evidences,
                                                                participations,
                                                                achievements,
                                                                legacyAchievements,
                                                            )}{' '}
                                                            {t('items')}
                                                        </Badge>
                                                    </div>
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
                                                            legacyAchievements={
                                                                legacyAchievements
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
                                                                        legacyAchievements,
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
                                                                                            'Session',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tournament',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Event',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tier',
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
                                                                                                9
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
                                                                                                    {evidenceSessionLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTournamentLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceEventLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTierLabel(
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
                                                            <div className="mt-2 pt-2">
                                                                <PromotionDocuments
                                                                    memberId={
                                                                        memberId
                                                                    }
                                                                    promotionId={
                                                                        promotion.id
                                                                    }
                                                                />
                                                            </div>
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
                                                    {promotion.cash_reward_date ||
                                                        promotion.promotion_date ||
                                                        '—'}
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
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge
                                                            variant="secondary"
                                                            className="px-2 py-1 text-xs"
                                                        >
                                                            {visibleEvidenceGroupCount(
                                                                promotion.evidences,
                                                                participations,
                                                                achievements,
                                                                legacyAchievements,
                                                            )}{' '}
                                                            {t('items')}
                                                        </Badge>
                                                    </div>
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
                                                            legacyAchievements={
                                                                legacyAchievements
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
                                                                        legacyAchievements,
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
                                                                                            'Session',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tournament',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Event',
                                                                                        )}
                                                                                    </th>
                                                                                    <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                        {t(
                                                                                            'Tier',
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
                                                                                                9
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
                                                                                                    {evidenceSessionLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTournamentLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceEventLabel(
                                                                                                        evidence,
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                    {evidenceTierLabel(
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
