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
import React, { Fragment, useMemo, useState } from 'react';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
import type { ConfidentialDocument } from '@/components/shared/confidential-document-preview';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { formatDate } from '@/lib/dates';
import { resolveRankLabel as resolveRankLabelShared } from '@/lib/ranks';

export type RankOption = {
    id?: number;
    code: string;
    name: string;
    short_name?: string | null;
    rank_order?: number | null;
};

export type CoachPromotionEvidence = {
    id: number;
    session_id: number;
    tournament_id: number;
    event_id: number | null;
    team_id: number | null;
    achievement_id: number | null;
    session?: { id: number; name: string } | null;
    tournament?: {
        id: number;
        name: string;
        tier_code?: string | null;
        tier?: { id: number; code: string } | null;
        date_from?: string | null;
        date_to?: string | null;
        venue?: string | null;
    } | null;
    event?: {
        id: number;
        name: string;
        gender_class?: string | null;
        discipline?: string | null;
        weight_category?: string | null;
        event_type?: string | null;
    } | null;
    team?: { id: number; name: string } | null;
    achievement?: {
        id: number;
        medal_type: string;
        position?: number | null;
    } | null;
    medal_counts?: Record<string, number>;
};

export type CoachPromotion = {
    id: number;
    coach_id: number;
    record_type: 'promotion' | 'reward' | 'promotion_reward';
    promotion_date: string | null;
    from_rank: string | null;
    to_rank: string | null;
    cash_reward_amount: string | null;
    cash_reward_date: string | null;
    cash_reward_reference: string | null;
    cash_reward_remarks: string | null;
    reason: string | null;
    remarks: string | null;
    recorded_by_name?: string | null;
    recorder?: { id: number; name: string } | null;
    document: ConfidentialDocument | null;
    evidences: CoachPromotionEvidence[];
};

export type CoachedEventOption = {
    id: string;
    session_id: number;
    tournament_id: number;
    event_id: number;
    team_id: number;
    event: {
        id: number;
        name: string;
        gender_class?: string | null;
        discipline?: string | null;
        weight_category?: string | null;
        event_type?: string | null;
    };
    team: { id: number; name: string };
    medal_counts: Record<string, number>;
    players?: Array<{
        member: { id: number; full_name: string; pno?: string };
        medal_type?: string;
        position?: number;
    }>;
    used_in_promotion?: boolean;
    used_promotion_id?: number | null;
    used_in_reward?: boolean;
    used_reward_id?: number | null;
};

export type CoachedTournamentOption = {
    id: string;
    session_id: number;
    tournament_id: number;
    team_id: number;
    tournament: {
        id: number;
        name: string;
        tier_code?: string | null;
        tier_weight?: number;
        date_from?: string | null;
        date_to?: string | null;
        venue?: string | null;
    };
    team: { id: number; name: string };
    event_count: number;
    player_count: number;
    events?: CoachedEventOption[];
};

export type CoachedSessionOption = {
    session: { id: number; name: string; is_current?: boolean };
    tournaments: CoachedTournamentOption[];
};

type Props = {
    coach: {
        id: number;
        rank_master?: {
            id: number;
            code: string | null;
            name: string;
            short_name?: string | null;
        } | null;
        rank_master_id?: number | null;
        full_name?: string;
    };
    ranks: RankOption[];
    promotions?: CoachPromotion[];
    rewardEvidenceOptions?: CoachedSessionOption[];
    canManage?: boolean;
    showActions?: boolean;
    onSaved?: () => void;
};

type InlineRankPayload = {
    code: string;
    name: string;
    rank_order: string;
    short_name: string;
    is_gazetted: boolean;
    is_active: boolean;
};

function getCsrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');

    return meta?.getAttribute('content') ?? '';
}

function resolveRankLabel(
    value: string | null | undefined,
    ranks: RankOption[],
): string {
    // Delegates to the shared rank resolver (@/lib/ranks) so rank matching stays in one
    // place; locale is accepted but currently unused by the shared implementation.
    const normalizedRanks = ranks.map((rank) => ({
        code: rank.code,
        name: rank.name,
        short_name: rank.short_name ?? null,
    }));

    return resolveRankLabelShared(value, normalizedRanks, '') || '—';
}

function rankOrderByCode(ranks: RankOption[]): Map<string, number> {
    return new Map(
        ranks.map((rank, index) => [rank.code, rank.rank_order ?? index]),
    );
}

function resolveRankOrder(
    rankOrderLookup: Map<string, number>,
    rankValue: string | null | undefined,
): number | null {
    if (!rankValue) {
        return null;
    }

    return rankOrderLookup.get(rankValue) ?? null;
}

function medalEmoji(medalType?: string | null): string {
    if (!medalType) {
        return '🏅';
    }

    switch (medalType.toUpperCase()) {
        case 'GOLD':
            return '🥇';
        case 'SILVER':
            return '🥈';
        case 'BRONZE':
            return '🥉';
        default:
            return '🏅';
    }
}

function medalCountsList(
    medalCounts?: Record<string, number>,
): Array<[string, number]> {
    if (!medalCounts) {
        return [];
    }

    return Object.entries(medalCounts).filter(([, count]) => count > 0);
}

