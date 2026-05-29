import { router, useForm } from '@inertiajs/react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    store as storeBenefit,
    destroy as destroyBenefit,
} from '@/actions/App/Http/Controllers/AchievementBenefitController';
import {
    store as storeAchievement,
    destroy as destroyAchievement,
} from '@/actions/App/Http/Controllers/MemberLegacyAchievementController';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Benefit = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

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
    benefits: Benefit[];
};

type Props = {
    member: { id: number };
    legacyAchievements: LegacyAchievement[] | undefined;
};

const MEDAL_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    GOLD: 'default',
    SILVER: 'secondary',
    BRONZE: 'outline',
    MERIT: 'outline',
    CERTIFICATE: 'outline',
};

const LEVELS = ['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER'] as const;
const MEDALS = ['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'] as const;
const BENEFIT_TYPES = [
    'PROMOTION',
    'OUT_OF_TURN_PROMOTION',
    'CASH_AWARD',
    'COMMENDATION',
    'NONE',
    'OTHER',
] as const;

function AddAchievementDialog({
    member,
    period,
}: {
    member: { id: number };
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT';
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        period,
        level: '',
        competition_details: '',
        event_date: '',
        venue: '',
        sport_discipline: '',
        event: '',
        medal_type: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeAchievement.url(member), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
                form.setData('period', period);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="size-4 mr-1" />
                    {t('Add achievement')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add achievement')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid gap-2">
                        <Label>
                            {t('Level')} <span className="text-destructive">*</span>
                        </Label>
                        <Select value={form.data.level} onValueChange={(v) => form.setData('level', v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('Select level')} />
                            </SelectTrigger>
                            <SelectContent>
                                {LEVELS.map((l) => (
                                    <SelectItem key={l} value={l}>
                                        {t(l)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.level} />
                    </div>

                    <div className="grid gap-2">
                        <Label>
                            {t('Competition details')} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            value={form.data.competition_details}
                            onChange={(e) => form.setData('competition_details', e.target.value)}
                            rows={3}
                        />
                        <InputError message={form.errors.competition_details} />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Sport discipline')}</Label>
                            <Input
                                value={form.data.sport_discipline}
                                onChange={(e) => form.setData('sport_discipline', e.target.value)}
                                maxLength={100}
                            />
                            <InputError message={form.errors.sport_discipline} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Event')}</Label>
                            <Input
                                value={form.data.event}
                                onChange={(e) => form.setData('event', e.target.value)}
                                maxLength={100}
                            />
                            <InputError message={form.errors.event} />
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Event date')}</Label>
                            <DatePicker
                                value={form.data.event_date}
                                onChange={(v) => form.setData('event_date', v)}
                            />
                            <InputError message={form.errors.event_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Venue')}</Label>
                            <Input
                                value={form.data.venue}
                                onChange={(e) => form.setData('venue', e.target.value)}
                                maxLength={255}
                            />
                            <InputError message={form.errors.venue} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('Medal')}</Label>
                        <Select
                            value={form.data.medal_type || '__none__'}
                            onValueChange={(v) => form.setData('medal_type', v === '__none__' ? '' : v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('Select medal')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">{t('No medal')}</SelectItem>
                                {MEDALS.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {t(m)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.medal_type} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t('Save achievement')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddBenefitDialog({ achievement }: { achievement: LegacyAchievement }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        benefitable_type: 'member_legacy_achievement',
        benefitable_id: String(achievement.id),
        benefit_type: '',
        promoted_from_rank: '',
        promoted_to_rank: '',
        cash_amount: '',
        benefit_date: '',
        order_reference: '',
        remarks: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeBenefit.url(), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
                form.setData('benefitable_type', 'member_legacy_achievement');
                form.setData('benefitable_id', String(achievement.id));
            },
        });
    }

    const isPromotion =
        form.data.benefit_type === 'PROMOTION' ||
        form.data.benefit_type === 'OUT_OF_TURN_PROMOTION';
    const isCash = form.data.benefit_type === 'CASH_AWARD';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                    <Plus className="size-3 mr-1" />
                    {t('Add benefit')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add benefit')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid gap-2">
                        <Label>
                            {t('Benefit type')} <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.data.benefit_type}
                            onValueChange={(v) => form.setData('benefit_type', v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('Select benefit type')} />
                            </SelectTrigger>
                            <SelectContent>
                                {BENEFIT_TYPES.map((bt) => (
                                    <SelectItem key={bt} value={bt}>
                                        {t(bt)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.benefit_type} />
                    </div>

                    {isPromotion && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Promoted from rank')}</Label>
                                <Input
                                    value={form.data.promoted_from_rank}
                                    onChange={(e) => form.setData('promoted_from_rank', e.target.value)}
                                    maxLength={100}
                                />
                                <InputError message={form.errors.promoted_from_rank} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Promoted to rank')}</Label>
                                <Input
                                    value={form.data.promoted_to_rank}
                                    onChange={(e) => form.setData('promoted_to_rank', e.target.value)}
                                    maxLength={100}
                                />
                                <InputError message={form.errors.promoted_to_rank} />
                            </div>
                        </div>
                    )}

                    {isCash && (
                        <div className="grid gap-2">
                            <Label>{t('Cash amount')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.cash_amount}
                                onChange={(e) => form.setData('cash_amount', e.target.value)}
                            />
                            <InputError message={form.errors.cash_amount} />
                        </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Benefit date')}</Label>
                            <DatePicker
                                value={form.data.benefit_date}
                                onChange={(v) => form.setData('benefit_date', v)}
                            />
                            <InputError message={form.errors.benefit_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input
                                value={form.data.order_reference}
                                onChange={(e) => form.setData('order_reference', e.target.value)}
                                maxLength={255}
                            />
                            <InputError message={form.errors.order_reference} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Textarea
                            value={form.data.remarks}
                            onChange={(e) => form.setData('remarks', e.target.value)}
                            rows={2}
                        />
                        <InputError message={form.errors.remarks} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t('Save benefit')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AchievementRow({ achievement, member }: { achievement: LegacyAchievement; member: { id: number } }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    function handleDeleteAchievement() {
        if (!confirm(t('Delete achievement?'))) {
            return;
        }

        router.delete(destroyAchievement.url(member, achievement));
    }

    function handleDeleteBenefit(benefitId: number) {
        if (!confirm(t('Delete benefit?'))) {
            return;
        }

        router.delete(destroyBenefit.url(benefitId));
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="flex items-start justify-between gap-3 py-3 px-4">
                <CollapsibleTrigger asChild>
                    <button className="flex items-start gap-2 text-left flex-1 min-w-0">
                        <ChevronDown
                            className={`size-4 mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                        <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium leading-tight">{achievement.competition_details}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{t(achievement.level)}</span>
                                {achievement.event_date && <span>{achievement.event_date}</span>}
                                {achievement.sport_discipline && <span>{achievement.sport_discipline}</span>}
                                {achievement.event && <span>{achievement.event}</span>}
                                {achievement.venue && <span>{achievement.venue}</span>}
                            </div>
                        </div>
                    </button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2 shrink-0">
                    {achievement.medal_type && (
                        <Badge variant={MEDAL_VARIANT[achievement.medal_type] ?? 'outline'}>
                            {t(achievement.medal_type)}
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={handleDeleteAchievement}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            <CollapsibleContent>
                <div className="px-4 pb-3 pt-0 space-y-2 border-t">
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('Benefits')}
                        </span>
                        <AddBenefitDialog achievement={achievement} />
                    </div>

                    {achievement.benefits.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">{t('No benefits recorded.')}</p>
                    ) : (
                        <div className="space-y-1">
                            {achievement.benefits.map((b) => (
                                <div
                                    key={b.id}
                                    className="flex items-start justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <Badge variant="outline" className="text-xs">
                                            {t(b.benefit_type)}
                                        </Badge>
                                        {(b.promoted_from_rank || b.promoted_to_rank) && (
                                            <p className="text-muted-foreground">
                                                {b.promoted_from_rank} → {b.promoted_to_rank}
                                            </p>
                                        )}
                                        {b.cash_amount && (
                                            <p className="text-muted-foreground">₹{b.cash_amount}</p>
                                        )}
                                        {b.benefit_date && (
                                            <p className="text-muted-foreground">{b.benefit_date}</p>
                                        )}
                                        {b.order_reference && (
                                            <p className="text-muted-foreground">{b.order_reference}</p>
                                        )}
                                        {b.remarks && (
                                            <p className="text-muted-foreground">{b.remarks}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-destructive hover:text-destructive shrink-0"
                                        onClick={() => handleDeleteBenefit(b.id)}
                                    >
                                        <Trash2 className="size-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function PeriodSection({
    period,
    achievements,
    member,
}: {
    period: 'PRE_RECRUITMENT' | 'POST_RECRUITMENT';
    achievements: LegacyAchievement[];
    member: { id: number };
}) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="text-sm font-semibold">
                    {period === 'PRE_RECRUITMENT' ? t('Pre-recruitment') : t('Post-recruitment')}
                </h4>
                <AddAchievementDialog member={member} period={period} />
            </div>

            {achievements.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">{t('No legacy achievements.')}</p>
            ) : (
                <div className="divide-y">
                    {achievements.map((a) => (
                        <AchievementRow key={a.id} achievement={a} member={member} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function LegacyAchievementsTab({ member, legacyAchievements }: Props) {
    const preRecruitment = (legacyAchievements ?? []).filter((a) => a.period === 'PRE_RECRUITMENT');
    const postRecruitment = (legacyAchievements ?? []).filter((a) => a.period === 'POST_RECRUITMENT');

    return (
        <div className="space-y-4">
            <PeriodSection period="PRE_RECRUITMENT" achievements={preRecruitment} member={member} />
            <PeriodSection period="POST_RECRUITMENT" achievements={postRecruitment} member={member} />
        </div>
    );
}
