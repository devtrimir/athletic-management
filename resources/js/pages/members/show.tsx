import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    useHttp,
    usePage,
} from '@inertiajs/react';
import { Award, Camera, Download, Images, Medal, Minus, Trophy, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MemberAchievementsController from '@/actions/App/Http/Controllers/Api/V1/MemberAchievementsController';
import MemberParticipationsController from '@/actions/App/Http/Controllers/Api/V1/MemberParticipationsController';
import { show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import {
    edit as editMember,
    index as membersIndex,
} from '@/actions/App/Http/Controllers/MemberController';
import { show as exportMember } from '@/actions/App/Http/Controllers/MemberExportController';
import {
    store as storeMemberPhoto,
    destroy as destroyMemberPhoto,
} from '@/actions/App/Http/Controllers/MemberPhotoController';
import { show as showTeam } from '@/actions/App/Http/Controllers/TeamController';
import { show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { AliasInlineForm } from '@/components/members/alias-inline-form';
import { LegacyAchievementsTab } from '@/components/members/legacy-achievements-tab';
import { MemberMediaTab } from '@/components/members/member-media-tab';
import { ParticipationMediaSheet } from '@/components/members/participation-media-sheet';
import { PromotionsTab } from '@/components/members/promotions-tab';
import { StatusChangeModal } from '@/components/members/status-change-modal';
import { ChangeLog } from '@/components/shared/change-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import memberAuditLog from '@/routes/members/audit-log';

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    father_name_hi: string | null;
    rank: string | null;
    designation: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    home_district: { id: number; name_hi: string } | null;
    posting_district: { id: number; name_hi: string } | null;
    current_unit: { id: number; name_hi: string } | null;
    photo_path: string | null;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    home_address: string | null;
    recruitment_type: string | null;
    sport: { id: number; name_hi: string; name_en: string } | null;
    playable_sports: { id: number; name_hi: string; name_en: string }[];
    sport_event: string | null;
    other_notes: string | null;
    team_since: string | null;
};

type StatusEntry = {
    id: number;
    status: string;
    effective_on: string;
    reason_hi: string | null;
    recorded_by_name: string | null;
};
type Alias = { id: number; alias_hi: string; source: string };
type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name_hi: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type ParticipationEntry = {
    id: number;
    position: number | null;
    media_files_count: number;
    tournament: {
        id: number;
        name_hi: string;
        tier_code: string | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
        session_id: number | null;
        sport: { id: number; name_hi: string; name_en: string } | null;
    };
    event: {
        id: number;
        name_hi: string;
        gender_class: string;
        discipline: string | null;
        weight_category: string | null;
        sport: { id: number; name_hi: string; name_en: string } | null;
    };
    team: { id: number; name_hi: string } | null;
    achievement: {
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        benefits?: AchievementBenefitRow[];
    } | null;
};

type ParticipationGroup = {
    session: { id: number; name: string; is_current?: boolean };
    participations: ParticipationEntry[];
};

type AchievementBenefitRow = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
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
    evidences: { id: number; type: string; evidence_id: number }[];
};

type RankOption = { code: string; name_hi: string; name_en: string; short_name: string | null };

type AchievementsData = {
    summary: { GOLD: number; SILVER: number; BRONZE: number; MERIT: number };
    achievements: Array<{
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        session: { id: number; name: string };
        tournament: { id: number; name_hi: string; tier_code: string | null; venue: string | null; date_from: string | null; date_to: string | null; sport: { id: number; name_hi: string; name_en: string } | null };
        event: { id: number; name_hi: string };
        benefits: AchievementBenefitRow[];
    }>;
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
    benefits: Array<{
        id: number;
        benefit_type: string;
        promoted_from_rank: string | null;
        promoted_to_rank: string | null;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }>;
};

const ALL_COLUMNS: { key: string; label: string }[] = [
    // { key: 'member_code', label: 'Member code' },
    { key: 'pno', label: 'PNO' },
    { key: 'full_name_hi', label: 'Name (Hindi)' },
    { key: 'full_name_en', label: 'Name (English)' },
    { key: 'father_name_hi', label: "Father's name" },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'rank', label: 'Rank' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'current_status', label: 'Status' },
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'unit', label: 'Unit' },
    { key: 'home_district', label: 'Home district' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'appointment', label: 'Appointment' },
    { key: 'sport_event', label: 'Sport event' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

export default function MembersShow({
    member,
    statusHistory,
    aliases,
    memberTeams,
    legacyAchievements,
    promotions,
    ranks,
}: {
    member: Member;
    statusHistory?: StatusEntry[];
    aliases?: Alias[];
    memberTeams?: MemberTeamRow[];
    legacyAchievements?: LegacyAchievement[];
    promotions?: PromotionRow[];
    ranks?: RankOption[];
}) {
    const [activeTab, setActiveTab] = useState('overview');
    const [participations, setParticipations] = useState<
        ParticipationGroup[] | null
    >(null);
    const [achievementsData, setAchievementsData] =
        useState<AchievementsData | null>(null);
    const { get: getParticipations, processing: loadingParticipations } =
        useHttp<Record<string, never>, { data: ParticipationGroup[] }>({});
    const { get: getAchievements, processing: loadingAchievements } = useHttp<
        Record<string, never>,
        { data: AchievementsData }
    >({});
    const participationsFetched = useRef(false);
    const achievementsFetched = useRef(false);
    const promotionsFetched = useRef(false);
    const memberId = member.id;
    const permissions = usePage().props.auth.permissions;
    const canDeleteMedia = permissions.includes('media.delete');
    const canUploadMedia = permissions.includes('media.upload');
    const [mediaParticipationId, setMediaParticipationId] = useState<{
        id: number;
        eventName: string;
    } | null>(null);
    const refreshMemberHistory = useCallback(() => {
        participationsFetched.current = false;
        achievementsFetched.current = false;
        promotionsFetched.current = false;
        setParticipations(null);
        setAchievementsData(null);

        router.reload({
            only: ['member', 'promotions', 'auditLog'],
            preserveScroll: true,
            preserveState: true,
        });

        getParticipations(MemberParticipationsController.url(memberId), {
            onSuccess: (res) => {
                const r = res as unknown as { data: ParticipationGroup[] };
                setParticipations(r?.data ?? []);
            },
            onError: () => setParticipations([]),
        });

        getAchievements(MemberAchievementsController.url(memberId), {
            onSuccess: (res) => {
                const r = res as unknown as { data: AchievementsData };
                setAchievementsData(
                    r?.data ?? {
                        summary: {
                            GOLD: 0,
                            SILVER: 0,
                            BRONZE: 0,
                            MERIT: 0,
                        },
                        achievements: [],
                    },
                );
            },
            onError: () =>
                setAchievementsData({
                    summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 },
                    achievements: [],
                }),
        });
    }, [getAchievements, getParticipations, memberId]);

    useEffect(() => {
        if ((activeTab === 'events' || activeTab === 'promotions') && !participationsFetched.current) {
            participationsFetched.current = true;
            getParticipations(MemberParticipationsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: ParticipationGroup[] };
                    setParticipations(r?.data ?? []);
                },
                onError: () => setParticipations([]),
            });
        }

        if ((activeTab === 'events' || activeTab === 'promotions') && !achievementsFetched.current) {
            achievementsFetched.current = true;
            getAchievements(MemberAchievementsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: AchievementsData };
                    setAchievementsData(
                        r?.data ?? {
                            summary: {
                                GOLD: 0,
                                SILVER: 0,
                                BRONZE: 0,
                                MERIT: 0,
                            },
                            achievements: [],
                        },
                    );
                },
                onError: () =>
                    setAchievementsData({
                        summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 },
                        achievements: [],
                    }),
            });
        }

        if ((activeTab === 'events' || activeTab === 'promotions') && !promotionsFetched.current) {
            promotionsFetched.current = true;
            router.reload({
                only: ['promotions'],
                preserveScroll: true,
                preserveState: true,
            });
        }
    }, [activeTab, memberId, getParticipations, getAchievements]);
    const [mediaKey] = useState(0);
    const { t } = useTranslation();
    const { locale } = usePage().props;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: member.full_name_hi },
        ],
    });

    const [statusOpen, setStatusOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );
    const [eventSearch, setEventSearch] = useState('');
    const [sessionFilter, setSessionFilter] = useState<'all' | 'current' | string>('current');
    const [medalFilter, setMedalFilter] = useState<'all' | 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | 'none'>('all');
    const [tierFilter, setTierFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [benefitFilter, setBenefitFilter] = useState<'all' | 'benefit' | 'promotion' | 'cash' | 'both'>('all');
    const promotionLookup = useMemo(() => {
        const map = new Map<string, PromotionRow[]>();

        for (const promotion of promotions ?? []) {
            for (const evidence of promotion.evidences) {
                const key = `${evidence.type}:${evidence.evidence_id}`;
                const current = map.get(key) ?? [];

                current.push(promotion);
                map.set(key, current);
            }
        }

        return map;
    }, [promotions]);

    const promotionSummary = useCallback((promotion: PromotionRow): string => {
        const parts: string[] = [];

        if (promotion.from_rank || promotion.to_rank) {
            const fromRank = promotion.from_rank ?? t('Unknown');
            const toRank = promotion.to_rank ?? t('Unknown');

            parts.push(`${fromRank} → ${toRank}`);
        }

        return parts.join(' · ');
    }, [t]);

    const promotionRewardMeta = useCallback((promotion: PromotionRow): string[] => {
        const parts: string[] = [];

        if (promotion.cash_reward_amount) {
            parts.push(`₹${promotion.cash_reward_amount}`);
        }

        if (promotion.cash_reward_date) {
            parts.push(promotion.cash_reward_date);
        }

        if (promotion.cash_reward_reference) {
            parts.push(promotion.cash_reward_reference);
        }

        return parts;
    }, []);

    const filteredSessionGroups = useMemo(() => {
        const isCurrentSession = (value: unknown): boolean => value === true || value === 1 || value === '1';

        const matchesFilters = (item: ParticipationEntry): boolean => {
            const search = eventSearch.trim().toLowerCase();
            const promotionMatches =
                (promotionLookup.get(`participation:${item.id}`)?.length ?? 0) +
                (item.achievement?.id ? promotionLookup.get(`achievement:${item.achievement.id}`)?.length ?? 0 : 0);
            const hasBenefit = !!item.achievement?.benefits?.length;
            const hasPromotion = promotionMatches > 0;
            const hasCashReward =
                (promotionLookup.get(`participation:${item.id}`)?.some((promotion) => Boolean(promotion.cash_reward_amount)) ?? false) ||
                (item.achievement?.id ? promotionLookup.get(`achievement:${item.achievement.id}`)?.some((promotion) => Boolean(promotion.cash_reward_amount)) ?? false : false);

            if (medalFilter !== 'all') {
                if (medalFilter === 'none' && item.achievement?.medal_type) {
                    return false;
                }

                if (medalFilter !== 'none' && item.achievement?.medal_type !== medalFilter) {
                    return false;
                }
            }

            if (tierFilter !== 'all' && item.tournament.tier_code !== tierFilter) {
                return false;
            }

            if (classFilter !== 'all' && item.event.gender_class !== classFilter) {
                return false;
            }

            if (benefitFilter === 'benefit' && !hasBenefit) {
                return false;
            }

            if (benefitFilter === 'promotion' && !hasPromotion) {
                return false;
            }

            if (benefitFilter === 'cash' && !hasCashReward) {
                return false;
            }

            if (benefitFilter === 'both' && (!hasBenefit || !hasPromotion)) {
                return false;
            }

            if (!search) {
                return true;
            }

            const haystack = [
                item.tournament.name_hi,
                item.event.name_hi,
                item.tournament.tier_code ?? '',
                item.event.gender_class ?? '',
                item.achievement?.medal_type ?? '',
                item.achievement?.benefits?.map((benefit) => benefit.benefit_type).join(' ') ?? '',
                promotionLookup.get(`participation:${item.id}`)?.map((promotion) => promotionSummary(promotion)).join(' ') ?? '',
                item.achievement?.id ? promotionLookup.get(`achievement:${item.achievement.id}`)?.map((promotion) => promotionSummary(promotion)).join(' ') ?? '' : '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(search);
        };

        return (participations ?? [])
            .filter((group) => {
                if (sessionFilter === 'current') {
                    return isCurrentSession(group.session.is_current);
                }

                if (sessionFilter !== 'all' && sessionFilter !== 'current') {
                    return String(group.session.id) === sessionFilter;
                }

                return true;
            })
            .map((group) => ({
                ...group,
                participations: group.participations.filter(matchesFilters),
            }))
            .filter((group) => group.participations.length > 0)
            .sort((a, b) => Number(isCurrentSession(b.session.is_current)) - Number(isCurrentSession(a.session.is_current)));
    }, [benefitFilter, classFilter, eventSearch, medalFilter, participations, promotionLookup, promotionSummary, sessionFilter, tierFilter]);

    const eventPromotionRows = useCallback((participation: ParticipationEntry): PromotionRow[] => {
        const seen = new Map<number, PromotionRow>();

        for (const promotion of promotionLookup.get(`participation:${participation.id}`) ?? []) {
            seen.set(promotion.id, promotion);
        }

        if (participation.achievement?.id) {
            for (const promotion of promotionLookup.get(`achievement:${participation.achievement.id}`) ?? []) {
                seen.set(promotion.id, promotion);
            }
        }

        return Array.from(seen.values());
    }, [promotionLookup]);

    function eventBadgeClass(kind: 'session' | 'tier' | 'class' | 'medal' | 'promotion' | 'benefit' | 'cash'): string {
        const base = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium';

        switch (kind) {
            case 'session':
                return `${base} border-slate-200 bg-slate-50 text-slate-700`;
            case 'tier':
                return `${base} border-indigo-200 bg-indigo-50 text-indigo-700`;
            case 'class':
                return `${base} border-amber-200 bg-amber-50 text-amber-800`;
            case 'medal':
                return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
            case 'promotion':
                return `${base} border-blue-200 bg-blue-50 text-blue-700`;
            case 'benefit':
                return `${base} border-violet-200 bg-violet-50 text-violet-700`;
            case 'cash':
                return `${base} border-rose-200 bg-rose-50 text-rose-700`;
        }
    }

    function medalBadgeContent(medalType: string): { icon: JSX.Element; label: string; className: string } {
        switch (medalType) {
            case 'GOLD':
                return { icon: <Trophy className="h-3.5 w-3.5" />, label: t('Gold'), className: 'border-amber-200 bg-amber-50 text-amber-700' };
            case 'SILVER':
                return { icon: <Award className="h-3.5 w-3.5" />, label: t('Silver'), className: 'border-slate-200 bg-slate-50 text-slate-700' };
            case 'BRONZE':
                return { icon: <Medal className="h-3.5 w-3.5" />, label: t('Bronze'), className: 'border-orange-200 bg-orange-50 text-orange-700' };
            case 'MERIT':
                return { icon: <Minus className="h-3.5 w-3.5" />, label: t('MERIT'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
            default:
                return { icon: <Medal className="h-3.5 w-3.5" />, label: t(medalType), className: 'border-slate-200 bg-slate-50 text-slate-700' };
        }
    }

    function handlePrint(): void {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const getValue = (key: string): string => {
            switch (key) {
                case 'member_code':
                    return member.member_code ?? '';
                case 'pno':
                    return member.pno ?? '';
                case 'full_name_hi':
                    return member.full_name_hi ?? '';
                case 'full_name_en':
                    return member.full_name_en ?? '';
                case 'father_name_hi':
                    return member.father_name_hi ?? '';
                case 'gender':
                    return member.gender === 'M'
                        ? t('Male')
                        : member.gender === 'F'
                          ? t('Female')
                          : t('Other gender');
                case 'dob':
                    return member.dob ?? '';
                case 'rank':
                    return member.rank ?? '';
                case 'mobile':
                    return member.mobile ?? '';
                case 'current_status':
                    return t(member.current_status);
                case 'player_category':
                    return member.player_category ?? '';
                case 'player_level':
                    return member.player_level ?? '';
                case 'unit':
                    return member.current_unit?.name_hi ?? '';
                case 'home_district':
                    return member.home_district?.name_hi ?? '';
                case 'joining_date':
                    return member.joining_date ?? '';
                case 'blood_group':
                    return member.blood_group ?? '';
                case 'caste':
                    return member.caste ?? '';
                case 'appointment':
                    return member.appointment ?? '';
                case 'sport_event':
                    return member.sport_event ?? '';
                case 'promotion_date':
                    return member.promotion_date ?? '';
                case 'team_since':
                    return member.team_since ?? '';
                default:
                    return '';
            }
        };
        const headers = cols
            .map(
                (c) =>
                    `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;text-align:left">${t(c.label)}</th>`,
            )
            .join('');
        const cells = cols
            .map(
                (c) =>
                    `<td style="border:1px solid #ccc;padding:6px 10px">${getValue(c.key)}</td>`,
            )
            .join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${member.full_name_hi}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}@media print{@page{size:landscape}}</style></head><body><h2 style="margin-bottom:12px">${member.full_name_hi}</h2><table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=600');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
        win.onload = () => {
            win.print();
            win.close();
        };
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportMember.url(member) + '?' + params.toString();
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">
                {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );

    return (
        <>
            <Head title={member.full_name_hi} />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                        {/* Photo */}
                        <div className="shrink-0">
                            {member.photo_path ? (
                                <div className="group relative size-20 overflow-hidden rounded-xl border bg-muted">
                                    <img
                                        src={`/storage/${member.photo_path}`}
                                        alt={member.full_name_hi}
                                        className="size-full object-cover"
                                    />
                                    <button
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() =>
                                            router.delete(
                                                destroyMemberPhoto.url(member),
                                            )
                                        }
                                    >
                                        {t('Remove photo')}
                                    </button>
                                </div>
                            ) : (
                                <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted transition-colors hover:bg-muted/80">
                                    <span className="px-1 text-center text-xs leading-tight text-muted-foreground">
                                        {t('Upload photo')}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) {
                                                return;
                                            }

                                            const fd = new FormData();
                                            fd.append('photo', file);
                                            router.post(
                                                storeMemberPhoto.url(member),
                                                fd,
                                            );
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold">
                                {member.full_name_hi}
                            </h1>
                            {member.full_name_en && (
                                <p className="text-muted-foreground">
                                    {member.full_name_en}
                                </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {member.pno && (
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {member.pno}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExportOpen(true)}
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export')}
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={editMember.url(member)}>
                                        {t('Edit')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">
                            {t('Overview')}
                        </TabsTrigger>
                        <TabsTrigger value="status">
                            {t('Status history')}
                        </TabsTrigger>
                        <TabsTrigger value="teams">{t('Teams')}</TabsTrigger>
                        <TabsTrigger value="events">{t('Events')}</TabsTrigger>
                        <TabsTrigger value="legacy">
                            {t('Legacy achievements')}
                        </TabsTrigger>
                        <TabsTrigger value="promotions">
                            {t('Promotions & rewards')}
                        </TabsTrigger>
                        <TabsTrigger value="changelog">
                            {t('Change log')}
                        </TabsTrigger>
                        <TabsTrigger value="media">{t('Media')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(
                                    t('PNO'),
                                    <span className="font-mono">
                                        {member.pno}
                                    </span>,
                                )}
                                {detail(
                                    t('Current status'),
                                    <Badge variant="outline">
                                        {t(member.current_status)}
                                    </Badge>,
                                )}
                                {detail(t('Name (Hindi)'), member.full_name_hi)}
                                {detail(
                                    t('Name (English)'),
                                    member.full_name_en,
                                )}
                                {detail(
                                    t("Father's name"),
                                    member.father_name_hi,
                                )}
                                {detail(
                                    t('Gender'),
                                    t(
                                        member.gender === 'M'
                                            ? 'Male'
                                            : member.gender === 'F'
                                              ? 'Female'
                                              : 'Other gender',
                                    ),
                                )}
                                {detail(t('Date of birth'), member.dob)}
                                {detail(t('Mobile'), member.mobile)}
                                {detail(t('Rank'), member.rank)}
                                {detail(t('Designation'), member.designation)}
                                {detail(t('Joining date'), member.joining_date)}
                                {detail(
                                    t('Home district'),
                                    member.home_district?.name_hi,
                                )}
                                {detail(
                                    t('Posting district'),
                                    member.posting_district?.name_hi,
                                )}
                                {detail(t('Category'), member.player_category)}
                                {detail(t('Level'), member.player_level)}
                                {member.blood_group &&
                                    detail(
                                        t('Blood group'),
                                        member.blood_group,
                                    )}
                                {member.caste &&
                                    detail(t('Caste'), member.caste)}
                                {member.sport &&
                                    detail(
                                        t('Primary sport'),
                                        locale === 'en'
                                            ? member.sport.name_en
                                            : member.sport.name_hi,
                                    )}
                                {member.playable_sports.length > 0 &&
                                    detail(
                                        t('Other playable sports'),
                                        member.playable_sports
                                            .map((sport) =>
                                                locale === 'en'
                                                    ? sport.name_en
                                                    : sport.name_hi,
                                            )
                                            .join(', '),
                                    )}
                                {member.appointment &&
                                    detail(
                                        t('Appointment'),
                                        member.appointment,
                                    )}
                                {member.sport_event &&
                                    detail(
                                        t('Sport event'),
                                        member.sport_event,
                                    )}
                                {member.promotion_date &&
                                    detail(
                                        t('Promotion date'),
                                        member.promotion_date,
                                    )}
                                {member.team_since &&
                                    detail(t('Team since'), member.team_since)}
                                {member.home_address &&
                                    detail(
                                        t('Home address'),
                                        member.home_address,
                                    )}
                                {member.other_notes &&
                                    detail(
                                        t('Other notes'),
                                        member.other_notes,
                                    )}
                            </dl>
                        </div>
                    </TabsContent>

                    {/* Status history */}
                    <TabsContent value="status">
                        <div className="space-y-4 rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    {t('Status history')}
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStatusOpen(true)}
                                >
                                    {t('Change status')}
                                </Button>
                                <StatusChangeModal
                                    member={member}
                                    open={statusOpen}
                                    onOpenChange={setStatusOpen}
                                />
                            </div>
                            <Deferred
                                data="statusHistory"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-10 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <div className="divide-y">
                                    {(statusHistory ?? []).length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            {t('No status records.')}
                                        </p>
                                    ) : (
                                        (statusHistory ?? []).map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between py-3 text-sm"
                                            >
                                                <div className="space-y-0.5">
                                                    <Badge variant="outline">
                                                        {t(row.status)}
                                                    </Badge>
                                                    {row.reason_hi && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.reason_hi}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>{row.effective_on}</p>
                                                    {row.recorded_by_name && (
                                                        <p>
                                                            {
                                                                row.recorded_by_name
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Aliases */}
                    <TabsContent value="aliases">
                        <div className="rounded-xl border bg-card p-6">
                            <Deferred
                                data="aliases"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-8 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <AliasInlineForm
                                    member={member}
                                    aliases={aliases}
                                />
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Teams */}
                    <TabsContent value="teams">
                        <div className="rounded-xl border bg-card">
                            <Deferred
                                data="memberTeams"
                                fallback={
                                    <div className="space-y-2 p-4">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-10 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>
                                                {t('Session')}
                                            </TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Joined')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(memberTeams ?? []).length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    {t('No team memberships.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (memberTeams ?? []).map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">
                                                        {row.team ? (
                                                            <Link
                                                                href={showTeam.url(
                                                                    row.team,
                                                                )}
                                                                className="hover:underline"
                                                            >
                                                                {
                                                                    row.team
                                                                        .name_hi
                                                                }
                                                            </Link>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.sport?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.session?.name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.role
                                                            ? t(row.role)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.joined_on ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Events */}
                    <TabsContent value="events">
                        <div className="space-y-4">
                            {loadingParticipations ||
                            participations === null ||
                            loadingAchievements ||
                            achievementsData === null ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-10 w-full"
                                        />
                                    ))}
                                </div>
                            ) : participations.length === 0 ? (
                                <div className="rounded-xl border bg-card p-6">
                                    <p className="text-sm text-muted-foreground">
                                        {t('No events.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3">
                                        {(
                                            ['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const
                                        ).map((m) => (
                                            <div key={m} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
                                                {(() => {
                                                    const medal = medalBadgeContent(m);

                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${medal.className}`}>
                                                            {medal.icon}
                                                            {medal.label}
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-xl font-bold">{achievementsData.summary[m]}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-xl border bg-card p-4">
                                        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span className="rounded-md border bg-white px-2 py-1">{t('Current')} {sessionFilter === 'current' ? 'on' : 'off'}</span>
                                            {medalFilter !== 'all' && <span className="rounded-md border bg-white px-2 py-1">{t('Medal')}: {t(medalFilter)}</span>}
                                            {tierFilter !== 'all' && <span className="rounded-md border bg-white px-2 py-1">{t('Tier')}: {tierFilter}</span>}
                                            {classFilter !== 'all' && <span className="rounded-md border bg-white px-2 py-1">{t('Class')}: {classFilter}</span>}
                                            {benefitFilter !== 'all' && <span className="rounded-md border bg-white px-2 py-1">{t('Benefits')}: {t(benefitFilter)}</span>}
                                            {eventSearch && <span className="rounded-md border bg-white px-2 py-1">{t('Search')}: {eventSearch}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <div className="min-w-[240px] flex-1 basis-[280px] space-y-1.5">
                                                <Label htmlFor="event-search" className="text-xs font-medium text-muted-foreground">{t('Search…')}</Label>
                                                <Input id="event-search" className="h-10 border-slate-200 bg-white shadow-sm" value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder={t('Search events, medals, benefits…')} />
                                            </div>
                                            <div className="min-w-[180px] flex-1 basis-[180px] space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">{t('Session')}</Label>
                                                <Select value={sessionFilter} onValueChange={(v) => setSessionFilter(v as 'all' | 'current' | string)}>
                                                    <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm">
                                                        <SelectValue placeholder={t('All sessions')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="current">{t('Current')}</SelectItem>
                                                        <SelectItem value="all">{t('All sessions')}</SelectItem>
                                                        {(participations ?? []).map((group) => (
                                                            <SelectItem key={group.session.id} value={String(group.session.id)}>{group.session.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="min-w-[180px] flex-1 basis-[180px] space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">{t('Medal')}</Label>
                                                <Select value={medalFilter} onValueChange={(v) => setMedalFilter(v as typeof medalFilter)}>
                                                    <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm">
                                                        <SelectValue placeholder={t('All medals')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All medals')}</SelectItem>
                                                        <SelectItem value="GOLD">{t('Gold')}</SelectItem>
                                                        <SelectItem value="SILVER">{t('Silver')}</SelectItem>
                                                        <SelectItem value="BRONZE">{t('Bronze')}</SelectItem>
                                                        <SelectItem value="MERIT">{t('MERIT')}</SelectItem>
                                                        <SelectItem value="none">{t('No medal')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="min-w-[180px] flex-1 basis-[180px] space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">{t('Tier')}</Label>
                                                <Select value={tierFilter} onValueChange={setTierFilter}>
                                                    <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm">
                                                        <SelectValue placeholder={t('All tiers')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All tiers')}</SelectItem>
                                                        {Array.from(new Set((participations ?? []).flatMap((group) => group.participations.map((p) => p.tournament.tier_code).filter(Boolean) as string[]))).map((tier) => (
                                                            <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="min-w-[180px] flex-1 basis-[180px] space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">{t('Class')}</Label>
                                                <Select value={classFilter} onValueChange={setClassFilter}>
                                                    <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm">
                                                        <SelectValue placeholder={t('All types')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All types')}</SelectItem>
                                                        {Array.from(new Set((participations ?? []).flatMap((group) => group.participations.map((p) => p.event.gender_class)))).map((item) => (
                                                            <SelectItem key={item} value={item}>{item}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="min-w-[180px] flex-1 basis-[180px] space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">{t('Benefits')}</Label>
                                                <Select value={benefitFilter} onValueChange={(v) => setBenefitFilter(v as typeof benefitFilter)}>
                                                    <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm">
                                                        <SelectValue placeholder={t('All types')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All types')}</SelectItem>
                                                        <SelectItem value="benefit">{t('Benefit recorded')}</SelectItem>
                                                        <SelectItem value="promotion">{t('Promotion')}</SelectItem>
                                                        <SelectItem value="cash">{t('Cash reward')}</SelectItem>
                                                        <SelectItem value="both">{t('Promotion')} + {t('Cash reward')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {filteredSessionGroups.length === 0 ? (
                                        <div className="rounded-xl border bg-card p-6">
                                            <p className="text-sm text-muted-foreground">{t('No results')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {filteredSessionGroups.map((group) => (
                                                <div key={group.session.id} className="rounded-xl border bg-card">
                                                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                                                        <div>
                                                            <h4 className="text-sm font-medium">
                                                                {group.session.name}
                                                                {group.session.is_current ? <Badge className="ml-2" variant="secondary">{t('Current')}</Badge> : null}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground">{t('Events')}</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {group.participations.length} {t('records')}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3 p-4">
                                                        {group.participations
                                                            .reduce<Array<{ key: string; eventName: string; rows: ParticipationEntry[] }>>((acc, item) => {
                                                                const key = `${item.tournament.id}:${item.event.id}`;
                                                                const existing = acc.find((entry) => entry.key === key);

                                                                if (existing) {
                                                                    existing.rows.push(item);
                                                                } else {
                                                                    acc.push({ key, eventName: item.event.name_hi, rows: [item] });
                                                                }

                                                                return acc;
                                                            }, [])
                                                            .map((eventGroup) => (
                                                            <div key={eventGroup.key} className="rounded-lg border bg-white shadow-sm">
                                                                <div className="border-b bg-slate-50 px-4 py-3">
                                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                                        <div className="min-w-0 space-y-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <Link href={showTournament.url(eventGroup.rows[0].tournament.id)} className="truncate font-medium hover:underline">
                                                                                    {eventGroup.rows[0].tournament.name_hi}
                                                                                </Link>
                                                                                <span className={eventBadgeClass('tier')}>{eventGroup.rows[0].tournament.tier_code ?? t('Unknown')}</span>
                                                                                <span className={eventBadgeClass('class')}>{eventGroup.rows[0].event.gender_class || t('Unknown')}</span>
                                                                            </div>
                                                                            <Link href={showEvent.url({ tournament: eventGroup.rows[0].tournament.id, event: eventGroup.rows[0].event.id })} className="block truncate text-sm text-muted-foreground hover:underline">
                                                                                {eventGroup.eventName}
                                                                            </Link>
                                                                            <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                                                                                {eventGroup.rows[0].tournament.sport && <span className="rounded-md border bg-white px-2 py-0.5">{t('Sport')}: {eventGroup.rows[0].tournament.sport.name_hi}</span>}
                                                                                {eventGroup.rows[0].tournament.venue && <span className="rounded-md border bg-white px-2 py-0.5">{t('Venue')}: {eventGroup.rows[0].tournament.venue}</span>}
                                                                                {eventGroup.rows[0].tournament.date_from && <span className="rounded-md border bg-white px-2 py-0.5">{t('Date')}: {eventGroup.rows[0].tournament.date_to ? `${eventGroup.rows[0].tournament.date_from} - ${eventGroup.rows[0].tournament.date_to}` : eventGroup.rows[0].tournament.date_from}</span>}
                                                                                {eventGroup.rows[0].team && <span className="rounded-md border bg-white px-2 py-0.5">{t('Team')}: {eventGroup.rows[0].team.name_hi}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 text-xs text-muted-foreground">
                                                                            {eventGroup.rows.length} {t('records')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3 p-4">
                                                                        {eventGroup.rows.map((p) => (
                                                                            <div key={p.id} className="flex w-full items-start gap-3 rounded-md border bg-white p-3 shadow-sm">
                                                                                <div className="min-w-0 flex-1 space-y-2">
                                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                                            {p.achievement?.medal_type ? (() => {
                                                                                                const medal = medalBadgeContent(p.achievement.medal_type);

                                                                                                return (
                                                                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${medal.className}`}>
                                                                                                        {medal.icon}
                                                                                                        {medal.label}
                                                                                                    </span>
                                                                                                );
                                                                                            })() : <span className={eventBadgeClass('medal')}>{t('No medal')}</span>}
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                #{p.achievement?.position ?? p.position ?? '—'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                                                                                            {p.event.sport && <span className="rounded-md border bg-muted/30 px-2 py-0.5">{t('Sport')}: {p.event.sport.name_hi}</span>}
                                                                                            {p.tournament.venue && <span className="rounded-md border bg-muted/30 px-2 py-0.5">{t('Venue')}: {p.tournament.venue}</span>}
                                                                                            {p.event.discipline && <span className="rounded-md border bg-muted/30 px-2 py-0.5">{t('Discipline')}: {p.event.discipline}</span>}
                                                                                            {p.event.weight_category && <span className="rounded-md border bg-muted/30 px-2 py-0.5">{t('Weight category')}: {p.event.weight_category}</span>}
                                                                                        </div>
                                                                                        <div className="grid gap-3 md:grid-cols-2">
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-xs font-medium text-muted-foreground">{t('Benefits')}</p>
                                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                                    {p.achievement?.benefits?.length ? p.achievement.benefits.map((benefit) => (
                                                                                                        <span key={benefit.id} className={eventBadgeClass('benefit')}>
                                                                                                            {t(benefit.benefit_type)}
                                                                                                            {benefit.cash_amount ? ` ₹${benefit.cash_amount}` : ''}
                                                                                                        </span>
                                                                                                    )) : <span className="text-xs text-muted-foreground">—</span>}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-xs font-medium text-muted-foreground">{t('Promotion')}</p>
                                                                                                {eventPromotionRows(p).length > 0 ? (
                                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                                        {eventPromotionRows(p).map((promotion) => {
                                                                                                            const rewardMeta = promotionRewardMeta(promotion);

                                                                                                            return (
                                                                                                                <span key={promotion.id} className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium leading-4 text-blue-700">
                                                                                                                    <span className="shrink-0">{t('Promotion')}</span>
                                                                                                                    <span className="truncate">
                                                                                                                        {promotionSummary(promotion)}
                                                                                                                        {rewardMeta.length > 0 ? ` · ${rewardMeta.join(' · ')}` : ''}
                                                                                                                    </span>
                                                                                                                </span>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                </div>
                                                                                <Button variant="ghost" size="icon" className="relative h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" title={t('Photos')} onClick={() => setMediaParticipationId({ id: p.id, eventName: p.event?.name_hi ?? '' })}>
                                                                                        {canUploadMedia || canDeleteMedia ? <Camera className="h-3.5 w-3.5" /> : <Images className="h-3.5 w-3.5" />}
                                                                                        {p.media_files_count > 0 && (
                                                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                                                                                                {p.media_files_count > 9 ? '9+' : p.media_files_count}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="sr-only">{t('Photos')}</span>
                                                                                    </Button>
                                                                                <div className="mt-2 text-[11px] text-muted-foreground">
                                                                                    {p.tournament.date_from ?? t('No date')}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    {/* Legacy achievements */}
                    <TabsContent value="legacy">
                        <Deferred
                            data="legacyAchievements"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-12 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <LegacyAchievementsTab
                                member={member}
                                legacyAchievements={legacyAchievements}
                            />
                        </Deferred>
                    </TabsContent>
                    {/* Promotions */}
                    <TabsContent value="promotions">
                        <Deferred
                            data="promotions"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-12 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <PromotionsTab
                                memberId={member.id}
                                memberRank={member.rank}
                                ranks={ranks ?? []}
                                promotions={promotions}
                                participations={participations ?? []}
                                legacyAchievements={legacyAchievements}
                                achievements={achievementsData?.achievements ?? []}
                                onSaved={refreshMemberHistory}
                            />
                        </Deferred>
                    </TabsContent>
                    {/* Change log */}
                    <TabsContent value="changelog">
                            <ChangeLog
                                entries={[]}
                                primaryEntity="Member"
                                storageKey="member-changelog-view"
                                endpoint={memberAuditLog.index.url(member)}
                            />
                    </TabsContent>

                    {/* Media tab */}
                    <TabsContent value="media">
                        {activeTab === 'media' && (
                            <MemberMediaTab
                                key={mediaKey}
                                memberId={memberId}
                                canDelete={canDeleteMedia}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {mediaParticipationId !== null && (
                <ParticipationMediaSheet
                    participationId={mediaParticipationId.id}
                    memberName={member.full_name_hi}
                    open={mediaParticipationId !== null}
                    onOpenChange={(o) => {
                        if (!o) {
                            setMediaParticipationId(null);
                        }
                    }}
                    canUpload={canUploadMedia}
                    canDelete={canDeleteMedia}
                />
            )}

            {/* Export column picker dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent
                    className="max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Export member')}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                        <p className="text-sm text-muted-foreground">
                            {member.full_name_hi}
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    {t('Select columns to export')}
                                </Label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline"
                                        onClick={() =>
                                            setSelectedColumns(
                                                ALL_COLUMNS.map((c) => c.key),
                                            )
                                        }
                                    >
                                        {t('Select all')}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:underline"
                                        onClick={() => setSelectedColumns([])}
                                    >
                                        {t('Clear')}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                {ALL_COLUMNS.map((col) => (
                                    <label
                                        key={col.key}
                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedColumns.includes(
                                                col.key,
                                            )}
                                            onCheckedChange={(checked) => {
                                                setSelectedColumns((prev) =>
                                                    checked
                                                        ? [...prev, col.key]
                                                        : prev.filter(
                                                              (k) =>
                                                                  k !== col.key,
                                                          ),
                                                );
                                            }}
                                        />
                                        {t(col.label)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                handlePrint();
                                setExportOpen(false);
                            }}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                        <Button
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                window.location.href = buildExportUrl();
                                setExportOpen(false);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download Excel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