function formatCurrency(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') {
        return '—';
    }

    const num = Number(amount);

    if (isNaN(num)) {
        return String(amount);
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

// ---------------------------------------------------------------------------
// Inline Rank Dialog
// ---------------------------------------------------------------------------

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

            if (!response.ok) {
                if (response.status === 422) {
                    const json = (await response.json()) as {
                        errors: Record<string, string[]>;
                    };
                    const normalized: Record<string, string> = {};

                    for (const [key, messages] of Object.entries(json.errors)) {
                        normalized[key] = messages[0];
                    }

                    setErrors(normalized);

                    return;
                }

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
        } catch {
            setErrors({ code: 'Failed to create rank. Please try again.' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
                onClick={() => setOpen(true)}
            >
                + {t('Add new rank')}
            </Button>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Add new rank')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Create a new rank master record quickly for this promotion.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label
                                htmlFor="inline-rank-code"
                                className="text-xs"
                            >
                                {t('Rank code')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="inline-rank-code"
                                value={data.code}
                                onChange={(e) =>
                                    setField(
                                        'code',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="e.g. SI"
                                className="h-8 text-xs uppercase"
                            />
                            {errors.code && (
                                <p className="text-[11px] text-destructive">
                                    {errors.code}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label
                                htmlFor="inline-rank-order"
                                className="text-xs"
                            >
                                {t('Rank order')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="inline-rank-order"
                                type="number"
                                min={1}
                                value={data.rank_order}
                                onChange={(e) =>
                                    setField('rank_order', e.target.value)
                                }
                                placeholder="e.g. 5"
                                className="h-8 text-xs"
                            />
                            {errors.rank_order && (
                                <p className="text-[11px] text-destructive">
                                    {errors.rank_order}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="inline-rank-name" className="text-xs">
                            {t('Rank name')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="inline-rank-name"
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. Sub Inspector"
                            className="h-8 text-xs"
                        />
                        {errors.name && (
                            <p className="text-[11px] text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="inline-rank-short" className="text-xs">
                            {t('Short name')}
                        </Label>
                        <Input
                            id="inline-rank-short"
                            value={data.short_name}
                            onChange={(e) =>
                                setField('short_name', e.target.value)
                            }
                            placeholder="e.g. S.I."
                            className="h-8 text-xs"
                        />
                        {errors.short_name && (
                            <p className="text-[11px] text-destructive">
                                {errors.short_name}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={data.is_gazetted}
                                onChange={(e) =>
                                    setField('is_gazetted', e.target.checked)
                                }
                                className="rounded border-input text-primary"
                            />
                            <span>{t('Gazetted officer')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) =>
                                    setField('is_active', e.target.checked)
                                }
                                className="rounded border-input text-primary"
                            />
                            <span>{t('Active')}</span>
                        </label>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={saving}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" size="sm" disabled={saving}>
                            {saving && (
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            )}
                            {t('Save rank')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Evidence Summary Cell (Mirrors members EvidenceSummaryCell)
// ---------------------------------------------------------------------------

function EvidenceSummaryCell({
    evidences,
    t,
}: {
    evidences: CoachPromotionEvidence[];
    t: (key: string) => string;
}) {
    if (!evidences || evidences.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const firstTwo = evidences.slice(0, 2);
    const remaining = evidences.slice(2);

    return (
        <TooltipProvider>
            <div className="flex flex-wrap items-center gap-1.5">
                {firstTwo.map((row, idx) => {
                    const medal =
                        row.achievement?.medal_type ??
                        medalCountsList(row.medal_counts)[0]?.[0];
                    const eventName =
                        row.event?.name ?? row.team?.name ?? t('Event');
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
                                    medalCountsList(row.medal_counts)[0]?.[0];
                                const eventName =
                                    row.event?.name ??
                                    row.team?.name ??
                                    t('Event');
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

// ---------------------------------------------------------------------------
// Coach Promotion Dialog (Mirrors members PromotionDialog styling)
// ---------------------------------------------------------------------------

export function CoachPromotionDialog({
    coach,
    ranks,
    evidenceOptions = [],
    promotion,
    initialMode = 'promotion',
    open,
    onOpenChange,
    onSaved,
}: {
    coach: Props['coach'];
    ranks: RankOption[];
    evidenceOptions?: CoachedSessionOption[];
    promotion?: CoachPromotion | null;
    initialMode?: 'promotion' | 'reward';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
}) {
    const { t } = useTranslation();
    const [actionType, setActionType] = useState<'promotion' | 'reward'>(
        promotion?.cash_reward_amount ? 'reward' : initialMode,
    );
    const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
    const [evidenceSearch, setEvidenceSearch] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentError, setDocumentError] = useState<string | null>(null);

    const isRewardAction = actionType === 'reward';
    const currentCoachRankCode = coach.rank_master?.code ?? '';

    // Flat list of all evidence items
    const allEvidenceItems = useMemo(() => {
        const items: Array<{
            key: string;
            session_id: number;
            session_name: string;
            tournament_id: number;
            tournament_name: string;
            tier_code?: string | null;
            event_id: number | null;
            event_name: string;
            event_type?: string | null;
            team_id: number;
            team_name: string;
            medal_counts: Record<string, number>;
            players?: Array<{
                member: { id: number; full_name: string; pno?: string };
                medal_type?: string;
            }>;
            used_in_promotion?: boolean;
            used_promotion_id?: number | null;
            used_in_reward?: boolean;
            used_reward_id?: number | null;
        }> = [];

        for (const sessionGroup of evidenceOptions) {
            for (const tourney of sessionGroup.tournaments) {
                if (tourney.events && tourney.events.length > 0) {
                    for (const ev of tourney.events) {
                        items.push({
                            key: `${sessionGroup.session.id}:${tourney.tournament.id}:${ev.event.id}:${tourney.team.id}`,
                            session_id: sessionGroup.session.id,
                            session_name: sessionGroup.session.name,
                            tournament_id: tourney.tournament.id,
                            tournament_name: tourney.tournament.name,
                            tier_code: tourney.tournament.tier_code,
                            event_id: ev.event.id,
                            event_name: ev.event.name,
                            event_type: ev.event.event_type,
                            team_id: tourney.team.id,
                            team_name: tourney.team.name,
                            medal_counts: ev.medal_counts,
                            players: ev.players,
                            used_in_promotion: ev.used_in_promotion,
                            used_promotion_id: ev.used_promotion_id,
                            used_in_reward: ev.used_in_reward,
                            used_reward_id: ev.used_reward_id,
                        });
                    }
                } else {
                    items.push({
                        key: `${sessionGroup.session.id}:${tourney.tournament.id}:0:${tourney.team.id}`,
                        session_id: sessionGroup.session.id,
                        session_name: sessionGroup.session.name,
                        tournament_id: tourney.tournament.id,
                        tournament_name: tourney.tournament.name,
                        tier_code: tourney.tournament.tier_code,
                        event_id: null,
                        event_name: t('All Events'),
                        team_id: tourney.team.id,
                        team_name: tourney.team.name,
                        medal_counts: {},
                        players: [],
                        used_in_promotion: false,
                        used_in_reward: false,
                    });
                }
            }
        }

        return items;
    }, [evidenceOptions, t]);

    // Initial selected keys from promotion
    const defaultSelectedKeys = useMemo(() => {
        if (!promotion?.evidences) {
            return [];
        }

        return promotion.evidences
            .filter((e) => e.team_id !== null)
            .map(
                (e) =>
                    `${e.session_id}:${e.tournament_id}:${e.event_id ?? 0}:${e.team_id}`,
            );
    }, [promotion]);

    const [selectedKeys, setSelectedKeys] =
        useState<string[]>(defaultSelectedKeys);

    // Form
    const form = useForm({
        promotion_date: promotion?.promotion_date ?? '',
        from_rank: promotion?.from_rank ?? currentCoachRankCode,
        to_rank: promotion?.to_rank ?? '',
        cash_reward_amount: promotion?.cash_reward_amount ?? '',
        cash_reward_date: promotion?.cash_reward_date ?? '',
        cash_reward_reference: promotion?.cash_reward_reference ?? '',
        cash_reward_remarks: promotion?.cash_reward_remarks ?? '',
        reason: promotion?.reason ?? '',
        remarks: promotion?.remarks ?? '',
    });

    // Reset when modal opens
    React.useEffect(() => {
        if (open) {
            /* eslint-disable react-hooks/set-state-in-effect */
            setActionType(
                promotion?.cash_reward_amount ? 'reward' : initialMode,
            );
            setSelectedKeys(defaultSelectedKeys);
            setDocumentFile(null);
            setDocumentError(null);
            /* eslint-enable react-hooks/set-state-in-effect */
            form.setData({
                promotion_date: promotion?.promotion_date ?? '',
                from_rank: promotion?.from_rank ?? currentCoachRankCode,
                to_rank: promotion?.to_rank ?? '',
                cash_reward_amount: promotion?.cash_reward_amount ?? '',
                cash_reward_date: promotion?.cash_reward_date ?? '',
                cash_reward_reference: promotion?.cash_reward_reference ?? '',
                cash_reward_remarks: promotion?.cash_reward_remarks ?? '',
                reason: promotion?.reason ?? '',
                remarks: promotion?.remarks ?? '',
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open,
        promotion,
        initialMode,
        defaultSelectedKeys,
        currentCoachRankCode,
    ]);

    // Available ranks for Combobox — only ranks strictly senior to the current rank are promotable
    const rankOrderLookup = useMemo(() => rankOrderByCode(ranks), [ranks]);
    const toRankItems: ComboboxItem[] = useMemo(() => {
        const items = ranks.map((rank) => ({
            value: rank.code,
            label: rank.name,
        }));

        const fromRankOrder = resolveRankOrder(
            rankOrderLookup,
            form.data.from_rank || currentCoachRankCode,
        );

        if (fromRankOrder === null) {
            return items;
        }

        return items.filter((item) => {
            const order = resolveRankOrder(rankOrderLookup, item.value);

            return (
                item.value === form.data.to_rank ||
                (order !== null && order > fromRankOrder)
            );
        });
    }, [
        ranks,
        rankOrderLookup,
        form.data.from_rank,
        form.data.to_rank,
        currentCoachRankCode,
    ]);

    // Filtered evidence items
    const filteredEvidenceItems = useMemo(() => {
        return allEvidenceItems.filter((item) => {
            if (
                selectedSessionId !== 'all' &&
                String(item.session_id) !== selectedSessionId
            ) {
                return false;
            }

            if (!evidenceSearch.trim()) {
                return true;
            }

            const q = evidenceSearch.toLowerCase();

            return (
                item.tournament_name.toLowerCase().includes(q) ||
                item.event_name.toLowerCase().includes(q) ||
                item.team_name.toLowerCase().includes(q) ||
                (item.tier_code && item.tier_code.toLowerCase().includes(q))
            );
        });
    }, [allEvidenceItems, selectedSessionId, evidenceSearch]);

    // Group filtered items by tournament
    const groupedEvidenceByTournament = useMemo(() => {
        const groups = new Map<string, typeof filteredEvidenceItems>();

        for (const item of filteredEvidenceItems) {
            const groupKey = `${item.session_id}:${item.tournament_id}:${item.team_id}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }

            groups.get(groupKey)!.push(item);
        }

        return Array.from(groups.entries()).map(([key, items]) => ({
            key,
            session_name: items[0].session_name,
            tournament_name: items[0].tournament_name,
            tier_code: items[0].tier_code,
            team_name: items[0].team_name,
            items,
        }));
    }, [filteredEvidenceItems]);

    function toggleEvidence(key: string) {
        setSelectedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    }

    function handleRankCreated(newRank: RankOption) {
        form.setData('to_rank', newRank.code);
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

        if (selectedKeys.length === 0) {
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setIsSubmitting(true);

        const evidencesPayload = selectedKeys.map((key) => {
            const [sessionId, tournamentId, eventId, teamId] = key
                .split(':')
                .map(Number);

            return {
                session_id: sessionId,
                tournament_id: tournamentId,
                event_id: eventId > 0 ? eventId : null,
                team_id: teamId,
            };
        });

        const payload = {
            promotion_date: isRewardAction
                ? null
                : form.data.promotion_date || null,
            from_rank: isRewardAction
                ? null
                : form.data.from_rank || currentCoachRankCode,
            to_rank: isRewardAction ? null : form.data.to_rank || null,
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
            evidences: evidencesPayload,
            document: documentFile,
        };

        if (promotion) {
            router.patch(
                `/coaches/${coach.id}/promotions/${promotion.id}`,
                payload,
                {
                    onSuccess: () => {
                        setIsSubmitting(false);
                        onOpenChange(false);
                        onSaved?.();
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

        router.post(`/coaches/${coach.id}/promotions`, payload, {
            onSuccess: () => {
                setIsSubmitting(false);
                onOpenChange(false);
                form.reset();
                setSelectedKeys([]);
                setDocumentFile(null);
                onSaved?.();
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-4xl"
                aria-describedby="coach-promotion-dialog-description"
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
                                {coach.full_name
                                    ? `${promotion ? (isRewardAction ? t('Edit cash reward') : t('Edit promotion')) : isRewardAction ? t('Record cash reward') : t('Record promotion')} - ${coach.full_name}`
                                    : promotion
                                      ? isRewardAction
                                          ? t('Edit cash reward')
                                          : t('Edit promotion')
                                      : isRewardAction
                                        ? t('Record cash reward')
                                        : t('Record promotion')}
                            </DialogTitle>
                            <DialogDescription
                                id="coach-promotion-dialog-description"
                                className="mt-0.5 text-xs text-muted-foreground"
                            >
                                {isRewardAction
                                    ? t(
                                          'Record sanctioned cash reward for meritorious tournament performance.',
                                      )
                                    : t(
                                          'Promote coach to a higher rank based on verified tournament achievements.',
                                      )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form
                    id="coach-promotion-dialog-form"
                    onSubmit={handleSubmit}
                    className="flex-1 space-y-5 overflow-y-auto p-6"
                >
                    {/* Section 1: Promotion vs Reward Fields */}
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
                                    {t('Promotion details')}
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
                                            form.data.from_rank ||
                                                currentCoachRankCode,
                                            ranks,
                                        )}
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
                                    {selectedKeys.length > 0 && (
                                        <Badge
                                            variant="default"
                                            className="h-5 px-1.5 text-[11px] font-semibold"
                                        >
                                            {selectedKeys.length}{' '}
                                            {t('selected')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {isRewardAction
                                        ? t(
                                              'Select the tournament event achievements justifying this cash reward.',
                                          )
                                        : t(
                                              'Select the tournament event achievements justifying this promotion.',
                                          )}
                                </p>
                            </div>

                            {/* Toolbar: Session filter + Search input */}
                            <div className="flex flex-wrap items-center gap-2">
                                {evidenceOptions.length > 1 && (
                                    <Select
                                        value={selectedSessionId}
                                        onValueChange={setSelectedSessionId}
                                    >
                                        <SelectTrigger className="h-8 w-36 text-xs">
                                            <SelectValue
                                                placeholder={t('Session')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('All sessions')}
                                            </SelectItem>
                                            {evidenceOptions.map((s) => (
                                                <SelectItem
                                                    key={s.session.id}
                                                    value={String(s.session.id)}
                                                >
                                                    {s.session.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                <div className="relative">
                                    <Search className="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                                    <Input
                                        value={evidenceSearch}
                                        onChange={(e) =>
                                            setEvidenceSearch(e.target.value)
                                        }
                                        placeholder={t(
                                            'Search events or tournaments…',
                                        )}
                                        className="h-8 w-44 pl-8 text-xs sm:w-56"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Evidence Items List */}
                        {groupedEvidenceByTournament.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                                {t(
                                    'No tournament achievements found for the selected session or search filter.',
                                )}
                            </div>
                        ) : (
                            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                                {groupedEvidenceByTournament.map((group) => (
                                    <div
                                        key={group.key}
                                        className="rounded-lg border bg-muted/20 p-3"
                                    >
                                        {/* Tournament Header */}
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                {group.tier_code && (
                                                    <Badge
                                                        variant="outline"
                                                        className="h-5 px-1.5 text-[10px] font-bold"
                                                    >
                                                        {group.tier_code}
                                                    </Badge>
                                                )}
                                                <span className="text-xs font-bold text-foreground">
                                                    {group.tournament_name}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    · {group.session_name}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="h-5 text-[10px]"
                                            >
                                                {group.team_name}
                                            </Badge>
                                        </div>

                                        {/* Events under this tournament */}
                                        <div className="space-y-1.5">
                                            {group.items.map((item) => {
                                                const isSelected =
                                                    selectedKeys.includes(
                                                        item.key,
                                                    );
                                                const isUsedInOther =
                                                    isRewardAction
                                                        ? item.used_in_reward &&
                                                          item.used_reward_id !==
                                                              promotion?.id
                                                        : item.used_in_promotion &&
                                                          item.used_promotion_id !==
                                                              promotion?.id;

                                                const medalsList =
                                                    Object.entries(
                                                        item.medal_counts,
                                                    ).filter(
                                                        ([, count]) =>
                                                            count > 0,
                                                    );

                                                return (
                                                    <label
                                                        key={item.key}
                                                        className={`flex cursor-pointer items-center justify-between rounded-md border p-2 text-xs transition-colors ${
                                                            isSelected
                                                                ? 'border-primary/50 bg-primary/5 font-medium'
                                                                : 'hover:bg-muted/50'
                                                        } ${isUsedInOther ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <Checkbox
                                                                checked={
                                                                    isSelected
                                                                }
                                                                onCheckedChange={() =>
                                                                    toggleEvidence(
                                                                        item.key,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isUsedInOther
                                                                }
                                                            />
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">
                                                                        {
                                                                            item.event_name
                                                                        }
                                                                    </span>
                                                                    {item.event_type && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={
                                                                                item.event_type ===
                                                                                'team'
                                                                                    ? 'h-4.5 border-indigo-200 bg-indigo-50 px-1 text-[10px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200'
                                                                                    : 'h-4.5 border-teal-200 bg-teal-50 px-1 text-[10px] text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200'
                                                                            }
                                                                        >
                                                                            {item.event_type ===
                                                                            'team'
                                                                                ? t(
                                                                                      'Team',
                                                                                  )
                                                                                : t(
                                                                                      'Individual',
                                                                                  )}
                                                                        </Badge>
                                                                    )}
                                                                    {isUsedInOther && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="h-4.5 px-1 text-[10px] text-muted-foreground"
                                                                        >
                                                                            {isRewardAction
                                                                                ? t(
                                                                                      'Already rewarded',
                                                                                  )
                                                                                : t(
                                                                                      'Already promoted',
                                                                                  )}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {item.players &&
                                                                    item.players
                                                                        .length >
                                                                        0 && (
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            {t(
                                                                                'Players',
                                                                            )}
                                                                            :{' '}
                                                                            {item.players
                                                                                .map(
                                                                                    (
                                                                                        p,
                                                                                    ) =>
                                                                                        p
                                                                                            .member
                                                                                            .full_name,
                                                                                )
                                                                                .join(
                                                                                    ', ',
                                                                                )}
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        </div>

                                                        {/* Medal count badges */}
                                                        <div className="flex shrink-0 items-center gap-1.5">
                                                            {medalsList.map(
                                                                ([
                                                                    type,
                                                                    count,
                                                                ]) => (
                                                                    <Badge
                                                                        key={
                                                                            type
                                                                        }
                                                                        variant="secondary"
                                                                        className="h-5 px-1.5 text-[11px] font-semibold"
                                                                    >
                                                                        {medalEmoji(
                                                                            type,
                                                                        )}{' '}
                                                                        {count}
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selected Evidence Chips */}
                        {selectedKeys.length > 0 ? (
                            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <CheckCircle2 className="size-3.5 text-primary" />
                                        <span>{t('Selected evidence')}</span>
                                        <Badge
                                            variant="default"
                                            className="h-4 px-1.5 text-[10px]"
                                        >
                                            {selectedKeys.length}
                                        </Badge>
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedKeys([])}
                                        className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                                    >
                                        {t('Clear all')}
                                    </Button>
                                </div>
                                <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                                    {selectedKeys.map((key) => {
                                        const item = allEvidenceItems.find(
                                            (e) => e.key === key,
                                        );

                                        if (!item) {
                                            return null;
                                        }

                                        const medals = Object.keys(
                                            item.medal_counts,
                                        );
                                        const firstMedal =
                                            medals.length > 0
                                                ? medals[0]
                                                : null;

                                        return (
                                            <span
                                                key={key}
                                                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium shadow-2xs"
                                            >
                                                <span>
                                                    {medalEmoji(firstMedal)}
                                                </span>
                                                <span className="max-w-[160px] truncate text-foreground">
                                                    {item.event_name}
                                                </span>
                                                <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
                                                    ({item.tournament_name})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleEvidence(key);
                                                    }}
                                                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    aria-label={t('Remove')}
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
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
                        {selectedKeys.length > 0 ? (
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5" />
                                {selectedKeys.length}{' '}
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
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            form="coach-promotion-dialog-form"
                            disabled={selectedKeys.length === 0 || isSubmitting}
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

// ---------------------------------------------------------------------------
// Main Coach Promotions Tab Component (Exact replica of members PromotionsTab)
// ---------------------------------------------------------------------------

export function CoachPromotionsTab({
    coach,
    ranks,
    promotions = [],
    rewardEvidenceOptions = [],
    canManage = true,
    showActions = true,
    onSaved,
}: Props) {
    const { t } = useTranslation();
    const [expandedPromotionIds, setExpandedPromotionIds] = useState<number[]>(
        [],
    );
    const [activeTab, setActiveTab] = useState<'promotions' | 'rewards'>(
        'promotions',
    );
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'promotion' | 'reward'>(
        'promotion',
    );
    const [editingPromotion, setEditingPromotion] =
        useState<CoachPromotion | null>(null);

    // Delete confirmation state
    const [deletingPromotion, setDeletingPromotion] =
        useState<CoachPromotion | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAuthorized = canManage && showActions;

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

    function promotionCategory(promotion: CoachPromotion): string {
        if (promotion.record_type === 'promotion_reward') {
            return t('Promotion + Reward');
        }

        if (promotion.record_type === 'reward') {
            return t('Reward');
        }

        return t('Promotion');
    }

    function promotionCategoryClass(promotion: CoachPromotion): string {
        if (promotion.record_type === 'promotion_reward') {
            return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
        }

        if (promotion.record_type === 'reward') {
            return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
        }

        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
    }

    function hasPromotionFields(promotion: CoachPromotion): boolean {
        return promotion.record_type !== 'reward';
    }

    function hasRewardFields(promotion: CoachPromotion): boolean {
        return promotion.record_type !== 'promotion';
    }

    const promotionRows = useMemo(
        () => promotions.filter((p) => hasPromotionFields(p)),
        [promotions],
    );

    const rewardRows = useMemo(
        () => promotions.filter((p) => hasRewardFields(p)),
        [promotions],
    );

    const activeRows = activeTab === 'promotions' ? promotionRows : rewardRows;

    function openCreate(mode: 'promotion' | 'reward') {
        setEditingPromotion(null);
        setDialogMode(mode);
        setDialogOpen(true);
    }

    function openEdit(item: CoachPromotion, mode: 'promotion' | 'reward') {
        setEditingPromotion(item);
        setDialogMode(mode);
        setDialogOpen(true);
    }

    function confirmDelete() {
        if (!deletingPromotion) {
            return;
        }

        setIsDeleting(true);
        router.delete(
            `/coaches/${coach.id}/promotions/${deletingPromotion.id}`,
            {
                onSuccess: () => {
                    setIsDeleting(false);
                    setDeletingPromotion(null);
                    onSaved?.();
                },
                onError: () => {
                    setIsDeleting(false);
                },
            },
        );
    }

    const currentRankLabel = resolveRankLabel(
        coach.rank_master?.code ?? coach.rank_master?.name,
        ranks,
    );

    return (
        <div className="space-y-4 rounded-xl border bg-card p-6">
            {/* Header Card (Mirrors Members PromotionsTab Header) */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-medium">
                        {t('Promotions & rewards')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t('Current rank')}: {currentRankLabel || t('Unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Promotion decisions based on multiple achievements and performance evidence.',
                        )}
                    </p>
                </div>
                {isAuthorized ? (
                    <div className="flex flex-wrap gap-2">
                        {activeTab === 'promotions' ? (
                            <Button
                                size="sm"
                                onClick={() => openCreate('promotion')}
                            >
                                <Plus className="mr-1.5 size-3.5" />
                                {t('Add promotion')}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => openCreate('reward')}
                            >
                                <Plus className="mr-1.5 size-3.5" />
                                {t('Add cash reward')}
                            </Button>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Sub-tabs: Promotions vs Rewards */}
            <Tabs
                value={activeTab}
                onValueChange={(value) =>
                    setActiveTab(value as 'promotions' | 'rewards')
                }
            >
                <TabsList>
                    <TabsTrigger value="promotions">
                        {t('Promotions')}
                    </TabsTrigger>
                    <TabsTrigger value="rewards">{t('Rewards')}</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Empty State */}
            {activeRows.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                    {activeTab === 'promotions'
                        ? t('No promotions yet.')
                        : t('No rewards yet.')}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700">
                    {activeTab === 'promotions' ? (
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
                                                        t={t}
                                                    />
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.recorder?.name ??
                                                        promotion.recorded_by_name ?? (
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
                                                        {isAuthorized && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            promotion,
                                                                            'promotion',
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-1.5 size-3.5" />
                                                                    {t('Edit')}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        setDeletingPromotion(
                                                                            promotion,
                                                                        )
                                                                    }
                                                                    title={t(
                                                                        'Delete',
                                                                    )}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </>
                                                        )}
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
                                                                                    'Event type',
                                                                                )}
                                                                            </th>
                                                                            <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                {t(
                                                                                    'Tier',
                                                                                )}
                                                                            </th>
                                                                            <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                {t(
                                                                                    'Team',
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
                                                                        {!promotion.evidences ||
                                                                        promotion
                                                                            .evidences
                                                                            .length ===
                                                                            0 ? (
                                                                            <tr>
                                                                                <td
                                                                                    colSpan={
                                                                                        10
                                                                                    }
                                                                                    className="px-2 py-2 text-muted-foreground"
                                                                                >
                                                                                    {t(
                                                                                        'No evidence linked',
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ) : (
                                                                            promotion.evidences.map(
                                                                                (
                                                                                    evidence,
                                                                                    evidenceIndex,
                                                                                ) => {
                                                                                    const tier =
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.tier_code ??
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.tier
                                                                                            ?.code ??
                                                                                        '—';
                                                                                    const medals =
                                                                                        medalCountsList(
                                                                                            evidence.medal_counts,
                                                                                        );
                                                                                    const eventName =
                                                                                        evidence
                                                                                            .event
                                                                                            ?.name ??
                                                                                        t(
                                                                                            'All Events',
                                                                                        );
                                                                                    const teamName =
                                                                                        evidence
                                                                                            .team
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const sessionName =
                                                                                        evidence
                                                                                            .session
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const tournamentName =
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const detailsList =
                                                                                        [
                                                                                            evidence
                                                                                                .event
                                                                                                ?.gender_class,
                                                                                            evidence
                                                                                                .event
                                                                                                ?.discipline,
                                                                                            evidence
                                                                                                .event
                                                                                                ?.weight_category,
                                                                                            evidence
                                                                                                .tournament
                                                                                                ?.venue,
                                                                                        ].filter(
                                                                                            Boolean,
                                                                                        );

                                                                                    return (
                                                                                        <tr
                                                                                            key={
                                                                                                evidence.id ??
                                                                                                evidenceIndex
                                                                                            }
                                                                                            className="border-b last:border-0 hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                                                                                        >
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {evidenceIndex +
                                                                                                    1}
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                <Badge
                                                                                                    variant="outline"
                                                                                                    className="border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200"
                                                                                                >
                                                                                                    {t(
                                                                                                        'Coached Event',
                                                                                                    )}
                                                                                                </Badge>
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    sessionName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    tournamentName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    eventName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {evidence
                                                                                                    .event
                                                                                                    ?.event_type ===
                                                                                                'team'
                                                                                                    ? t(
                                                                                                          'Team',
                                                                                                      )
                                                                                                    : evidence
                                                                                                            .event
                                                                                                            ?.event_type ===
                                                                                                        'individual'
                                                                                                      ? t(
                                                                                                            'Individual',
                                                                                                        )
                                                                                                      : evidence.team
                                                                                                        ? t(
                                                                                                              'Team',
                                                                                                          )
                                                                                                        : '—'}
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    tier
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    teamName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {medals.length >
                                                                                                0 ? (
                                                                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                                                                        {medals.map(
                                                                                                            ([
                                                                                                                type,
                                                                                                                count,
                                                                                                            ]) => (
                                                                                                                <span
                                                                                                                    key={
                                                                                                                        type
                                                                                                                    }
                                                                                                                    className="flex items-center gap-1"
                                                                                                                >
                                                                                                                    <span>
                                                                                                                        {medalEmoji(
                                                                                                                            type,
                                                                                                                        )}
                                                                                                                    </span>
                                                                                                                    <span>
                                                                                                                        {t(
                                                                                                                            type,
                                                                                                                        )}
                                                                                                                        {count >
                                                                                                                        1
                                                                                                                            ? ` ×${count}`
                                                                                                                            : ''}
                                                                                                                    </span>
                                                                                                                </span>
                                                                                                            ),
                                                                                                        )}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    '—'
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-2 py-1.5">
                                                                                                {detailsList.length >
                                                                                                0
                                                                                                    ? detailsList.join(
                                                                                                          ' · ',
                                                                                                      )
                                                                                                    : '—'}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                },
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </table>
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
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(
                                                        promotion.cash_reward_amount,
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
                                                        t={t}
                                                    />
                                                </td>
                                                <td className="border-r border-slate-100 px-2 py-1.5 text-xs">
                                                    {promotion.recorder?.name ??
                                                        promotion.recorded_by_name ?? (
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
                                                        {isAuthorized && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            promotion,
                                                                            'reward',
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-1.5 size-3.5" />
                                                                    {t('Edit')}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        setDeletingPromotion(
                                                                            promotion,
                                                                        )
                                                                    }
                                                                    title={t(
                                                                        'Delete',
                                                                    )}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </>
                                                        )}
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
                                                                                    'Event type',
                                                                                )}
                                                                            </th>
                                                                            <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                {t(
                                                                                    'Tier',
                                                                                )}
                                                                            </th>
                                                                            <th className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                                                                {t(
                                                                                    'Team',
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
                                                                        {!promotion.evidences ||
                                                                        promotion
                                                                            .evidences
                                                                            .length ===
                                                                            0 ? (
                                                                            <tr>
                                                                                <td
                                                                                    colSpan={
                                                                                        10
                                                                                    }
                                                                                    className="px-2 py-2 text-muted-foreground"
                                                                                >
                                                                                    {t(
                                                                                        'No evidence linked',
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ) : (
                                                                            promotion.evidences.map(
                                                                                (
                                                                                    evidence,
                                                                                    evidenceIndex,
                                                                                ) => {
                                                                                    const tier =
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.tier_code ??
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.tier
                                                                                            ?.code ??
                                                                                        '—';
                                                                                    const medals =
                                                                                        medalCountsList(
                                                                                            evidence.medal_counts,
                                                                                        );
                                                                                    const eventName =
                                                                                        evidence
                                                                                            .event
                                                                                            ?.name ??
                                                                                        t(
                                                                                            'All Events',
                                                                                        );
                                                                                    const teamName =
                                                                                        evidence
                                                                                            .team
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const sessionName =
                                                                                        evidence
                                                                                            .session
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const tournamentName =
                                                                                        evidence
                                                                                            .tournament
                                                                                            ?.name ??
                                                                                        '—';
                                                                                    const detailsList =
                                                                                        [
                                                                                            evidence
                                                                                                .event
                                                                                                ?.gender_class,
                                                                                            evidence
                                                                                                .event
                                                                                                ?.discipline,
                                                                                            evidence
                                                                                                .event
                                                                                                ?.weight_category,
                                                                                            evidence
                                                                                                .tournament
                                                                                                ?.venue,
                                                                                        ].filter(
                                                                                            Boolean,
                                                                                        );

                                                                                    return (
                                                                                        <tr
                                                                                            key={
                                                                                                evidence.id ??
                                                                                                evidenceIndex
                                                                                            }
                                                                                            className="border-b last:border-0 hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                                                                                        >
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {evidenceIndex +
                                                                                                    1}
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                <Badge
                                                                                                    variant="outline"
                                                                                                    className="border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200"
                                                                                                >
                                                                                                    {t(
                                                                                                        'Coached Event',
                                                                                                    )}
                                                                                                </Badge>
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    sessionName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    tournamentName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    eventName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {evidence
                                                                                                    .event
                                                                                                    ?.event_type ===
                                                                                                'team'
                                                                                                    ? t(
                                                                                                          'Team',
                                                                                                      )
                                                                                                    : evidence
                                                                                                            .event
                                                                                                            ?.event_type ===
                                                                                                        'individual'
                                                                                                      ? t(
                                                                                                            'Individual',
                                                                                                        )
                                                                                                      : evidence.team
                                                                                                        ? t(
                                                                                                              'Team',
                                                                                                          )
                                                                                                        : '—'}
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    tier
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {
                                                                                                    teamName
                                                                                                }
                                                                                            </td>
                                                                                            <td className="border-r border-slate-100 px-2 py-1.5 dark:border-slate-700">
                                                                                                {medals.length >
                                                                                                0 ? (
                                                                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                                                                        {medals.map(
                                                                                                            ([
                                                                                                                type,
                                                                                                                count,
                                                                                                            ]) => (
                                                                                                                <span
                                                                                                                    key={
                                                                                                                        type
                                                                                                                    }
                                                                                                                    className="flex items-center gap-1"
                                                                                                                >
                                                                                                                    <span>
                                                                                                                        {medalEmoji(
                                                                                                                            type,
                                                                                                                        )}
                                                                                                                    </span>
                                                                                                                    <span>
                                                                                                                        {t(
                                                                                                                            type,
                                                                                                                        )}
                                                                                                                        {count >
                                                                                                                        1
                                                                                                                            ? ` ×${count}`
                                                                                                                            : ''}
                                                                                                                    </span>
                                                                                                                </span>
                                                                                                            ),
                                                                                                        )}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    '—'
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-2 py-1.5">
                                                                                                {detailsList.length >
                                                                                                0
                                                                                                    ? detailsList.join(
                                                                                                          ' · ',
                                                                                                      )
                                                                                                    : '—'}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                },
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </table>
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
                    )}
                </div>
            )}

            {/* Promotion / Reward Dialog */}
            <CoachPromotionDialog
                coach={coach}
                ranks={ranks}
                evidenceOptions={rewardEvidenceOptions}
                promotion={editingPromotion}
                initialMode={dialogMode}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSaved={onSaved}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog
                open={deletingPromotion !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingPromotion(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('Delete record?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                'This promotion or cash reward record and its attached evidence will be permanently deleted. This action cannot be undone.',
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && (
                                <Loader2 className="mr-1.5 size-4 animate-spin" />
                            )}
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
