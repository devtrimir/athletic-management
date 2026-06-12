import { router, useForm, usePage } from '@inertiajs/react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { store as storeBenefit, update as updateBenefit } from '@/routes/achievement-benefits';

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
    sort_order: number | null;
};

type LiveAchievement = {
    id: number;
    medal_type: string;
    position: number | null;
    remarks: string | null;
    session: { id: number; name: string };
    tournament: { id: number; name_hi: string; tier_code: string | null };
    event: { id: number; name_hi: string };
    benefits: { id: number; benefit_type: string }[];
};

type ParticipationItem = {
    id: number;
    position: number | null;
    tournament: { id: number; name_hi: string; tier_code: string | null; date_from: string | null };
    event: { id: number; name_hi: string; gender_class: string };
    achievement: {
        medal_type: string;
        position: number | null;
        remarks: string | null;
        benefits?: { id: number; benefit_type: string; cash_amount: string | null; benefit_date: string | null; order_reference: string | null }[];
    } | null;
};

type ParticipationGroup = {
    session: { id: number; name: string };
    participations: ParticipationItem[];
};

type PromotionEvidence = { id: number; type: 'member_legacy_achievement' | 'achievement' | 'participation'; evidence_id: number };
type PromotionEvidenceRef = { type: PromotionEvidence['type']; id: number };
type RewardOption = { key: string; label: string; target: { type: 'participation'; id: number } | null };
type PromotionBenefit = {
    id: number;
    benefit_type: string;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
    source_label?: string;
};
type PromotionRow = {
    id: number;
    promotion_date: string | null;
    from_rank: string | null;
    to_rank: string;
    cash_reward_amount: string | null;
    cash_reward_date: string | null;
    cash_reward_reference: string | null;
    cash_reward_remarks: string | null;
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
    caption_hi: string | null;
    uploaded_by: { id: number; name: string };
    created_at: string;
};

type RankOption = {
    code: string;
    name_hi: string;
    name_en: string;
    short_name: string | null;
};

type InlineRankPayload = {
    code: string;
    name_en: string;
    rank_order: string;
    short_name: string;
    name_hi: string;
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
};

function evidenceKey(type: string, id: number): string {
    return `${type}:${id}`;
}

function rankDisplay(rank: RankOption, locale: string): string {
    const label = locale === 'en' ? rank.name_en : rank.name_hi;

    return `${rank.code} · ${label}${rank.short_name ? ` · ${rank.short_name}` : ''}`;
}

