import {
    ArrowRight,
    Award,
    Calendar,
    CheckCircle2,
    Edit2,
    ExternalLink,
    IndianRupee,
    Loader2,
    Plus,
    Search,
    Trash2,
    Trophy,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Combobox, type ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/use-translation';
import { router, useForm } from '@inertiajs/react';

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
    } | null;
    team?: { id: number; name: string } | null;
    achievement?: { id: number; medal_type: string; position?: number | null } | null;
};

export type CoachPromotion = {
    id: number;
    coach_id: number;
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
        rank_master?: { id: number; code: string | null; name: string; short_name?: string | null } | null;
        rank_master_id?: number | null;
        full_name?: string;
    };
    ranks: RankOption[];
    promotions: CoachPromotion[];
    rewardEvidenceOptions?: CoachedSessionOption[];
    canManage?: boolean;
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

function resolveRankLabel(value: string | null | undefined, ranks: RankOption[]): string {
    if (!value) {
        return '—';
    }

    const rank = ranks.find(
        (r) => r.code === value || r.name === value || r.short_name === value,
    );

    return rank ? rank.name : value;
}

function resolveRankCode(value: string | null | undefined, ranks: RankOption[]): string {
    if (!value) {
        return '';
    }

    const rank = ranks.find(
        (r) => r.code === value || r.name === value || r.short_name === value,
    );

    return rank ? rank.code : value;
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

function formatDateDisplay(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const match = /^\d{4}-\d{2}-\d{2}/.exec(value.trim());

    if (!match) {
        return value;
    }

    const [year, month, day] = match[0].split('-');

    return `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Inline Rank Dialog
// ---------------------------------------------------------------------------

function InlineRankDialog({ onCreated }: { onCreated: (rank: RankOption) => void }) {
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

    function setField<K extends keyof InlineRankPayload>(field: K, value: InlineRankPayload[K]) {
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
                    const json = (await response.json()) as { errors: Record<string, string[]> };
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">{t('Code')}</Label>
                            <Input
                                value={data.code}
                                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                                placeholder="CONSTABLE"
                                className="h-9 text-xs"
                            />
                            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">{t('Name')}</Label>
                            <Input
                                value={data.name}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder={t('Constable')}
                                className="h-9 text-xs"
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">{t('Rank order')}</Label>
                            <Input
                                type="number"
                                value={data.rank_order}
                                onChange={(e) => setField('rank_order', e.target.value)}
                                placeholder="10"
                                className="h-9 text-xs"
                            />
                            {errors.rank_order && (
                                <p className="text-xs text-destructive">{errors.rank_order}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">{t('Short name')}</Label>
                            <Input
                                value={data.short_name}
                                onChange={(e) => setField('short_name', e.target.value)}
                                placeholder="CT"
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="coach_inline_rank_gazetted"
                                checked={data.is_gazetted}
                                onCheckedChange={(val) => setField('is_gazetted', val === true)}
                            />
                            <Label htmlFor="coach_inline_rank_gazetted" className="text-xs">
                                {t('Gazetted')}
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="coach_inline_rank_active"
                                checked={data.is_active}
                                onCheckedChange={(val) => setField('is_active', val === true)}
                            />
                            <Label htmlFor="coach_inline_rank_active" className="text-xs">
                                {t('Active')}
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={saving}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                            {t('Save rank')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Evidence Summary Cell
// ---------------------------------------------------------------------------

function EvidenceSummaryCell({
    evidences,
    t,
}: {
    evidences: CoachPromotionEvidence[];
    t: (key: string) => string;
}) {
    if (!evidences || evidences.length === 0) {
        return <span className="text-muted-foreground">—</span>;
    }

    const first = evidences[0];
    const tournamentName = first.tournament?.name ?? t('Tournament');
    const tierCode = first.tournament?.tier_code;
    const eventName = first.event?.name;
    const teamName = first.team?.name;
    const medal = first.achievement?.medal_type;

    return (
        <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                    {tierCode && (
                        <Badge variant="outline" className="h-4.5 px-1 text-[10px] font-semibold">
                            {tierCode}
                        </Badge>
                    )}
                    <span className="truncate max-w-[200px]" title={tournamentName}>
                        {tournamentName}
                    </span>
                </div>
                {(eventName || teamName) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {medal && <span>{medalEmoji(medal)}</span>}
                        {eventName && <span>{eventName}</span>}
                        {teamName && <span>· {teamName}</span>}
                    </div>
                )}
            </div>

            {evidences.length > 1 && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-[11px] font-semibold text-primary"
                        >
                            +{evidences.length - 1} {t('more')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3 text-xs" align="start">
                        <div className="space-y-2">
                            <p className="font-semibold text-foreground">
                                {t('Attached Tournament Evidence')} ({evidences.length})
                            </p>
                            <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                                {evidences.map((ev, idx) => (
                                    <div key={idx} className="rounded border bg-muted/30 p-2 text-xs">
                                        <div className="font-medium text-foreground">
                                            {ev.tournament?.name ?? t('Tournament')}
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                            {ev.achievement?.medal_type && (
                                                <span>{medalEmoji(ev.achievement.medal_type)}</span>
                                            )}
                                            {ev.event?.name && <span>{ev.event.name}</span>}
                                            {ev.team?.name && <span>· {ev.team.name}</span>}
                                            {ev.session?.name && <span>({ev.session.name})</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Coach Promotion / Reward Dialog
// ---------------------------------------------------------------------------

type EvidenceSelectionItem = {
    key: string;
    session_id: number;
    tournament_id: number;
    event_id: number | null;
    team_id: number;
};

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
            team_id: number;
            team_name: string;
            medal_counts: Record<string, number>;
            players?: Array<{ member: { id: number; full_name: string; pno?: string }; medal_type?: string }>;
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
                    // Fallback for tournaments without event breakdown
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
            .map((e) => `${e.session_id}:${e.tournament_id}:${e.event_id ?? 0}:${e.team_id}`);
    }, [promotion]);

    const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultSelectedKeys);

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
            setActionType(promotion?.cash_reward_amount ? 'reward' : initialMode);
            setSelectedKeys(defaultSelectedKeys);
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
    }, [open, promotion, initialMode, defaultSelectedKeys, currentCoachRankCode]);

    // Available ranks for Combobox
    const toRankItems: ComboboxItem[] = useMemo(() => {
        return ranks.map((rank) => ({
            value: rank.code,
            label: rank.name,
        }));
    }, [ranks]);

    // Filtered evidence items
    const filteredEvidenceItems = useMemo(() => {
        return allEvidenceItems.filter((item) => {
            if (selectedSessionId !== 'all' && String(item.session_id) !== selectedSessionId) {
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
            if (!form.data.promotion_date || form.data.promotion_date.trim() === '') {
                form.setError('promotion_date', t('The promotion date is required.'));
                hasError = true;
            }

            if (!form.data.to_rank || form.data.to_rank.trim() === '') {
                form.setError('to_rank', t('The target rank is required.'));
                hasError = true;
            }
        } else {
            if (!form.data.cash_reward_amount || Number(form.data.cash_reward_amount) <= 0) {
                form.setError('cash_reward_amount', t('The cash reward amount is required.'));
                hasError = true;
            }

            if (!form.data.cash_reward_date || form.data.cash_reward_date.trim() === '') {
                form.setError('cash_reward_date', t('The cash reward date is required.'));
                hasError = true;
            }

            if (!form.data.cash_reward_reference || form.data.cash_reward_reference.trim() === '') {
                form.setError('cash_reward_reference', t('The cash reward reference is required.'));
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
            const [sessionId, tournamentId, eventId, teamId] = key.split(':').map(Number);

            return {
                session_id: sessionId,
                tournament_id: tournamentId,
                event_id: eventId > 0 ? eventId : null,
                team_id: teamId,
            };
        });

        const payload = {
            promotion_date: isRewardAction ? null : form.data.promotion_date || null,
            from_rank: isRewardAction ? null : form.data.from_rank || currentCoachRankCode,
            to_rank: isRewardAction ? null : form.data.to_rank || null,
            cash_reward_amount: isRewardAction ? form.data.cash_reward_amount || null : null,
            cash_reward_date: isRewardAction ? form.data.cash_reward_date || null : null,
            cash_reward_reference: isRewardAction ? form.data.cash_reward_reference || null : null,
            cash_reward_remarks: isRewardAction ? form.data.cash_reward_remarks || null : null,
            reason: isRewardAction ? null : form.data.reason || null,
            remarks: isRewardAction ? null : form.data.remarks || null,
            evidences: evidencesPayload,
        };

        if (promotion) {
            router.patch(`/coaches/${coach.id}/promotions/${promotion.id}`, payload, {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onOpenChange(false);
                    onSaved?.();
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            });

            return;
        }

        router.post(`/coaches/${coach.id}/promotions`, payload, {
            onSuccess: () => {
                setIsSubmitting(false);
                onOpenChange(false);
                form.reset();
                setSelectedKeys([]);
                onSaved?.();
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col p-0" aria-describedby={undefined}>
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        {isRewardAction ? (
                            <Award className="size-5 text-amber-500" />
                        ) : (
                            <Trophy className="size-5 text-primary" />
                        )}
                        <span>
                            {promotion
                                ? isRewardAction
                                    ? t('Edit cash reward')
                                    : t('Edit promotion')
                                : isRewardAction
                                  ? t('Record cash reward')
                                  : t('Record out-of-turn promotion')}
                        </span>
                        {coach.full_name && (
                            <span className="text-sm font-normal text-muted-foreground">
                                — {coach.full_name}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {isRewardAction
                            ? t('Grant a cash incentive to this coach backed by team tournament achievements.')
                            : t('Promote this coach to a higher rank backed by verified team tournament achievements.')}
                    </DialogDescription>

                    {/* Mode Toggle Pills (when creating new) */}
                    {!promotion && (
                        <div className="pt-2">
                            <Tabs
                                value={actionType}
                                onValueChange={(val) => {
                                    setActionType(val as 'promotion' | 'reward');
                                    form.clearErrors();
                                }}
                            >
                                <TabsList className="grid h-8 grid-cols-2">
                                    <TabsTrigger value="promotion" className="text-xs font-semibold">
                                        {t('Out-of-turn promotion')}
                                    </TabsTrigger>
                                    <TabsTrigger value="reward" className="text-xs font-semibold">
                                        {t('Cash reward')}
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    )}
                </DialogHeader>

                <form
                    id="coach-promotion-dialog-form"
                    onSubmit={handleSubmit}
                    className="flex-1 space-y-4 overflow-y-auto px-6 py-4"
                >
                    {/* Section 1: Promotion vs Reward Fields */}
                    {isRewardAction ? (
                        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-2xs">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    {t('Cash Reward Details')}
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
                                            <span className="text-destructive">*</span>
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
                                                form.setData('cash_reward_amount', e.target.value)
                                            }
                                            placeholder="50000"
                                            className="h-9 pl-7 text-xs font-medium"
                                        />
                                    </div>
                                    <InputError message={form.errors.cash_reward_amount} />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Cash reward date')}{' '}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                    </div>
                                    <DatePicker
                                        value={form.data.cash_reward_date}
                                        onChange={(v) => form.setData('cash_reward_date', v)}
                                    />
                                    <InputError message={form.errors.cash_reward_date} />
                                </div>
                            </div>

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Sanction / Order reference')}{' '}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                    </div>
                                    <Input
                                        value={form.data.cash_reward_reference}
                                        onChange={(e) =>
                                            form.setData('cash_reward_reference', e.target.value)
                                        }
                                        placeholder={t('e.g. GO No. 128/Sports/2026')}
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={form.errors.cash_reward_reference} />
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
                                            form.setData('cash_reward_remarks', e.target.value)
                                        }
                                        placeholder={t('Disbursement notes or remarks')}
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={form.errors.cash_reward_remarks} />
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
                                            form.data.from_rank || currentCoachRankCode,
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
                                                : 'italic text-muted-foreground'
                                        }`}
                                    >
                                        {resolveRankLabel(form.data.to_rank, ranks) ||
                                            t('Select target rank')}
                                    </span>
                                </div>
                            </div>

                            {/* Fields Grid */}
                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Promotion date')}{' '}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                    </div>
                                    <DatePicker
                                        value={form.data.promotion_date}
                                        onChange={(v) => form.setData('promotion_date', v)}
                                    />
                                    <InputError message={form.errors.promotion_date} />
                                </div>
                                <div className="grid gap-1.5">
                                    <div className="flex h-5 items-center justify-between">
                                        <Label className="text-xs font-semibold">
                                            {t('Promoted to rank')}{' '}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <InlineRankDialog onCreated={handleRankCreated} />
                                    </div>
                                    <Combobox
                                        value={form.data.to_rank}
                                        onValueChange={(v) => form.setData('to_rank', v)}
                                        items={toRankItems}
                                        placeholder={t('Search and select rank')}
                                        searchPlaceholder={t('Search ranks by code or name…')}
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
                                        onChange={(e) => form.setData('reason', e.target.value)}
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
                                        onChange={(e) => form.setData('remarks', e.target.value)}
                                        placeholder={t('Additional committee remarks or remarks')}
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
                                    <span className="font-bold text-destructive">*</span>
                                    {selectedKeys.length > 0 && (
                                        <Badge
                                            variant="default"
                                            className="h-5 px-1.5 text-[11px] font-semibold"
                                        >
                                            {selectedKeys.length} {t('selected')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {isRewardAction
                                        ? t('Select the tournament event achievements justifying this cash reward.')
                                        : t('Select the tournament event achievements justifying this promotion.')}
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
                                            <SelectValue placeholder={t('Session')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All sessions')}</SelectItem>
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
                                        onChange={(e) => setEvidenceSearch(e.target.value)}
                                        placeholder={t('Search events or tournaments…')}
                                        className="h-8 w-44 pl-8 text-xs sm:w-56"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Evidence Items List */}
                        {groupedEvidenceByTournament.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                                {t('No tournament achievements found for the selected session or search filter.')}
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
                                            <Badge variant="secondary" className="h-5 text-[10px]">
                                                {group.team_name}
                                            </Badge>
                                        </div>

                                        {/* Events under this tournament */}
                                        <div className="space-y-1.5">
                                            {group.items.map((item) => {
                                                const isSelected = selectedKeys.includes(item.key);
                                                const isUsedInOther = isRewardAction
                                                    ? item.used_in_reward &&
                                                      item.used_reward_id !== promotion?.id
                                                    : item.used_in_promotion &&
                                                      item.used_promotion_id !== promotion?.id;

                                                const medalsList = Object.entries(item.medal_counts).filter(
                                                    ([, count]) => count > 0,
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
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleEvidence(item.key)}
                                                                disabled={isUsedInOther}
                                                            />
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">
                                                                        {item.event_name}
                                                                    </span>
                                                                    {isUsedInOther && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="h-4.5 px-1 text-[10px] text-muted-foreground"
                                                                        >
                                                                            {isRewardAction
                                                                                ? t('Already rewarded')
                                                                                : t('Already promoted')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {item.players && item.players.length > 0 && (
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {t('Players')}:{' '}
                                                                        {item.players
                                                                            .map((p) => p.member.full_name)
                                                                            .join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Medal count badges */}
                                                        <div className="flex shrink-0 items-center gap-1.5">
                                                            {medalsList.map(([type, count]) => (
                                                                <Badge
                                                                    key={type}
                                                                    variant="secondary"
                                                                    className="h-5 px-1.5 text-[11px] font-semibold"
                                                                >
                                                                    {medalEmoji(type)} {count}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedKeys.length === 0 && (
                            <p className="text-xs text-destructive">
                                {t('At least one tournament achievement must be selected as justification.')}
                            </p>
                        )}
                    </div>
                </form>

                <DialogFooter className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3.5 sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                        {selectedKeys.length > 0 ? (
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5" />
                                {selectedKeys.length} {t('event(s) attached as evidence')}
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
                            {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
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
// Main Coach Promotions Tab Component
// ---------------------------------------------------------------------------

export function CoachPromotionsTab({
    coach,
    ranks,
    promotions = [],
    rewardEvidenceOptions = [],
    canManage = true,
    onSaved,
}: Props) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'promotions' | 'rewards'>('promotions');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'promotion' | 'reward'>('promotion');
    const [editingPromotion, setEditingPromotion] = useState<CoachPromotion | null>(null);

    // Delete confirmation state
    const [deletingPromotion, setDeletingPromotion] = useState<CoachPromotion | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Categorize records
    const promotionRows = useMemo(() => {
        return promotions.filter((p) => p.to_rank || p.promotion_date || p.from_rank);
    }, [promotions]);

    const rewardRows = useMemo(() => {
        return promotions.filter((p) => p.cash_reward_amount !== null && p.cash_reward_amount !== '');
    }, [promotions]);

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
        router.delete(`/coaches/${coach.id}/promotions/${deletingPromotion.id}`, {
            onSuccess: () => {
                setIsDeleting(false);
                setDeletingPromotion(null);
                onSaved?.();
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    }

    const currentRankLabel = resolveRankLabel(
        coach.rank_master?.code ?? coach.rank_master?.name,
        ranks,
    );

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy className="size-5 text-amber-500" />
                        <h2 className="text-base font-bold text-foreground">
                            {t('Promotions & Rewards')}
                        </h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('Current rank')}:{' '}
                        <span className="font-semibold text-foreground">{currentRankLabel}</span>
                        {' · '}
                        {t('Decisions backed by team tournament achievements and performance.')}
                    </p>
                </div>

                {canManage && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openCreate('reward')}
                            className="h-9 gap-1.5 text-xs font-semibold"
                        >
                            <IndianRupee className="size-3.5" />
                            {t('Add cash reward')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => openCreate('promotion')}
                            className="h-9 gap-1.5 text-xs font-semibold"
                        >
                            <Plus className="size-4" />
                            {t('Add promotion')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Sub-tabs: Promotions vs Cash Rewards */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as 'promotions' | 'rewards')}
                className="space-y-4"
            >
                <div className="flex items-center justify-between border-b pb-2">
                    <TabsList className="h-9">
                        <TabsTrigger value="promotions" className="gap-2 text-xs font-semibold">
                            <Award className="size-3.5" />
                            {t('Promotions')}
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                {promotionRows.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="rewards" className="gap-2 text-xs font-semibold">
                            <IndianRupee className="size-3.5" />
                            {t('Cash Rewards')}
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                {rewardRows.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Promotions Table */}
                {activeTab === 'promotions' && (
                    <div className="rounded-xl border bg-card">
                        {promotionRows.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                {t('No promotion records found for this coach.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 text-xs">
                                        <TableHead className="w-24">{t('Type')}</TableHead>
                                        <TableHead>{t('Rank Progression')}</TableHead>
                                        <TableHead>{t('Promotion date')}</TableHead>
                                        <TableHead>{t('Order / Reason')}</TableHead>
                                        <TableHead>{t('Tournament Evidence')}</TableHead>
                                        <TableHead>{t('Recorded by')}</TableHead>
                                        {canManage && <TableHead className="w-20 text-right">{t('Actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promotionRows.map((item) => (
                                        <TableRow key={item.id} className="text-xs">
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-primary/30 text-[10px] font-semibold text-primary"
                                                >
                                                    {t('Promotion')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <span className="text-muted-foreground">
                                                        {resolveRankLabel(item.from_rank, ranks)}
                                                    </span>
                                                    <ArrowRight className="size-3 text-muted-foreground" />
                                                    <span className="font-semibold text-primary">
                                                        {resolveRankLabel(item.to_rank, ranks)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatDateDisplay(item.promotion_date)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5 max-w-[200px]">
                                                    <p className="truncate font-medium text-foreground">
                                                        {item.reason || '—'}
                                                    </p>
                                                    {item.remarks && (
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {item.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <EvidenceSummaryCell evidences={item.evidences} t={t} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {item.recorder?.name ?? item.recorded_by_name ?? '—'}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-foreground"
                                                            onClick={() => openEdit(item, 'promotion')}
                                                            title={t('Edit')}
                                                        >
                                                            <Edit2 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeletingPromotion(item)}
                                                            title={t('Delete')}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}

                {/* Cash Rewards Table */}
                {activeTab === 'rewards' && (
                    <div className="rounded-xl border bg-card">
                        {rewardRows.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                {t('No cash reward records found for this coach.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 text-xs">
                                        <TableHead className="w-24">{t('Type')}</TableHead>
                                        <TableHead>{t('Amount')}</TableHead>
                                        <TableHead>{t('Reward date')}</TableHead>
                                        <TableHead>{t('Sanction / Reference')}</TableHead>
                                        <TableHead>{t('Tournament Evidence')}</TableHead>
                                        <TableHead>{t('Recorded by')}</TableHead>
                                        {canManage && <TableHead className="w-20 text-right">{t('Actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rewardRows.map((item) => (
                                        <TableRow key={item.id} className="text-xs">
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-300 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                                                >
                                                    {t('Cash Reward')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(item.cash_reward_amount)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatDateDisplay(item.cash_reward_date)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5 max-w-[200px]">
                                                    <p className="truncate font-medium text-foreground">
                                                        {item.cash_reward_reference || '—'}
                                                    </p>
                                                    {item.cash_reward_remarks && (
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {item.cash_reward_remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <EvidenceSummaryCell evidences={item.evidences} t={t} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {item.recorder?.name ?? item.recorded_by_name ?? '—'}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-foreground"
                                                            onClick={() => openEdit(item, 'reward')}
                                                            title={t('Edit')}
                                                        >
                                                            <Edit2 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeletingPromotion(item)}
                                                            title={t('Delete')}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </Tabs>

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
                        <AlertDialogTitle>{t('Delete record?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This promotion or cash reward record and its attached evidence will be permanently deleted. This action cannot be undone.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