function summarizeBenefits(benefits: { benefit_type: string; cash_amount: string | null; order_reference: string | null }[], t: (key: string) => string): string {
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

function benefitBadgeText(benefit: PromotionBenefit, t: (key: string) => string): string {
    const parts = [t(benefit.benefit_type)];

    if (benefit.cash_amount) {
        parts.push(`₹${benefit.cash_amount}`);
    }

    if (benefit.order_reference) {
        parts.push(benefit.order_reference);
    }

    return parts.join(' · ');
}

function medalBadgeContent(medalType: string): { icon: JSX.Element; label: string; className: string } {
    switch (medalType) {
        case 'GOLD':
            return { icon: <span aria-hidden="true">🏆</span>, label: 'Gold', className: 'border-amber-200 bg-amber-50 text-amber-700' };
        case 'SILVER':
            return { icon: <span aria-hidden="true">🏅</span>, label: 'Silver', className: 'border-slate-200 bg-slate-50 text-slate-700' };
        case 'BRONZE':
            return { icon: <span aria-hidden="true">🥉</span>, label: 'Bronze', className: 'border-orange-200 bg-orange-50 text-orange-700' };
        case 'MERIT':
            return { icon: <span aria-hidden="true">•</span>, label: 'MERIT', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
        default:
            return { icon: <span aria-hidden="true">🏅</span>, label: medalType, className: 'border-slate-200 bg-slate-50 text-slate-700' };
    }
}

function resolveRankLabel(value: string | null, ranks: RankOption[], locale: string): string {
    if (!value) {
        return '';
    }

    const rank = ranks.find((item) => item.code === value || item.name_en === value || item.name_hi === value || item.short_name === value);

    return rank ? rankDisplay(rank, locale) : value;
}

function getCsrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
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
                const response = await fetch(`/members/${memberId}/promotions/${promotionId}/media`, {
                    headers: { Accept: 'application/json' },
                });

                if (!active) {
                    return;
                }

                if (response.ok) {
                    const json = (await response.json()) as PromotionMediaFile[] | { data: PromotionMediaFile[] };
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

            const response = await fetch(`/members/${memberId}/promotions/${promotionId}/media`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: formData,
            });

            if (response.ok) {
                const json = (await (await fetch(`/members/${memberId}/promotions/${promotionId}/media`, {
                    headers: { Accept: 'application/json' },
                })).json()) as PromotionMediaFile[] | { data: PromotionMediaFile[] };
                setFiles(Array.isArray(json) ? json : json.data);
            }
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">{t('Promotion documents')}</p>
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
                <p className="text-xs text-muted-foreground">{t('No documents uploaded.')}</p>
            ) : (
                <div className="space-y-1">
                    {files.map((file) => (
                        <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
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
        name_en: '',
        rank_order: '',
        short_name: '',
        name_hi: '',
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
                    name_en: data.name_en,
                    rank_order: Number(data.rank_order),
                    short_name: data.short_name || null,
                    name_hi: data.name_hi || null,
                    is_active: data.is_active,
                }),
            });

            if (response.status === 422) {
                const json = (await response.json()) as { errors?: Record<string, string[]> };
                const nextErrors: Record<string, string> = {};

                Object.entries(json.errors ?? {}).forEach(([field, messages]) => {
                    nextErrors[field] = messages[0] ?? t('The field is invalid.');
                });

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
                name_en: '',
                rank_order: '',
                short_name: '',
                name_hi: '',
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
                <Button type="button" variant="ghost" size="sm" className="px-0 text-xs">
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
                            <Label htmlFor="inline-rank-code">{t('Code')}</Label>
                            <Input id="inline-rank-code" value={data.code} onChange={(e) => setField('code', e.target.value)} />
                            <InputError message={errors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-order">{t('Order')}</Label>
                            <Input id="inline-rank-order" type="number" min={1} value={data.rank_order} onChange={(e) => setField('rank_order', e.target.value)} />
                            <InputError message={errors.rank_order} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-name-en">{t('Name (English)')}</Label>
                            <Input id="inline-rank-name-en" value={data.name_en} onChange={(e) => setField('name_en', e.target.value)} />
                            <InputError message={errors.name_en} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-short-name">{t('Short name')}</Label>
                            <Input id="inline-rank-short-name" value={data.short_name} onChange={(e) => setField('short_name', e.target.value)} />
                            <InputError message={errors.short_name} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-name-hi">{t('Name (Hindi)')}</Label>
                            <Input id="inline-rank-name-hi" value={data.name_hi} onChange={(e) => setField('name_hi', e.target.value)} />
                            <InputError message={errors.name_hi} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="inline-rank-active">{t('Active')}</Label>
                            <select id="inline-rank-active" className="border-input h-9 rounded-md border bg-transparent px-3 text-sm" value={data.is_active ? '1' : '0'} onChange={(e) => setField('is_active', e.target.value === '1')}>
                                <option value="1">{t('Yes')}</option>
                                <option value="0">{t('No')}</option>
                            </select>
                            <InputError message={errors.is_active} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                            {t('Create rank')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PromotionDialog({
    memberId,
    memberRank,
    ranks,
    participations,
    legacyAchievements,
    achievements,
    promotion,
    onSaved,
}: {
    memberId: number;
    memberRank: string | null;
    ranks: RankOption[];
    participations: ParticipationGroup[];
    legacyAchievements: LegacyAchievement[];
    achievements: LiveAchievement[];
    promotion?: PromotionRow;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale?: string };
    const resolvedLocale = locale ?? 'en';
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [availableRanks, setAvailableRanks] = useState(ranks);
    const [pendingPayload, setPendingPayload] = useState<{
        promotion_date: string;
        from_rank: string;
        to_rank: string;
        cash_reward_amount: string;
        cash_reward_date: string;
        cash_reward_reference: string;
        cash_reward_remarks: string;
        reason: string;
        remarks: string;
        evidences: PromotionEvidenceRef[];
    } | null>(null);
    const selectedDefaults = useMemo(() => promotion?.evidences.map((e) => evidenceKey(e.type, e.evidence_id)) ?? [], [promotion]);
    const [selected, setSelected] = useState<string[]>(selectedDefaults);
    const rankItems: ComboboxItem[] = useMemo(() => {
        const items = availableRanks.map((rank) => ({
            value: rank.code,
            label: rankDisplay(rank, resolvedLocale),
        }));

        if (memberRank && !items.some((item) => item.value === memberRank)) {
            items.unshift({ value: memberRank, label: memberRank });
        }

        return items;
    }, [availableRanks, memberRank, resolvedLocale]);

    const form = useForm({
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
        form.clearErrors();
        setPendingPayload(null);
        setConfirmOpen(false);
    }

    function handleRankCreated(rank: RankOption) {
        setAvailableRanks((prev) => {
            if (prev.some((item) => item.code === rank.code)) {
                return prev;
            }

            return [...prev, rank].sort((left, right) => (left.name_en ?? left.code).localeCompare(right.name_en ?? right.code));
        });

        form.setData('to_rank', rank.code);
    }

    const options = useMemo(() => {
        const deduped = new Map<string, { key: string; label: string; evidences: PromotionEvidenceRef[]; priority: number }>();

        for (const group of participations) {
            for (const item of group.participations) {
                const key = `event:${item.tournament.id}:${item.event.id}`;
                const evidences: PromotionEvidenceRef[] = [{ type: 'participation', id: item.id }];

                if (item.achievement?.id) {
                    evidences.push({ type: 'achievement', id: item.achievement.id });
                }

                const label = `${group.session.name} · ${item.tournament.name_hi} · ${item.event.name_hi}${item.achievement?.medal_type ? ` · ${t(item.achievement.medal_type)}` : ''}${item.position ? ` · #${item.position}` : ''}${item.achievement?.benefits && item.achievement.benefits.length > 0 ? ` · ${summarizeBenefits(item.achievement.benefits, t)}` : ''}`;
                const existing = deduped.get(key);

                if (!existing || existing.priority < 2) {
                    deduped.set(key, { key, label, evidences, priority: 2 });
                }
            }
        }

        for (const item of achievements) {
            const key = `event:${item.tournament.id}:${item.event.id}`;

            if (!deduped.has(key)) {
                deduped.set(key, {
                    key,
                    label: `${t(item.medal_type)} · ${item.tournament.name_hi} · ${item.event.name_hi}${item.benefits.length > 0 ? ` · ${t('Benefit recorded')}` : ''}`,
                    evidences: [{ type: 'achievement', id: item.id }],
                    priority: 1,
                });
            }
        }

        for (const item of legacyAchievements) {
            const key = evidenceKey('member_legacy_achievement', item.id);

            if (!deduped.has(key)) {
                deduped.set(key, {
                    key,
                    label: `${t(item.period)} · ${t(item.level)} · ${item.competition_details}`,
                    evidences: [{ type: 'member_legacy_achievement', id: item.id }],
                    priority: 0,
                });
            }
        }

        return Array.from(deduped.values()).map(({ key, label, evidences }) => ({ key, label, evidences }));
    }, [achievements, legacyAchievements, participations, t]);

    function buildPayload() {
        return {
            promotion_date: form.data.promotion_date,
            from_rank: form.data.from_rank,
            to_rank: form.data.to_rank,
            cash_reward_amount: form.data.cash_reward_amount,
            cash_reward_date: form.data.cash_reward_date,
            cash_reward_reference: form.data.cash_reward_reference,
            cash_reward_remarks: form.data.cash_reward_remarks,
            reason: form.data.reason,
            remarks: form.data.remarks,
            evidences: selected.flatMap((key) => options.find((item) => item.key === key)?.evidences ?? []),
        };
    }

    function submitPromotion(payload: ReturnType<typeof buildPayload>) {
        if (promotion) {
            router.patch(`/members/${memberId}/promotions/${promotion.id}`, payload, {
                onSuccess: () => {
                    setOpen(false);
                    setConfirmOpen(false);
                    setPendingPayload(null);
                    onSaved();
                },
            });

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
                        {t('Add promotion')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{promotion ? t('Edit promotion') : t('Add promotion')}</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Promotion date')}</Label>
                            <DatePicker value={form.data.promotion_date} onChange={(v) => form.setData('promotion_date', v)} />
                            <InputError message={form.errors.promotion_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('From rank')}</Label>
                            <Combobox
                                value={form.data.from_rank}
                                onValueChange={(v) => form.setData('from_rank', v)}
                                items={rankItems}
                                placeholder={t('Search and select rank')}
                                searchPlaceholder={t('Search ranks by code or name…')}
                                emptyMessage={t('No ranks found.')}
                            />
                            <InputError message={form.errors.from_rank} />
                        </div>
                    </div>
                        <div className="grid gap-2">
                            <Label>{t('To rank')} <span className="text-destructive">*</span></Label>
                            <Combobox
                                value={form.data.to_rank}
                                onValueChange={(v) => form.setData('to_rank', v)}
                            items={rankItems}
                            placeholder={t('Search and select rank')}
                                searchPlaceholder={t('Search ranks by code or name…')}
                                emptyMessage={t('No ranks found.')}
                            />
                            <InlineRankDialog onCreated={handleRankCreated} />
                            <InputError message={form.errors.to_rank} />
                        </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Cash reward amount')}</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.cash_reward_amount}
                                onChange={(e) => form.setData('cash_reward_amount', e.target.value)}
                            />
                            <InputError message={form.errors.cash_reward_amount} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Cash reward date')}</Label>
                            <DatePicker value={form.data.cash_reward_date} onChange={(v) => form.setData('cash_reward_date', v)} />
                            <InputError message={form.errors.cash_reward_date} />
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Cash reward reference')}</Label>
                            <Input value={form.data.cash_reward_reference} onChange={(e) => form.setData('cash_reward_reference', e.target.value)} />
                            <InputError message={form.errors.cash_reward_reference} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Cash reward remarks')}</Label>
                            <Input value={form.data.cash_reward_remarks} onChange={(e) => form.setData('cash_reward_remarks', e.target.value)} />
                            <InputError message={form.errors.cash_reward_remarks} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('Reason')}</Label>
                        <Textarea value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} rows={3} />
                        <InputError message={form.errors.reason} />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Textarea value={form.data.remarks} onChange={(e) => form.setData('remarks', e.target.value)} rows={3} />
                        <InputError message={form.errors.remarks} />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('Supporting evidence')} <span className="text-destructive">*</span></Label>
                        <div className="max-h-56 overflow-y-auto rounded-md border p-3">
                            <div className="space-y-2">
                                {options.map((opt) => (
                                    <label key={opt.key} className="flex items-start gap-2 text-sm">
                                        <Checkbox
                                            checked={selected.includes(opt.key)}
                                            onCheckedChange={(checked) => {
                                                setSelected((prev) => checked ? [...prev, opt.key] : prev.filter((k) => k !== opt.key));
                                            }}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {selected.length === 0 && <p className="text-xs text-destructive">{t('Select at least one evidence item.')}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={selected.length === 0}>{promotion ? t('Save changes') : t('Save promotion')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-lg" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{t('Confirm promotion')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                        <p className="text-muted-foreground">{t('Please review the promotion details before saving.')}</p>
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{resolveRankLabel(form.data.from_rank, ranks, resolvedLocale) || t('Unknown')}</Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge>{resolveRankLabel(form.data.to_rank, ranks, resolvedLocale) || t('Unknown')}</Badge>
                            </div>
                            <p><span className="font-medium">{t('Promotion date')}:</span> {form.data.promotion_date || '—'}</p>
                            <p><span className="font-medium">{t('Cash reward')}:</span> {form.data.cash_reward_amount ? `₹${form.data.cash_reward_amount}` : '—'}</p>
                            <p><span className="font-medium">{t('Supporting evidence')}:</span> {selected.length}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>{t('Back')}</Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSave}
                        >
                            {promotion ? t('Confirm update') : t('Confirm save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

function CashRewardDialog({
    participations,
    onSaved,
}: {
    participations: ParticipationGroup[];
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selected, setSelected] = useState<string[]>([]);
    const [data, setData] = useState({
        cash_amount: '',
        benefit_date: '',
        order_reference: '',
        remarks: '',
    });

    const rewardOptions = useMemo<RewardOption[]>(() => {
        const deduped = new Map<string, RewardOption>();

        for (const group of participations) {
            for (const item of group.participations) {
                const key = `participation:${item.id}`;
                const label = `${group.session.name} · ${item.tournament.name_hi} · ${item.event.name_hi}${item.achievement?.medal_type ? ` · ${t(item.achievement.medal_type)}` : ''}${item.position ? ` · #${item.position}` : ''}`;

                deduped.set(key, {
                    key,
                    label,
                    target: { type: 'participation', id: item.id },
                });
            }
        }

        return Array.from(deduped.values());
    }, [participations, t]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            if (selected.length === 0) {
                setErrors({ benefitable_id: t('Select at least one event.') });

                return;
            }

            const selectedOptions = selected
                .map((key) => rewardOptions.find((item) => item.key === key))
                .filter((item): item is RewardOption => Boolean(item?.target));

            if (selectedOptions.length === 0) {
                setErrors({ benefitable_id: t('Select at least one event.') });

                return;
            }

            for (const option of selectedOptions) {
                const response = await fetch(storeBenefit.url(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        benefitable_type: option.target.type,
                        benefitable_id: option.target.id,
                        benefit_type: 'CASH_AWARD',
                        cash_amount: data.cash_amount,
                        benefit_date: data.benefit_date || null,
                        order_reference: data.order_reference || null,
                        remarks: data.remarks || null,
                    }),
                });

                if (response.status === 422) {
                    const json = (await response.json()) as { errors?: Record<string, string[]> };
                    const nextErrors: Record<string, string> = {};

                    Object.entries(json.errors ?? {}).forEach(([field, messages]) => {
                        nextErrors[field] = messages[0] ?? t('The field is invalid.');
                    });

                    setErrors(nextErrors);

                    return;
                }

                if (!response.ok) {
                    throw new Error('Unable to save cash reward.');
                }
            }

            setOpen(false);
            setSelected([]);
            setData({
                cash_amount: '',
                benefit_date: '',
                order_reference: '',
                remarks: '',
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                    <Plus className="mr-1.5 size-3.5" />
                    {t('Cash reward')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Cash reward')}</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label>{t('Events')}</Label>
                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                            {rewardOptions.map((item) => (
                                <label key={item.key} className="flex items-start gap-2 text-sm">
                                    <Checkbox
                                        checked={selected.includes(item.key)}
                                        onCheckedChange={(checked) => {
                                            setSelected((prev) =>
                                                checked
                                                    ? [...prev, item.key]
                                                    : prev.filter((value) => value !== item.key),
                                            );
                                        }}
                                    />
                                    <span className="min-w-0 flex-1">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.benefitable_id} />
                        <p className="text-xs text-muted-foreground">
                            {selected.length > 0
                                ? t('{{count}} events selected').replace('{{count}}', String(selected.length))
                                : t('Select one or more events.')}
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Cash amount')}</Label>
                            <Input type="number" min="0" step="0.01" value={data.cash_amount} onChange={(e) => setData((prev) => ({ ...prev, cash_amount: e.target.value }))} />
                            <InputError message={errors.cash_amount} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Benefit date')}</Label>
                            <DatePicker value={data.benefit_date} onChange={(v) => setData((prev) => ({ ...prev, benefit_date: v }))} />
                            <InputError message={errors.benefit_date} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input value={data.order_reference} onChange={(e) => setData((prev) => ({ ...prev, order_reference: e.target.value }))} />
                            <InputError message={errors.order_reference} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Remarks')}</Label>
                            <Input value={data.remarks} onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))} />
                            <InputError message={errors.remarks} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                            {t('Save cash reward')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CashRewardEditDialog({
    reward,
    onSaved,
}: {
    reward: PromotionBenefit;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [data, setData] = useState({
        cash_amount: reward.cash_amount ?? '',
        benefit_date: reward.benefit_date ?? '',
        order_reference: reward.order_reference ?? '',
        remarks: reward.remarks ?? '',
    });

    function resetFormState() {
        setData({
            cash_amount: reward.cash_amount ?? '',
            benefit_date: reward.benefit_date ?? '',
            order_reference: reward.order_reference ?? '',
            remarks: reward.remarks ?? '',
        });
        setErrors({});
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        router.post(
            updateBenefit.url(reward.id),
            {
                _method: 'PATCH',
                cash_amount: data.cash_amount,
                benefit_date: data.benefit_date || null,
                order_reference: data.order_reference || null,
                remarks: data.remarks || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    onSaved();
                },
                onError: (nextErrors) => {
                    const mappedErrors: Record<string, string> = {};

                    Object.entries(nextErrors).forEach(([field, message]) => {
                        mappedErrors[field] = Array.isArray(message) ? message[0] ?? t('The field is invalid.') : message;
                    });

                    setErrors(mappedErrors);
                },
                onFinish: () => {
                    setSaving(false);
                },
            },
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (nextOpen) {
                    resetFormState();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    {t('Edit')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Edit cash reward')}</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label>{t('Cash amount')}</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.cash_amount}
                            onChange={(e) => setData((prev) => ({ ...prev, cash_amount: e.target.value }))}
                        />
                        <InputError message={errors.cash_amount} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Benefit date')}</Label>
                            <DatePicker value={data.benefit_date} onChange={(v) => setData((prev) => ({ ...prev, benefit_date: v }))} />
                            <InputError message={errors.benefit_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input value={data.order_reference} onChange={(e) => setData((prev) => ({ ...prev, order_reference: e.target.value }))} />
                            <InputError message={errors.order_reference} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Input value={data.remarks} onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))} />
                        <InputError message={errors.remarks} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                            {t('Save changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function PromotionsTab({ memberId, memberRank, ranks, promotions, participations = [], legacyAchievements = [], achievements, onSaved }: Props) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale?: string };
    const resolvedLocale = locale ?? 'en';

    function evidenceSummary(evidence: PromotionEvidence): string {
        if (evidence.type === 'participation') {
            for (const group of participations) {
                const item = group.participations.find((p) => p.id === evidence.evidence_id);

                if (item) {
                    const benefitSummary = item.achievement?.benefits?.length
                        ? ` · ${summarizeBenefits(item.achievement.benefits, t)}`
                        : '';
                    const medalSummary = item.achievement?.medal_type ? ` · ${t(item.achievement.medal_type)}` : '';
                    const positionSummary = item.position ? ` · #${item.position}` : '';

                    return `${group.session.name} · ${item.tournament.name_hi} · ${item.event.name_hi} · ${item.tournament.date_from ?? t('No date')}${item.event.gender_class ? ` · ${item.event.gender_class}` : ''}${medalSummary}${positionSummary}${benefitSummary}`;
                }
            }

            return `${t('Participation')} #${evidence.evidence_id}`;
        }

        if (evidence.type === 'member_legacy_achievement') {
            const item = legacyAchievements.find((a) => a.id === evidence.evidence_id);

            return item
                ? `${t(item.period)} · ${t(item.level)} · ${item.competition_details}${item.event_date ? ` · ${item.event_date}` : ''}${item.venue ? ` · ${item.venue}` : ''}${item.medal_type ? ` · ${t(item.medal_type)}` : ''}`
                : `${t('Legacy achievement')} #${evidence.evidence_id}`;
        }

        const item = achievements.find((a) => a.id === evidence.evidence_id);

        return item
            ? `${medalBadgeContent(item.medal_type).label} · ${item.tournament.name_hi} · ${item.event.name_hi}${item.tournament.tier_code ? ` · ${item.tournament.tier_code}` : ''}${item.benefits.length > 0 ? ` · ${summarizeBenefits(item.benefits, t)}` : ''}`
            : `${t('Achievement')} #${evidence.evidence_id}`;
    }

    function labelForEvidence(evidence: PromotionEvidence): JSX.Element {
        if (evidence.type === 'achievement') {
            const item = achievements.find((a) => a.id === evidence.evidence_id);

            if (item) {
                const medal = medalBadgeContent(item.medal_type);

                return (
                    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-4 ${medal.className}`}>
                        {medal.icon}
                        <span className="truncate">{medal.label} {item.tournament.name_hi} · {item.event.name_hi}</span>
                    </span>
                );
            }
        }

        return <span>{evidenceSummary(evidence)}</span>;
    }

    function benefitsForPromotion(promotion: PromotionRow): PromotionBenefit[] {
        const benefits = new Map<number, PromotionBenefit>();

        for (const evidence of promotion.evidences) {
            if (evidence.type === 'achievement') {
                const item = achievements.find((achievement) => achievement.id === evidence.evidence_id);

                if (item) {
                    for (const benefit of item.benefits) {
                        benefits.set(benefit.id, {
                            id: benefit.id,
                            benefit_type: benefit.benefit_type,
                            cash_amount: benefit.cash_amount,
                            benefit_date: null,
                            order_reference: null,
                            remarks: null,
                            source_label: undefined,
                        });
                    }
                }
            }

            if (evidence.type === 'participation') {
                for (const group of participations) {
                    const item = group.participations.find((participation) => participation.id === evidence.evidence_id);

                    if (item?.achievement?.benefits?.length) {
                        for (const benefit of item.achievement.benefits) {
                            benefits.set(benefit.id, {
                                    id: benefit.id,
                                    benefit_type: benefit.benefit_type,
                                    cash_amount: benefit.cash_amount,
                                    benefit_date: benefit.benefit_date,
                                    order_reference: benefit.order_reference,
                                    remarks: benefit.remarks,
                                    source_label: `${group.session.name} · ${item.tournament.name_hi} · ${item.event.name_hi}`,
                            });
                        }
                    }
                }
            }
        }

        return Array.from(benefits.values());
    }

    function cashRewardsForEvents(): PromotionBenefit[] {
        const seen = new Map<number, PromotionBenefit>();
        const promotionCashRewards = new Set<number>();

        for (const promotion of promotions ?? []) {
            if (promotion.cash_reward_amount) {
                promotionCashRewards.add(promotion.id);
            }
        }

        for (const group of participations) {
            for (const item of group.participations) {
                if (!item.achievement?.benefits?.length) {
                    continue;
                }

                for (const benefit of item.achievement.benefits) {
                    if (benefit.benefit_type !== 'CASH_AWARD') {
                        continue;
                    }

                    if (!seen.has(benefit.id) && benefit.benefit_type === 'CASH_AWARD') {
                        seen.set(benefit.id, {
                            id: benefit.id,
                            benefit_type: benefit.benefit_type,
                            cash_amount: benefit.cash_amount,
                            benefit_date: benefit.benefit_date,
                            order_reference: benefit.order_reference,
                            remarks: benefit.remarks,
                            source_label: `${group.session.name} · ${item.tournament.name_hi} · ${item.event.name_hi}`,
                        });
                    }
                }
            }
        }

        return Array.from(seen.values());
    }

    function handleDelete(id: number) {
        router.delete(`/members/${memberId}/promotions/${id}`, {
            onSuccess: onSaved,
        });
    }

    return (
        <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-medium">{t('Promotions & rewards')}</h3>
                    <p className="text-xs text-muted-foreground">
                        {t('Current rank')}: {memberRank ? resolveRankLabel(memberRank, ranks, resolvedLocale) : t('Unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('Promotion decisions based on multiple achievements and performance evidence.')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <CashRewardDialog participations={participations} onSaved={onSaved} />
                    <PromotionDialog memberId={memberId} memberRank={memberRank} ranks={ranks} participations={participations} legacyAchievements={legacyAchievements} achievements={achievements} onSaved={onSaved} />
                </div>
            </div>

            {(promotions ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">{t('No promotions yet.')}</p>
            ) : (
                <div className="space-y-3">
                    {(promotions ?? []).map((promotion) => (
                        <div key={promotion.id} className="rounded-lg border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{resolveRankLabel(promotion.from_rank, ranks, resolvedLocale) || t('Unknown')}</Badge>
                                        <span className="text-muted-foreground">→</span>
                                        <Badge>{resolveRankLabel(promotion.to_rank, ranks, resolvedLocale)}</Badge>
                                        {promotion.promotion_date && <span className="text-xs text-muted-foreground">{promotion.promotion_date}</span>}
                                    </div>
                                    {(promotion.cash_reward_amount || promotion.cash_reward_date) && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            {promotion.cash_reward_amount && <Badge variant="secondary">{t('Cash reward')} {promotion.cash_reward_amount}</Badge>}
                                            {promotion.cash_reward_date && <span>{promotion.cash_reward_date}</span>}
                                            {promotion.cash_reward_reference && <span>{promotion.cash_reward_reference}</span>}
                                        </div>
                                    )}
                                    {promotion.reason && <p className="text-sm">{promotion.reason}</p>}
                                    {promotion.remarks && <p className="text-xs text-muted-foreground">{promotion.remarks}</p>}
                                    {promotion.cash_reward_remarks && <p className="text-xs text-muted-foreground">{promotion.cash_reward_remarks}</p>}
                                    <div className="flex flex-wrap gap-1.5">
                                        {promotion.evidences.map((evidence) => (
                                            <Badge key={evidence.id} variant="secondary" className="text-xs">
                                                {labelForEvidence(evidence)}
                                            </Badge>
                                        ))}
                                    </div>
                                    {(() => {
                                        const promotionBenefits = benefitsForPromotion(promotion);

                                        return promotionBenefits.length > 0 ? (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">{t('Benefits')}</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {promotionBenefits.map((benefit) => (
                                                        <Badge key={benefit.id} variant="outline" className="text-xs">
                                                            {benefitBadgeText(benefit, t)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                    <PromotionDocuments memberId={memberId} promotionId={promotion.id} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <PromotionDialog memberId={memberId} memberRank={memberRank} ranks={ranks} participations={participations} legacyAchievements={legacyAchievements} achievements={achievements} promotion={promotion} onSaved={onSaved} />
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(promotion.id)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                            {promotion.recorded_by_name && <p className="mt-2 text-xs text-muted-foreground">{promotion.recorded_by_name}</p>}
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">{t('Cash rewards')}</h4>
                    <p className="text-xs text-muted-foreground">{t('Cash rewards recorded against events.')}</p>
                </div>
                {cashRewardsForEvents().length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('No cash rewards yet.')}</p>
                ) : (
                    <div className="space-y-2">
                                {cashRewardsForEvents().map((reward) => (
                                    <div key={reward.id} className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3">
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">{t('Cash reward')} {reward.cash_amount ? `₹${reward.cash_amount}` : ''}</Badge>
                                                {reward.benefit_date && <span className="text-xs text-muted-foreground">{reward.benefit_date}</span>}
                                    </div>
                                    {reward.source_label && <p className="text-xs text-muted-foreground">{reward.source_label}</p>}
                                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                        {reward.order_reference && <span>{reward.order_reference}</span>}
                                        {reward.remarks && <span>{reward.remarks}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CashRewardEditDialog reward={reward} onSaved={onSaved} />
                                    <p className="text-xs text-muted-foreground">{t('Edit from the Events tab')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
