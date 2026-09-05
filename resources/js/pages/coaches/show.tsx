import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    ChevronDown,
    ChevronRight,
    Download,
    Medal,
    Pencil,
    Plus,
    Printer,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import {
    destroy as destroyCoachCertification,
    store as storeCoachCertification,
} from '@/actions/App/Http/Controllers/CoachCertificationController';
import {
    destroy,
    edit as editCoach,
    index as coachesIndex,
    show as coachOverview,
} from '@/actions/App/Http/Controllers/CoachController';
import { show as exportCoach } from '@/actions/App/Http/Controllers/CoachExportController';
import {
    destroy as destroyCoachPhoto,
    store as storeCoachPhoto,
} from '@/actions/App/Http/Controllers/CoachPhotoController';
import {
    achievements as coachAchievementsTab,
    assignments as coachAssignments,
    certifications as coachCertifications,
    changelog as coachChangelog,
    media as coachMedia,
    promotions as coachPromotions,
    specialAchievements as coachSpecialAchievementsTab,
    sports as coachSports,
    status as coachStatus,
} from '@/actions/App/Http/Controllers/CoachProfileTabController';
import {
    destroy as destroyCoachPromotion,
    store as storeCoachPromotion,
    update as updateCoachPromotion,
} from '@/actions/App/Http/Controllers/CoachPromotionController';
import {
    destroy as destroyCoachSport,
    store as storeCoachSport,
} from '@/actions/App/Http/Controllers/CoachSportController';
import { store as storeCoachStatus } from '@/actions/App/Http/Controllers/CoachStatusController';
import { events as memberEvents } from '@/actions/App/Http/Controllers/MemberProfileTabController';
import { CoachSpecialAchievementsTab } from '@/components/coaches/special-achievements-tab';
import type { SpecialAchievementsData } from '@/components/coaches/special-achievements-tab';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type CoachCertification = {
    id: number;
    name: string;
    certificate_type: string | null;
    issuer: string | null;
    issued_at: string | null;
    expired_at: string | null;
    attachment: {
        preview_url: string;
        download_url: string;
        original_name: string | null;
        mime_type: string | null;
        size_bytes: number | null;
    } | null;
};

type CoachSport = {
    id: number;
    coach_sport_id: number | null;
    name: string;
    is_primary: boolean;
    level_master_id: number | null;
    sport_event: string | null;
    level: string | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
};

type CoachPromotion = {
    id: number;
    promotion_date: string | null;
    from_rank: string | null;
    to_rank: string | null;
    cash_reward_amount: string | null;
    cash_reward_date: string | null;
    cash_reward_reference: string | null;
    cash_reward_remarks: string | null;
    reason: string | null;
    remarks: string | null;
    recorded_by_name: string | null;
    evidences: RewardEvidence[];
};

type RewardEvidence = {
    id: number;
    session_id: number;
    tournament_id: number;
    event_id: number | null;
    team_id: number | null;
    achievement_id: number | null;
    summary: string | null;
    session: { id: number; name: string } | null;
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
    } | null;
    event: {
        id: number;
        name: string;
        gender_class: string | null;
        discipline: string | null;
        weight_category: string | null;
    } | null;
    team: { id: number; name: string } | null;
};

type RewardEvidenceInput = {
    session_id: number;
    tournament_id: number;
    team_id: number;
};

type RewardEvidenceTournamentOption = RewardEvidenceInput & {
    id: string;
    tournament: CoachAchievementGroup['tournament'];
    team: CoachAchievementGroup['team'];
    event_count: number;
    player_count: number;
};

type RewardEvidenceSessionOption = {
    session: CoachAchievementGroup['session'];
    tournaments: RewardEvidenceTournamentOption[];
};

type AchievementBenefit = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

type CoachAchievementPlayer = {
    achievement_id: number;
    participation_id: number;
    member: {
        id: number;
        full_name: string;
        pno: string | null;
    };
    medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT';
    position: number | null;
    participation_position: number | null;
    remarks: string | null;
    benefits: AchievementBenefit[];
};

type CoachAchievementReward = {
    id: number;
    cash_reward_amount: string | null;
    cash_reward_date: string | null;
    cash_reward_reference: string | null;
};

type CoachAchievementGroup = {
    id: string;
    session: { id: number; name: string; is_current: boolean };
    team: { id: number; name: string };
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        tier_weight: number | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
        sport: { id: number; name: string } | null;
    };
    event: {
        id: number;
        name: string;
        gender_class: string | null;
        discipline: string | null;
        weight_category: string | null;
        sport: { id: number; name: string } | null;
    };
    medal_counts: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number>;
    rewards: CoachAchievementReward[];
    players: CoachAchievementPlayer[];
};

type CoachAchievementTournamentGroup = {
    id: string;
    session: CoachAchievementGroup['session'];
    team: CoachAchievementGroup['team'];
    tournament: CoachAchievementGroup['tournament'];
    rows: CoachAchievementGroup[];
    medalCounts: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number>;
    playerCount: number;
    prizeMoney: number;
    rewardCount: number;
    rewardDates: string[];
    rewardReferences: string[];
};

type CoachAchievementsData = {
    summary: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number> & {
        total_events: number;
        medal_winning_players: number;
    };
    groups: CoachAchievementGroup[];
};

type SportOption = {
    id: number;
    name: string;
    category?: string | null;
};

type TierOption = {
    id: number;
    code: string;
    label_hi: string;
    label_en: string | null;
    weight: number;
};

type RankOption = {
    code: string;
    name: string;
    short_name: string | null;
    rank_order?: number | null;
};

type CoachAssignment = {
    id: number;
    role: string;
    team_name: string | null;
    session_name: string | null;
    team?: { id: number; name: string } | null;
    session?: { id: number; name: string } | null;
    is_current: boolean;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
};

type CoachStatusHistory = {
    id: number;
    status: string;
    effective_on: string;
    reason: string | null;
    recorded_by_name: string | null;
};

type Coach = {
    id: number;
    full_name: string;
    display_name: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string | null;
    bio: string | null;
    address: string | null;
    pno: string | null;
    mobile: string | null;
    photo_path: string | null;
    nis_master?: {
        id: number;
        code: string | null;
        name: string;
        short_name: string | null;
    } | null;
    team_activity_status?: 'active' | 'inactive';
    certifications?: CoachCertification[];
    promotions?: CoachPromotion[];
    sports?: CoachSport[];
    assignment_history?: CoachAssignment[];
    status_history?: CoachStatusHistory[];
};

type CoachShowTab =
    | 'overview'
    | 'assignments'
    | 'sports'
    | 'certifications'
    | 'achievements'
    | 'special-achievements'
    | 'promotions'
    | 'media'
    | 'changelog'
    | 'status';

const COACH_SHOW_TABS: CoachShowTab[] = [
    'overview',
    'assignments',
    'sports',
    'certifications',
    'achievements',
    'special-achievements',
    'promotions',
    'media',
    'changelog',
    'status',
];

const ALL_COLUMNS = [
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'display_name', label: 'Display Name' },
    { key: 'mobile', label: 'Mobile' },
] as const;

const BASE_STATUS_STYLES: Record<
    string,
    'default' | 'outline' | 'secondary' | 'destructive'
> = {
    ACTIVE: 'default',
    INACTIVE: 'outline',
    RETIRED: 'secondary',
    TRANSFERRED: 'secondary',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'destructive',
    SUSPENDED: 'destructive',
};

const COACH_STATUSES = [
    'ACTIVE',
    'INACTIVE',
    'TRANSFERRED',
    'RETIRED',
    'RESIGNED',
    'DISMISSED',
    'DECEASED',
    'SUSPENDED',
] as const;
function genderLabel(
    gender: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (gender) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return gender ?? '';
    }
}

export default function CoachesShow({
    coach,
    activeTab: activeTabProp = 'overview',
    coachTeams,
    statusHistory,
    auditLog,
    sports = [],
    tiers = [],
    ranks = [],
    coachAchievements,
    rewardEvidenceOptions = [],
    specialAchievements,
}: {
    coach: Coach;
    activeTab?: CoachShowTab;
    coachTeams?: CoachAssignment[];
    statusHistory?: CoachStatusHistory[];
    auditLog?: AuditEntry[];
    sports?: SportOption[];
    tiers?: TierOption[];
    ranks?: RankOption[];
    coachAchievements?: CoachAchievementsData;
    rewardEvidenceOptions?: RewardEvidenceSessionOption[];
    specialAchievements?: SpecialAchievementsData;
}) {
    const { t } = useTranslation();

    const [exportOpen, setExportOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [certificationDialogOpen, setCertificationDialogOpen] =
        useState(false);
    const [editingCertification, setEditingCertification] =
        useState<CoachCertification | null>(null);
    const [sportDialogOpen, setSportDialogOpen] = useState(false);
    const [editingSport, setEditingSport] = useState<CoachSport | null>(null);
    const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] =
        useState<CoachPromotion | null>(null);
    const [promotionDialogMode, setPromotionDialogMode] = useState<
        'promotion' | 'reward'
    >('promotion');
    const [activePromotionTab, setActivePromotionTab] = useState<
        'promotions' | 'rewards'
    >('promotions');
    const [selectedRewardSessionId, setSelectedRewardSessionId] =
        useState<string>('all');
    const [rewardEvidenceSelection, setRewardEvidenceSelection] = useState<
        RewardEvidenceInput[]
    >([]);
    const [achievementSearch, setAchievementSearch] = useState('');
    const [achievementSessionFilter, setAchievementSessionFilter] =
        useState('all');
    const [achievementTierFilter, setAchievementTierFilter] = useState('all');
    const [achievementMedalFilter, setAchievementMedalFilter] = useState('all');
    const [expandedAchievementGroups, setExpandedAchievementGroups] = useState<
        string[]
    >([]);
    const [expandedAchievementTournaments, setExpandedAchievementTournaments] =
        useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );
    const [exportMode, setExportMode] = useState<'print' | 'download'>(
        'download',
    );
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const sportForm = useForm({
        sport_id: '',
        level_master_id: '',
        level: '',
        sport_event: '',
        is_primary: false,
        effective_from: '',
        effective_to: '',
        notes: '',
    });
    const certificationForm = useForm({
        id: '',
        name: '',
        certificate_type: '',
        issuer: '',
        issued_at: '',
        expired_at: '',
        attachment: null as File | null,
    });
    const promotionForm = useForm({
        promotion_date: '',
        from_rank: '',
        to_rank: '',
        cash_reward_amount: '',
        cash_reward_date: '',
        cash_reward_reference: '',
        cash_reward_remarks: '',
        reason: '',
        remarks: '',
        evidences: [] as RewardEvidenceInput[],
    });
    const activeTab = COACH_SHOW_TABS.includes(activeTabProp)
        ? activeTabProp
        : 'overview';

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name },
        ],
    });

    const printableColumns = useMemo(
        () => ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key)),
        [selectedColumns],
    );

    function exportValue(key: string): string {
        const raw = (coach as Record<string, unknown>)[key];

        return raw === null || raw === '' || raw === undefined
            ? ''
            : String(raw);
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportCoach.url(coach) + '?' + params.toString();
    }

    function handlePrint() {
        const headers = printableColumns
            .map((c) => `<th>${t(c.label)}</th>`)
            .join('');
        const rows = `<tr>${printableColumns.map((c) => `<td>${exportValue(c.key)}</td>`).join('')}</tr>`;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Coach Profile')}</title><style>body{font-family:sans-serif;font-size:12px;padding:16px}h2{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Coach Profile')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
    }

    function handleDelete() {
        router.delete(destroy.url(coach));
        setDeleteOpen(false);
    }

    function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            storeCoachPhoto.url(coach),
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    event.target.value = '';
                },
            },
        );
    }

    function handleRemovePhoto() {
        router.delete(destroyCoachPhoto.url(coach), { preserveScroll: true });
    }

    const detail = (label: string, value: string) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm text-foreground">{value}</dd>
        </div>
    );

    const assignmentRows =
        activeTab === 'assignments'
            ? (coachTeams ?? coach.assignment_history ?? [])
            : [];
    const statusRows = statusHistory ?? coach.status_history ?? [];
    const teamActivityStatus = coach.team_activity_status ?? 'inactive';
    const sportItems = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
        badge: sport.category ? t(sport.category) : undefined,
    }));
    const tierItems = tiers.map((tier) => ({
        value: String(tier.id),
        label: tier.label_hi || tier.label_en || tier.code,
    }));
    const rankItems = ranks.map((rank) => ({
        value: rank.code,
        label: [rank.code, rank.name, rank.short_name]
            .filter(Boolean)
            .join(' · '),
    }));

    function rankLabel(value: string | null | undefined): string {
        if (!value) {
            return '';
        }

        return rankItems.find((rank) => rank.value === value)?.label ?? value;
    }

    function hasPromotionFields(promotion: CoachPromotion): boolean {
        return Boolean(
            promotion.promotion_date ||
            (promotion.from_rank &&
                promotion.to_rank &&
                promotion.from_rank !== promotion.to_rank) ||
            promotion.to_rank ||
            promotion.reason ||
            promotion.remarks,
        );
    }

    function hasRewardFields(promotion: CoachPromotion): boolean {
        return Boolean(
            promotion.cash_reward_amount ||
            promotion.cash_reward_date ||
            promotion.cash_reward_reference ||
            promotion.cash_reward_remarks,
        );
    }

    function promotionCategory(promotion: CoachPromotion): string {
        const hasPromotion = hasPromotionFields(promotion);
        const hasReward = hasRewardFields(promotion);

        if (hasPromotion && hasReward) {
            return t('Promotion + Reward');
        }

        if (hasReward) {
            return t('Reward');
        }

        return t('Promotion');
    }

    function promotionCategoryClass(promotion: CoachPromotion): string {
        const hasPromotion = hasPromotionFields(promotion);
        const hasReward = hasRewardFields(promotion);

        if (hasPromotion && hasReward) {
            return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
        }

        if (hasReward) {
            return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
        }

        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
    }

    const promotionRows = (coach.promotions ?? []).filter(hasPromotionFields);
    const rewardRows = (coach.promotions ?? []).filter(hasRewardFields);
    const activePromotionRows =
        activePromotionTab === 'promotions' ? promotionRows : rewardRows;
    const rewardSessionOptions = rewardEvidenceOptions.map(
        (option) => option.session,
    );
    const visibleRewardEvidenceOptions = rewardEvidenceOptions.filter(
        (option) =>
            selectedRewardSessionId === 'all' ||
            String(option.session.id) === selectedRewardSessionId,
    );
    const rewardEvidenceLookup = useMemo(() => {
        const lookup = new Map<string, RewardEvidenceTournamentOption>();

        for (const session of rewardEvidenceOptions) {
            for (const tournament of session.tournaments) {
                lookup.set(tournament.id, tournament);
            }
        }

        return lookup;
    }, [rewardEvidenceOptions]);

    function rewardEvidenceKey(evidence: RewardEvidenceInput): string {
        return [
            evidence.session_id,
            evidence.tournament_id,
            evidence.team_id,
        ].join(':');
    }

    function collectText(
        values: Array<string | number | null | undefined>,
    ): string {
        return values.filter(Boolean).join(' · ');
    }

    function rewardEvidenceSelected(evidence: RewardEvidenceInput): boolean {
        const key = rewardEvidenceKey(evidence);

        return rewardEvidenceSelection.some(
            (selected) => rewardEvidenceKey(selected) === key,
        );
    }

    function toggleRewardEvidence(evidence: RewardEvidenceInput): void {
        const key = rewardEvidenceKey(evidence);

        setRewardEvidenceSelection((current) =>
            current.some((selected) => rewardEvidenceKey(selected) === key)
                ? current.filter(
                      (selected) => rewardEvidenceKey(selected) !== key,
                  )
                : [...current, evidence],
        );
    }

    function selectedRewardEvidenceLabel(
        evidence: RewardEvidenceInput,
    ): string {
        const option = rewardEvidenceLookup.get(rewardEvidenceKey(evidence));

        return collectText([
            option?.tournament.name,
            option?.team.name,
            option ? `${option.player_count} ${t('players')}` : null,
        ]);
    }

    function renderPromotionEvidenceSummary(promotion: CoachPromotion) {
        if (promotion.evidences.length === 0) {
            return <span className="text-muted-foreground">—</span>;
        }

        return (
            <div className="space-y-1">
                {promotion.evidences.slice(0, 2).map((evidence) => (
                    <div key={evidence.id} className="truncate text-xs">
                        {evidence.summary ?? '—'}
                    </div>
                ))}
                {promotion.evidences.length > 2 ? (
                    <div className="text-xs text-muted-foreground">
                        +{promotion.evidences.length - 2} {t('more')}
                    </div>
                ) : null}
            </div>
        );
    }

    function renderEvidencePicker(context: 'promotion' | 'reward') {
        return (
            <div className="grid gap-3 rounded-lg border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Label>{t('Tournament events')}</Label>
                        <p className="text-xs text-muted-foreground">
                            {context === 'reward'
                                ? t(
                                      'Select unrewarded events connected to this coach reward.',
                                  )
                                : t(
                                      'Select unrewarded events connected to this coach promotion.',
                                  )}
                        </p>
                    </div>
                    <Select
                        value={selectedRewardSessionId}
                        onValueChange={setSelectedRewardSessionId}
                    >
                        <SelectTrigger className="sm:w-56">
                            <SelectValue placeholder={t('Session')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All sessions')}
                            </SelectItem>
                            {rewardSessionOptions.map((session) => (
                                <SelectItem
                                    key={session.id}
                                    value={String(session.id)}
                                >
                                    {session.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {visibleRewardEvidenceOptions.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        {t(
                            'No unrewarded tournament achievements available for this session.',
                        )}
                    </div>
                ) : (
                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                        {visibleRewardEvidenceOptions.map((session) =>
                            session.tournaments.map((tournament) => (
                                <label
                                    key={`${session.session.id}-${tournament.id}`}
                                    className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
                                >
                                    <Checkbox
                                        checked={rewardEvidenceSelected(
                                            tournament,
                                        )}
                                        onCheckedChange={() =>
                                            toggleRewardEvidence(tournament)
                                        }
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">
                                                {tournament.tournament
                                                    .tier_code ?? t('Unknown')}
                                            </Badge>
                                            <span className="font-medium">
                                                {tournament.tournament.name}
                                            </span>
                                        </span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            {session.session.name} ·{' '}
                                            {tournament.team.name} ·{' '}
                                            {tournament.event_count}{' '}
                                            {t('events')} ·{' '}
                                            {tournament.player_count}{' '}
                                            {t('players')}
                                        </span>
                                    </span>
                                </label>
                            )),
                        )}
                    </div>
                )}

                {rewardEvidenceSelection.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {rewardEvidenceSelection.map((evidence) => (
                            <Badge
                                key={rewardEvidenceKey(evidence)}
                                variant="secondary"
                            >
                                {selectedRewardEvidenceLabel(evidence) ||
                                    t('Selected')}
                            </Badge>
                        ))}
                    </div>
                ) : null}
                <InputError message={promotionForm.errors.evidences} />
            </div>
        );
    }
    const achievementGroups = useMemo(
        () => coachAchievements?.groups ?? [],
        [coachAchievements],
    );
    const achievementSummary =
        coachAchievements?.summary ??
        ({
            GOLD: 0,
            SILVER: 0,
            BRONZE: 0,
            MERIT: 0,
            total_events: 0,
            medal_winning_players: 0,
        } satisfies CoachAchievementsData['summary']);
    const achievementSessions = useMemo(
        () =>
            Array.from(
                new Map(
                    achievementGroups.map((group) => [
                        String(group.session.id),
                        group.session.name,
                    ]),
                ),
            ),
        [achievementGroups],
    );
    const achievementTiers = useMemo(
        () =>
            Array.from(
                new Map(
                    achievementGroups.map((group) => [
                        group.tournament.tier_code ?? 'unknown',
                        group.tournament.tier_code ?? t('Unknown'),
                    ]),
                ),
            ),
        [achievementGroups, t],
    );
    const filteredAchievementGroups = useMemo(() => {
        const query = achievementSearch.trim().toLowerCase();

        return achievementGroups.filter((group) => {
            const matchesSession =
                achievementSessionFilter === 'all' ||
                String(group.session.id) === achievementSessionFilter;
            const matchesTier =
                achievementTierFilter === 'all' ||
                (group.tournament.tier_code ?? 'unknown') ===
                    achievementTierFilter;
            const matchesMedal =
                achievementMedalFilter === 'all' ||
                group.players.some(
                    (player) => player.medal_type === achievementMedalFilter,
                );
            const searchable = [
                group.session.name,
                group.team.name,
                group.tournament.name,
                group.tournament.tier_code,
                group.tournament.venue,
                group.event.name,
                group.event.gender_class,
                group.event.discipline,
                group.event.weight_category,
                group.event.sport?.name,
                group.tournament.sport?.name,
                ...group.players.flatMap((player) => [
                    player.member.full_name,
                    player.member.pno,
                    player.medal_type,
                ]),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return (
                matchesSession &&
                matchesTier &&
                matchesMedal &&
                (query === '' || searchable.includes(query))
            );
        });
    }, [
        achievementGroups,
        achievementMedalFilter,
        achievementSearch,
        achievementSessionFilter,
        achievementTierFilter,
    ]);
    const achievementTournamentGroups = useMemo(() => {
        const groups = new Map<string, CoachAchievementTournamentGroup>();

        for (const group of filteredAchievementGroups) {
            const key = [
                group.session.id,
                group.team.id,
                group.tournament.id,
            ].join(':');
            const existing = groups.get(key) ?? {
                id: key,
                session: group.session,
                team: group.team,
                tournament: group.tournament,
                rows: [],
                medalCounts: {
                    GOLD: 0,
                    SILVER: 0,
                    BRONZE: 0,
                    MERIT: 0,
                },
                playerCount: 0,
                prizeMoney: 0,
                rewardCount: 0,
                rewardDates: [],
                rewardReferences: [],
            };

            existing.rows.push(group);

            if ((group.tournament.tier_code ?? 'OTHER') === 'OTHER') {
                groups.set(key, existing);
                continue;
            }

            existing.playerCount += group.players.length;
            existing.rewardCount += group.rewards.length;

            for (const medal of [
                'GOLD',
                'SILVER',
                'BRONZE',
                'MERIT',
            ] as const) {
                existing.medalCounts[medal] += group.medal_counts[medal];
            }

            existing.prizeMoney += group.players.reduce(
                (total, player) =>
                    total +
                    player.benefits.reduce(
                        (sum, benefit) =>
                            sum + Number(benefit.cash_amount ?? 0),
                        0,
                    ),
                0,
            );
            existing.prizeMoney += group.rewards.reduce(
                (total, reward) =>
                    total + Number(reward.cash_reward_amount ?? 0),
                0,
            );
            existing.rewardDates.push(
                ...group.rewards
                    .map((reward) => reward.cash_reward_date)
                    .filter((date): date is string => Boolean(date)),
            );
            existing.rewardReferences.push(
                ...group.rewards
                    .map((reward) => reward.cash_reward_reference)
                    .filter((reference): reference is string =>
                        Boolean(reference),
                    ),
            );

            groups.set(key, existing);
        }

        return Array.from(groups.values()).sort((a, b) => {
            const tierWeightDiff =
                (b.tournament.tier_weight ?? 0) -
                (a.tournament.tier_weight ?? 0);

            if (tierWeightDiff !== 0) {
                return tierWeightDiff;
            }

            return (
                (b.tournament.date_from ?? '').localeCompare(
                    a.tournament.date_from ?? '',
                ) || a.tournament.name.localeCompare(b.tournament.name)
            );
        });
    }, [filteredAchievementGroups]);

    function highestMedalLabel(
        medalCounts: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number>,
    ): string {
        const medal = (['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const).find(
            (name) => medalCounts[name] > 0,
        );

        return medal ? `${t(medal)}: ${medalCounts[medal]}` : '—';
    }

    function toggleAchievementTournament(tournamentId: string): void {
        setExpandedAchievementTournaments((current) =>
            current.includes(tournamentId)
                ? current.filter((id) => id !== tournamentId)
                : [...current, tournamentId],
        );
    }
    function medalBadgeClass(medal: string): string {
        switch (medal) {
            case 'GOLD':
                return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
            case 'SILVER':
                return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
            case 'BRONZE':
                return 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200';
            default:
                return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
        }
    }

    function memberAchievementUrl(
        player: CoachAchievementPlayer,
        group: CoachAchievementGroup,
    ): string {
        return `${memberEvents.url(player.member, {
            query: {
                highlight_achievement: player.achievement_id,
                highlight_event: group.event.id,
                highlight_participation: player.participation_id,
            },
        })}#achievement-${player.achievement_id}`;
    }

    function toggleAchievementGroup(groupId: string): void {
        setExpandedAchievementGroups((current) =>
            current.includes(groupId)
                ? current.filter((id) => id !== groupId)
                : [...current, groupId],
        );
    }

    function resetCertificationForm() {
        setEditingCertification(null);
        certificationForm.setData({
            id: '',
            name: '',
            certificate_type: '',
            issuer: '',
            issued_at: '',
            expired_at: '',
            attachment: null,
        });
        certificationForm.clearErrors();
    }

    function openAddCertificationDialog() {
        resetCertificationForm();
        setCertificationDialogOpen(true);
    }

    function openEditCertificationDialog(certification: CoachCertification) {
        setEditingCertification(certification);
        certificationForm.setData({
            id: String(certification.id),
            name: certification.name,
            certificate_type: certification.certificate_type ?? '',
            issuer: certification.issuer ?? '',
            issued_at: certification.issued_at ?? '',
            expired_at: certification.expired_at ?? '',
            attachment: null,
        });
        certificationForm.clearErrors();
        setCertificationDialogOpen(true);
    }

    function submitCertification(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        certificationForm.transform((data) => ({
            ...data,
            id: data.id || null,
            certificate_type: data.certificate_type || null,
            issuer: data.issuer || null,
            issued_at: data.issued_at || null,
            expired_at: data.expired_at || null,
        }));

        certificationForm.post(storeCoachCertification.url(coach), {
            preserveScroll: true,
            onSuccess: () => {
                setCertificationDialogOpen(false);
                resetCertificationForm();
            },
        });
    }

    function removeCertification(certificationId: number) {
        router.delete(
            destroyCoachCertification.url({
                coach,
                certification: certificationId,
            }),
            { preserveScroll: true },
        );
    }

    function resetPromotionForm() {
        setEditingPromotion(null);
        promotionForm.setData({
            promotion_date: '',
            from_rank: '',
            to_rank: '',
            cash_reward_amount: '',
            cash_reward_date: '',
            cash_reward_reference: '',
            cash_reward_remarks: '',
            reason: '',
            remarks: '',
            evidences: [],
        });
        setRewardEvidenceSelection([]);
        setSelectedRewardSessionId('all');
        promotionForm.clearErrors();
    }

    function openAddPromotionDialog(
        mode: 'promotion' | 'reward' = 'promotion',
    ) {
        resetPromotionForm();
        setPromotionDialogMode(mode);
        setSelectedRewardSessionId(
            mode === 'reward' && rewardSessionOptions[0]
                ? String(rewardSessionOptions[0].id)
                : 'all',
        );
        setPromotionDialogOpen(true);
    }

    function openEditPromotionDialog(
        promotion: CoachPromotion,
        mode: 'promotion' | 'reward' = hasPromotionFields(promotion)
            ? 'promotion'
            : 'reward',
    ) {
        setEditingPromotion(promotion);
        setPromotionDialogMode(mode);
        promotionForm.setData({
            promotion_date: promotion.promotion_date ?? '',
            from_rank: promotion.from_rank ?? '',
            to_rank: promotion.to_rank ?? '',
            cash_reward_amount: promotion.cash_reward_amount ?? '',
            cash_reward_date: promotion.cash_reward_date ?? '',
            cash_reward_reference: promotion.cash_reward_reference ?? '',
            cash_reward_remarks: promotion.cash_reward_remarks ?? '',
            reason: promotion.reason ?? '',
            remarks: promotion.remarks ?? '',
            evidences: [],
        });
        setRewardEvidenceSelection(
            promotion.evidences
                .filter((evidence) => evidence.team_id !== null)
                .map((evidence) => ({
                    session_id: evidence.session_id,
                    tournament_id: evidence.tournament_id,
                    team_id: evidence.team_id as number,
                })),
        );
        setSelectedRewardSessionId(
            mode === 'reward' && promotion.evidences[0]
                ? String(promotion.evidences[0].session_id)
                : 'all',
        );
        promotionForm.clearErrors();
        setPromotionDialogOpen(true);
    }

    function submitPromotion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const isRewardMode = promotionDialogMode === 'reward';

        promotionForm.transform((data) => ({
            ...data,
            promotion_date: isRewardMode ? null : data.promotion_date || null,
            from_rank: isRewardMode ? null : data.from_rank || null,
            to_rank: isRewardMode ? null : data.to_rank || null,
            cash_reward_amount: data.cash_reward_amount || null,
            cash_reward_date: data.cash_reward_date || null,
            cash_reward_reference: data.cash_reward_reference || null,
            cash_reward_remarks: data.cash_reward_remarks || null,
            reason: isRewardMode ? null : data.reason || null,
            remarks: isRewardMode ? null : data.remarks || null,
            evidences: rewardEvidenceSelection,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setPromotionDialogOpen(false);
                resetPromotionForm();
            },
        };

        if (editingPromotion) {
            promotionForm.patch(
                updateCoachPromotion.url({
                    coach,
                    promotion: editingPromotion.id,
                }),
                options,
            );

            return;
        }

        promotionForm.post(storeCoachPromotion.url(coach), options);
    }

    function removePromotion(promotionId: number) {
        router.delete(
            destroyCoachPromotion.url({
                coach,
                promotion: promotionId,
            }),
            { preserveScroll: true },
        );
    }

    function resetSportForm() {
        setEditingSport(null);
        sportForm.setData({
            sport_id: '',
            level_master_id: '',
            level: '',
            sport_event: '',
            is_primary: false,
            effective_from: '',
            effective_to: '',
            notes: '',
        });
        sportForm.clearErrors();
    }

    function openAddSportDialog() {
        resetSportForm();
        setSportDialogOpen(true);
    }

    function openEditSportDialog(sport: CoachSport) {
        setEditingSport(sport);
        sportForm.setData({
            sport_id: String(sport.id),
            level_master_id: sport.level_master_id
                ? String(sport.level_master_id)
                : '',
            level: sport.level ?? '',
            sport_event: sport.sport_event ?? '',
            is_primary: sport.is_primary,
            effective_from: sport.effective_from ?? '',
            effective_to: sport.effective_to ?? '',
            notes: sport.notes ?? '',
        });
        sportForm.clearErrors();
        setSportDialogOpen(true);
    }

    function submitSport(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        sportForm.transform((data) => ({
            ...data,
            sport_id: data.sport_id,
            level_master_id: data.level_master_id || null,
            level: data.level || null,
            sport_event: data.sport_event || null,
            effective_from: data.effective_from || null,
            effective_to: data.effective_to || null,
            notes: data.notes || null,
        }));

        sportForm.post(storeCoachSport.url(coach), {
            preserveScroll: true,
            onSuccess: () => {
                setSportDialogOpen(false);
                resetSportForm();
            },
        });
    }

    function removeSport(coachSportId: number | null) {
        if (coachSportId === null) {
            return;
        }

        router.delete(
            destroyCoachSport.url({
                coach,
                coachSport: coachSportId,
            }),
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title={coach.full_name} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {coach.full_name}
                        </h1>
                        {coach.display_name ? (
                            <p className="text-sm text-muted-foreground">
                                {coach.display_name}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={coachesIndex.url()}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={`/coaches/${coach.id}/preview`}
                                target="_blank"
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print preview')}
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setExportMode('download');
                                setExportOpen(true);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Export')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editCoach.url(coach)}>{t('Edit')}</Link>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                        >
                            {t('Delete')}
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                {coach.photo_path ? (
                                    <img
                                        src={`/storage/${coach.photo_path}`}
                                        alt={coach.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Camera className="h-7 w-7 text-muted-foreground" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <Badge
                                        variant={
                                            teamActivityStatus === 'active'
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        {teamActivityStatus === 'active'
                                            ? t('Active')
                                            : t('Inactive')}
                                    </Badge>
                                    {coach.coach_status ? (
                                        <Badge variant="outline">
                                            {t('Profile')}:{' '}
                                            {t(coach.coach_status)}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {coach.pno
                                        ? `${t('PNO')}: ${coach.pno}`
                                        : t('Coach profile')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => photoInputRef.current?.click()}
                            >
                                <Camera className="mr-1.5 h-4 w-4" />
                                {t('Upload photo')}
                            </Button>
                            {coach.photo_path ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemovePhoto}
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    {t('Remove photo')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab}>
                    <TabsList className="flex-wrap justify-start overflow-x-visible">
                        <TabsTrigger value="overview" asChild>
                            <Link href={coachOverview.url(coach)}>
                                {t('Overview')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" asChild>
                            <Link href={coachAssignments.url(coach)}>
                                {t('Teams')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="sports" asChild>
                            <Link href={coachSports.url(coach)}>
                                {t('Sports')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="certifications" asChild>
                            <Link href={coachCertifications.url(coach)}>
                                {t('Certifications')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="achievements" asChild>
                            <Link href={coachAchievementsTab.url(coach)}>
                                {t('Achievements')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="special-achievements" asChild>
                            <Link
                                href={coachSpecialAchievementsTab.url(coach)}
                                prefetch
                            >
                                {t('Special achievements')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="promotions" asChild>
                            <Link href={coachPromotions.url(coach)}>
                                {t('Promotions & Rewards')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="media" asChild>
                            <Link href={coachMedia.url(coach)}>
                                {t('Media')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="changelog" asChild>
                            <Link href={coachChangelog.url(coach)}>
                                {t('Change log')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="status" asChild>
                            <Link href={coachStatus.url(coach)}>
                                {t('Status history')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="space-y-4">
                            <div className="rounded-xl border bg-card p-6">
                                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {detail(
                                        t('Display name'),
                                        coach.display_name ?? '',
                                    )}
                                    {detail(
                                        t('NIS info'),
                                        coach.nis_master?.name ?? '',
                                    )}
                                    {detail(t('Email'), coach.email ?? '')}
                                    {detail(
                                        t('Gender'),
                                        genderLabel(coach.gender, t),
                                    )}
                                    {detail(
                                        t('Date of birth'),
                                        coach.date_of_birth ?? '',
                                    )}
                                    {detail(t('Address'), coach.address ?? '')}
                                    {detail(
                                        t('Team status'),
                                        teamActivityStatus === 'active'
                                            ? t('Active')
                                            : t('Inactive'),
                                    )}
                                    {detail(
                                        t('Profile status'),
                                        coach.coach_status ?? '',
                                    )}
                                    {detail(t('PNO'), coach.pno ?? '')}
                                    {detail(t('Mobile'), coach.mobile ?? '')}
                                </dl>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="certifications">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Certifications')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Manage certifications without editing the full coach profile.',
                                        )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={openAddCertificationDialog}
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Add certification')}
                                </Button>
                            </div>

                            <div className="rounded-xl border bg-card">
                                {(coach.certifications ?? []).length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground">
                                        {t('No certifications yet.')}
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Type')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Issuer')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Issued')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Expired')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Attachment')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Actions')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(coach.certifications ?? []).map(
                                                (certification) => (
                                                    <TableRow
                                                        key={certification.id}
                                                    >
                                                        <TableCell className="font-medium">
                                                            {certification.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.certificate_type ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.issuer ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.issued_at ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.expired_at ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.attachment ? (
                                                                <ConfidentialDocumentPreview
                                                                    document={
                                                                        certification.attachment
                                                                    }
                                                                    triggerLabel={t(
                                                                        'View document',
                                                                    )}
                                                                />
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        openEditCertificationDialog(
                                                                            certification,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-1.5 h-4 w-4" />
                                                                    {t('Edit')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        removeCertification(
                                                                            certification.id,
                                                                        )
                                                                    }
                                                                >
                                                                    {t(
                                                                        'Remove',
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="sports">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Sports')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Manage sport specializations without editing the full coach profile.',
                                        )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={openAddSportDialog}
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Add sport')}
                                </Button>
                            </div>

                            <div className="rounded-xl border bg-card">
                                {(coach.sports ?? []).length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground">
                                        {t('No sports specialization yet.')}
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Sport')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Primary')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Level')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Event / Weight')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('From')}
                                                </TableHead>
                                                <TableHead>{t('To')}</TableHead>
                                                <TableHead>
                                                    {t('Notes')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Actions')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(coach.sports ?? []).map(
                                                (sport) => (
                                                    <TableRow key={sport.id}>
                                                        <TableCell className="font-medium">
                                                            {sport.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.is_primary
                                                                ? t('Yes')
                                                                : t('No')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.level ?? ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.sport_event ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.effective_from ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.effective_to ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sport.notes ?? ''}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        openEditSportDialog(
                                                                            sport,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-1.5 h-4 w-4" />
                                                                    {t('Edit')}
                                                                </Button>
                                                                {sport.coach_sport_id !==
                                                                null ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            removeSport(
                                                                                sport.coach_sport_id,
                                                                            )
                                                                        }
                                                                    >
                                                                        {t(
                                                                            'Remove',
                                                                        )}
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments">
                        <div className="rounded-xl border bg-card">
                            <Deferred
                                data="coachTeams"
                                fallback={
                                    <div className="space-y-2 p-4">
                                        {[1, 2, 3].map((n) => (
                                            <div
                                                key={n}
                                                className="h-12 w-full animate-pulse rounded bg-muted"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>
                                                {t('Session')}
                                            </TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>
                                                {t('Current')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Assigned')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Removed')}
                                            </TableHead>
                                            <TableHead>{t('Notes')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignmentRows.length > 0 ? (
                                            assignmentRows.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell>
                                                        {assignment.team_name ??
                                                            assignment.team
                                                                ?.name ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.session_name ??
                                                            assignment.session
                                                                ?.name ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.role}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.is_current
                                                            ? t('Current')
                                                            : t('Historical')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.assigned_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.removed_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.notes ?? ''}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    {t('No assignments yet.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    <TabsContent value="achievements">
                        <div className="space-y-4 rounded-xl border bg-card p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        {t('Coached player achievements')}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Medals earned by players from teams coached by this coach in the matching session.',
                                        )}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                        {achievementSummary.total_events}{' '}
                                        {t('events')}
                                    </Badge>
                                    <Badge variant="outline">
                                        {
                                            achievementSummary.medal_winning_players
                                        }{' '}
                                        {t('players')}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {(
                                    [
                                        'GOLD',
                                        'SILVER',
                                        'BRONZE',
                                        'MERIT',
                                    ] as const
                                ).map((medal) => (
                                    <div
                                        key={medal}
                                        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
                                    >
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${medalBadgeClass(medal)}`}
                                        >
                                            <Medal className="h-3.5 w-3.5" />
                                            {t(medal)}
                                        </span>
                                        <span className="text-lg font-semibold">
                                            {achievementSummary[medal]}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_11rem_11rem_11rem]">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={achievementSearch}
                                        onChange={(event) =>
                                            setAchievementSearch(
                                                event.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'Search teams, events, players…',
                                        )}
                                        className="pl-9"
                                    />
                                </div>
                                <Select
                                    value={achievementSessionFilter}
                                    onValueChange={setAchievementSessionFilter}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t('Session')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {t('All sessions')}
                                        </SelectItem>
                                        {achievementSessions.map(
                                            ([id, name]) => (
                                                <SelectItem key={id} value={id}>
                                                    {name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={achievementTierFilter}
                                    onValueChange={setAchievementTierFilter}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Tier')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {t('All tiers')}
                                        </SelectItem>
                                        {achievementTiers.map(([id, name]) => (
                                            <SelectItem key={id} value={id}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={achievementMedalFilter}
                                    onValueChange={setAchievementMedalFilter}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Medal')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {t('All medals')}
                                        </SelectItem>
                                        {(
                                            [
                                                'GOLD',
                                                'SILVER',
                                                'BRONZE',
                                                'MERIT',
                                            ] as const
                                        ).map((medal) => (
                                            <SelectItem
                                                key={medal}
                                                value={medal}
                                            >
                                                {t(medal)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {achievementGroups.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    {t(
                                        'No coached player achievements recorded yet.',
                                    )}
                                </div>
                            ) : filteredAchievementGroups.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    {t('No results')}
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border">
                                    <Table className="text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('S.No.')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Tournament')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Tier')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Team')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Events')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Players')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Highest medal')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Prize given')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Prize type')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Prize money')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Prize date')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {achievementTournamentGroups.map(
                                                (tournamentGroup, index) => {
                                                    const expanded =
                                                        expandedAchievementTournaments.includes(
                                                            tournamentGroup.id,
                                                        );
                                                    let rowNumber = 0;

                                                    return (
                                                        <Fragment
                                                            key={
                                                                tournamentGroup.id
                                                            }
                                                        >
                                                            <TableRow
                                                                className="cursor-pointer align-top hover:bg-muted/40"
                                                                onClick={() =>
                                                                    toggleAchievementTournament(
                                                                        tournamentGroup.id,
                                                                    )
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {expanded ? (
                                                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        ) : (
                                                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        )}
                                                                        {index +
                                                                            1}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="min-w-52 space-y-1">
                                                                        <div className="font-medium">
                                                                            {
                                                                                tournamentGroup
                                                                                    .tournament
                                                                                    .name
                                                                            }
                                                                        </div>
                                                                        <div className="text-muted-foreground">
                                                                            {[
                                                                                tournamentGroup
                                                                                    .tournament
                                                                                    .venue,
                                                                                tournamentGroup
                                                                                    .tournament
                                                                                    .date_from,
                                                                            ]
                                                                                .filter(
                                                                                    Boolean,
                                                                                )
                                                                                .join(
                                                                                    ' · ',
                                                                                ) ||
                                                                                '—'}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {tournamentGroup
                                                                            .tournament
                                                                            .tier_code ??
                                                                            t(
                                                                                'Unknown',
                                                                            )}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {
                                                                        tournamentGroup
                                                                            .session
                                                                            .name
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    {
                                                                        tournamentGroup
                                                                            .team
                                                                            .name
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {
                                                                        tournamentGroup
                                                                            .rows
                                                                            .length
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {
                                                                        tournamentGroup.playerCount
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    {highestMedalLabel(
                                                                        tournamentGroup.medalCounts,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {tournamentGroup.rewardCount >
                                                                    0
                                                                        ? t(
                                                                              'Yes',
                                                                          )
                                                                        : t(
                                                                              'No',
                                                                          )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {tournamentGroup.rewardCount >
                                                                    0
                                                                        ? t(
                                                                              'Cash reward',
                                                                          )
                                                                        : '—'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {tournamentGroup.prizeMoney >
                                                                    0
                                                                        ? `₹${tournamentGroup.prizeMoney.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                        : '—'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {Array.from(
                                                                        new Set(
                                                                            tournamentGroup.rewardDates,
                                                                        ),
                                                                    ).join(
                                                                        ', ',
                                                                    ) || '—'}
                                                                </TableCell>
                                                            </TableRow>
                                                            {expanded ? (
                                                                <TableRow>
                                                                    <TableCell
                                                                        colSpan={
                                                                            12
                                                                        }
                                                                        className="bg-muted/20 p-0"
                                                                    >
                                                                        <Table className="text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5">
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead>
                                                                                        {t(
                                                                                            'S.No.',
                                                                                        )}
                                                                                    </TableHead>
                                                                                    <TableHead>
                                                                                        {t(
                                                                                            'Event',
                                                                                        )}
                                                                                    </TableHead>
                                                                                    <TableHead>
                                                                                        {t(
                                                                                            'Date',
                                                                                        )}
                                                                                    </TableHead>
                                                                                    <TableHead>
                                                                                        {t(
                                                                                            'Class',
                                                                                        )}
                                                                                    </TableHead>
                                                                                    <TableHead>
                                                                                        {t(
                                                                                            'Medals',
                                                                                        )}
                                                                                    </TableHead>
                                                                                    <TableHead className="text-right">
                                                                                        {t(
                                                                                            'Players',
                                                                                        )}
                                                                                    </TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {tournamentGroup.rows.map(
                                                                                    (
                                                                                        group,
                                                                                    ) => {
                                                                                        const expanded =
                                                                                            expandedAchievementGroups.includes(
                                                                                                group.id,
                                                                                            );

                                                                                        return (
                                                                                            <Fragment
                                                                                                key={
                                                                                                    group.id
                                                                                                }
                                                                                            >
                                                                                                <TableRow
                                                                                                    className="cursor-pointer align-top hover:bg-muted/40"
                                                                                                    onClick={() =>
                                                                                                        toggleAchievementGroup(
                                                                                                            group.id,
                                                                                                        )
                                                                                                    }
                                                                                                >
                                                                                                    <TableCell>
                                                                                                        <div className="flex items-center gap-1.5">
                                                                                                            {expanded ? (
                                                                                                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                                            ) : (
                                                                                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                                            )}
                                                                                                            {
                                                                                                                ++rowNumber
                                                                                                            }
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                        <div className="max-w-[14rem] space-y-1">
                                                                                                            <div className="font-medium">
                                                                                                                {
                                                                                                                    group
                                                                                                                        .event
                                                                                                                        .name
                                                                                                                }
                                                                                                            </div>
                                                                                                            {group
                                                                                                                .event
                                                                                                                .discipline ||
                                                                                                            group
                                                                                                                .event
                                                                                                                .weight_category ? (
                                                                                                                <p className="text-xs text-muted-foreground">
                                                                                                                    {[
                                                                                                                        group
                                                                                                                            .event
                                                                                                                            .discipline,
                                                                                                                        group
                                                                                                                            .event
                                                                                                                            .weight_category,
                                                                                                                    ]
                                                                                                                        .filter(
                                                                                                                            Boolean,
                                                                                                                        )
                                                                                                                        .join(
                                                                                                                            ' · ',
                                                                                                                        )}
                                                                                                                </p>
                                                                                                            ) : null}
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                        {group
                                                                                                            .tournament
                                                                                                            .date_from ??
                                                                                                            t(
                                                                                                                'No date',
                                                                                                            )}
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                        {group
                                                                                                            .event
                                                                                                            .gender_class
                                                                                                            ? t(
                                                                                                                  group
                                                                                                                      .event
                                                                                                                      .gender_class,
                                                                                                              )
                                                                                                            : '—'}
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                                            {(
                                                                                                                [
                                                                                                                    'GOLD',
                                                                                                                    'SILVER',
                                                                                                                    'BRONZE',
                                                                                                                    'MERIT',
                                                                                                                ] as const
                                                                                                            ).map(
                                                                                                                (
                                                                                                                    medal,
                                                                                                                ) =>
                                                                                                                    group
                                                                                                                        .medal_counts[
                                                                                                                        medal
                                                                                                                    ] >
                                                                                                                    0 ? (
                                                                                                                        <span
                                                                                                                            key={
                                                                                                                                medal
                                                                                                                            }
                                                                                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${medalBadgeClass(medal)}`}
                                                                                                                        >
                                                                                                                            {t(
                                                                                                                                medal,
                                                                                                                            )}

                                                                                                                            :{' '}
                                                                                                                            {
                                                                                                                                group
                                                                                                                                    .medal_counts[
                                                                                                                                    medal
                                                                                                                                ]
                                                                                                                            }
                                                                                                                        </span>
                                                                                                                    ) : null,
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="text-right">
                                                                                                        {
                                                                                                            group
                                                                                                                .players
                                                                                                                .length
                                                                                                        }
                                                                                                    </TableCell>
                                                                                                </TableRow>
                                                                                                {expanded ? (
                                                                                                    <TableRow>
                                                                                                        <TableCell
                                                                                                            colSpan={
                                                                                                                6
                                                                                                            }
                                                                                                            className="bg-muted/20 p-0"
                                                                                                        >
                                                                                                            <Table className="text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5">
                                                                                                                <TableHeader>
                                                                                                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                                                                                        <TableHead className="pl-8">
                                                                                                                            {t(
                                                                                                                                'S.No.',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                        <TableHead>
                                                                                                                            {t(
                                                                                                                                'Player',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                        <TableHead>
                                                                                                                            {t(
                                                                                                                                'PNO',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                        <TableHead>
                                                                                                                            {t(
                                                                                                                                'Medal',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                        <TableHead>
                                                                                                                            {t(
                                                                                                                                'Position',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                        <TableHead>
                                                                                                                            {t(
                                                                                                                                'Remarks',
                                                                                                                            )}
                                                                                                                        </TableHead>
                                                                                                                    </TableRow>
                                                                                                                </TableHeader>
                                                                                                                <TableBody>
                                                                                                                    {group.players.map(
                                                                                                                        (
                                                                                                                            player,
                                                                                                                            index,
                                                                                                                        ) => {
                                                                                                                            const playerAchievementUrl =
                                                                                                                                memberAchievementUrl(
                                                                                                                                    player,
                                                                                                                                    group,
                                                                                                                                );

                                                                                                                            return (
                                                                                                                                <TableRow
                                                                                                                                    key={
                                                                                                                                        player.achievement_id
                                                                                                                                    }
                                                                                                                                    className="bg-background/80"
                                                                                                                                >
                                                                                                                                    <TableCell className="pl-8 text-muted-foreground">
                                                                                                                                        {index +
                                                                                                                                            1}
                                                                                                                                    </TableCell>
                                                                                                                                    <TableCell>
                                                                                                                                        <a
                                                                                                                                            href={
                                                                                                                                                playerAchievementUrl
                                                                                                                                            }
                                                                                                                                            target="_blank"
                                                                                                                                            rel="noreferrer"
                                                                                                                                            className="font-medium text-primary underline-offset-4 hover:underline"
                                                                                                                                            title={t(
                                                                                                                                                'Open member achievement in a new tab',
                                                                                                                                            )}
                                                                                                                                        >
                                                                                                                                            {
                                                                                                                                                player
                                                                                                                                                    .member
                                                                                                                                                    .full_name
                                                                                                                                            }
                                                                                                                                        </a>
                                                                                                                                    </TableCell>
                                                                                                                                    <TableCell>
                                                                                                                                        {player
                                                                                                                                            .member
                                                                                                                                            .pno ? (
                                                                                                                                            <a
                                                                                                                                                href={
                                                                                                                                                    playerAchievementUrl
                                                                                                                                                }
                                                                                                                                                target="_blank"
                                                                                                                                                rel="noreferrer"
                                                                                                                                                className="text-primary underline-offset-4 hover:underline"
                                                                                                                                                title={t(
                                                                                                                                                    'Open member achievement in a new tab',
                                                                                                                                                )}
                                                                                                                                            >
                                                                                                                                                {
                                                                                                                                                    player
                                                                                                                                                        .member
                                                                                                                                                        .pno
                                                                                                                                                }
                                                                                                                                            </a>
                                                                                                                                        ) : (
                                                                                                                                            <span className="text-muted-foreground">
                                                                                                                                                —
                                                                                                                                            </span>
                                                                                                                                        )}
                                                                                                                                    </TableCell>
                                                                                                                                    <TableCell>
                                                                                                                                        <span
                                                                                                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${medalBadgeClass(player.medal_type)}`}
                                                                                                                                        >
                                                                                                                                            {t(
                                                                                                                                                player.medal_type,
                                                                                                                                            )}
                                                                                                                                        </span>
                                                                                                                                    </TableCell>
                                                                                                                                    <TableCell>
                                                                                                                                        #
                                                                                                                                        {player.position ??
                                                                                                                                            player.participation_position ??
                                                                                                                                            '—'}
                                                                                                                                    </TableCell>
                                                                                                                                    <TableCell className="max-w-xs text-muted-foreground">
                                                                                                                                        <span className="line-clamp-2">
                                                                                                                                            {player.remarks ??
                                                                                                                                                '—'}
                                                                                                                                        </span>
                                                                                                                                    </TableCell>
                                                                                                                                </TableRow>
                                                                                                                            );
                                                                                                                        },
                                                                                                                    )}
                                                                                                                </TableBody>
                                                                                                            </Table>
                                                                                                        </TableCell>
                                                                                                    </TableRow>
                                                                                                ) : null}
                                                                                            </Fragment>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : null}
                                                        </Fragment>
                                                    );
                                                },
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="special-achievements">
                        <Deferred
                            data="specialAchievements"
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
                            <CoachSpecialAchievementsTab
                                coach={coach}
                                data={specialAchievements}
                            />
                        </Deferred>
                    </TabsContent>

                    <TabsContent value="promotions">
                        <div className="rounded-xl border bg-card">
                            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        {t('Promotions & Rewards')}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Manage promotion and cash reward records without editing the full coach profile.',
                                        )}
                                    </p>
                                </div>
                                {activePromotionTab === 'promotions' ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                            openAddPromotionDialog('promotion')
                                        }
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('Add promotion')}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                            openAddPromotionDialog('reward')
                                        }
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('Add cash reward')}
                                    </Button>
                                )}
                            </div>

                            <div className="border-b px-4 py-3">
                                <Tabs
                                    value={activePromotionTab}
                                    onValueChange={(value) =>
                                        setActivePromotionTab(
                                            value as 'promotions' | 'rewards',
                                        )
                                    }
                                >
                                    <TabsList>
                                        <TabsTrigger value="promotions">
                                            {t('Promotions')}
                                        </TabsTrigger>
                                        <TabsTrigger value="rewards">
                                            {t('Rewards')}
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {activePromotionRows.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {activePromotionTab === 'promotions'
                                        ? t('No promotions yet.')
                                        : t('No rewards yet.')}
                                </div>
                            ) : activePromotionTab === 'promotions' ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>
                                                {t('From rank')}
                                            </TableHead>
                                            <TableHead>
                                                {t('To rank')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Decision date')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Reason / Remarks')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Tournament events')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Recorded by')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Actions')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activePromotionRows.map(
                                            (promotion) => (
                                                <TableRow key={promotion.id}>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={promotionCategoryClass(
                                                                promotion,
                                                            )}
                                                        >
                                                            {promotionCategory(
                                                                promotion,
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.from_rank ? (
                                                            rankLabel(
                                                                promotion.from_rank,
                                                            )
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                —
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.to_rank ? (
                                                            rankLabel(
                                                                promotion.to_rank,
                                                            )
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                —
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.promotion_date ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="max-w-[18rem]">
                                                        <span className="line-clamp-2">
                                                            {promotion.reason ??
                                                                promotion.remarks ??
                                                                '—'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[18rem]">
                                                        {renderPromotionEvidenceSummary(
                                                            promotion,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.recorded_by_name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openEditPromotionDialog(
                                                                        promotion,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    removePromotion(
                                                                        promotion.id,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {t('Remove')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>
                                                {t('Reward date')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Reward amount')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Tournament events')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Reference')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Remarks')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Recorded by')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Actions')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activePromotionRows.map(
                                            (promotion) => (
                                                <TableRow key={promotion.id}>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={promotionCategoryClass(
                                                                promotion,
                                                            )}
                                                        >
                                                            {promotionCategory(
                                                                promotion,
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.cash_reward_date ??
                                                            promotion.promotion_date ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.cash_reward_amount ? (
                                                            `₹${promotion.cash_reward_amount}`
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                —
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-[18rem]">
                                                        {renderPromotionEvidenceSummary(
                                                            promotion,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.cash_reward_reference ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="max-w-[18rem]">
                                                        <span className="line-clamp-2">
                                                            {promotion.cash_reward_remarks ??
                                                                '—'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {promotion.recorded_by_name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openEditPromotionDialog(
                                                                        promotion,
                                                                        hasPromotionFields(
                                                                            promotion,
                                                                        )
                                                                            ? 'promotion'
                                                                            : 'reward',
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    removePromotion(
                                                                        promotion.id,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {t('Remove')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="media">
                        <EmptyCoachTab
                            title={t('Media')}
                            message={t('No media files recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="changelog">
                        <Deferred
                            data="auditLog"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <div
                                            key={n}
                                            className="h-14 w-full animate-pulse rounded bg-muted"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog
                                entries={auditLog}
                                primaryEntity="Coach"
                                storageKey="coach-changelog-view"
                            />
                        </Deferred>
                    </TabsContent>

                    <TabsContent value="status">
                        <div className="space-y-4 rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between gap-3">
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
                            </div>
                            <Deferred
                                data="statusHistory"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <div
                                                key={n}
                                                className="h-10 w-full animate-pulse rounded bg-muted"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <div className="divide-y">
                                    {statusRows.length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            {t('No status records.')}
                                        </p>
                                    ) : (
                                        statusRows.map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between gap-3 py-3 text-sm"
                                            >
                                                <div className="space-y-0.5">
                                                    <Badge
                                                        variant={
                                                            BASE_STATUS_STYLES[
                                                                row.status
                                                            ] ?? 'outline'
                                                        }
                                                    >
                                                        {t(row.status)}
                                                    </Badge>
                                                    {row.reason ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.reason}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>{row.effective_on}</p>
                                                    {row.recorded_by_name ? (
                                                        <p>
                                                            {
                                                                row.recorded_by_name
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog
                open={promotionDialogOpen}
                onOpenChange={(open) => {
                    setPromotionDialogOpen(open);

                    if (!open) {
                        resetPromotionForm();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                    <form onSubmit={submitPromotion}>
                        <DialogHeader>
                            <DialogTitle>
                                {promotionDialogMode === 'reward'
                                    ? editingPromotion
                                        ? t('Edit reward')
                                        : t('Add cash reward')
                                    : editingPromotion
                                      ? t('Edit promotion')
                                      : t('Add promotion')}
                            </DialogTitle>
                            <DialogDescription>
                                {promotionDialogMode === 'reward'
                                    ? t(
                                          'Save a cash reward without changing the full coach profile.',
                                      )
                                    : t(
                                          'Save a promotion without changing the full coach profile.',
                                      )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {promotionDialogMode === 'promotion' ? (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="promotion_date">
                                                {t('Promotion date')}
                                            </Label>
                                            <DatePicker
                                                id="promotion_date"
                                                value={
                                                    promotionForm.data
                                                        .promotion_date
                                                }
                                                onChange={(value) =>
                                                    promotionForm.setData(
                                                        'promotion_date',
                                                        value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    promotionForm.errors
                                                        .promotion_date
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="from_rank">
                                                {t('From rank')}
                                            </Label>
                                            <Combobox
                                                id="from_rank"
                                                value={
                                                    promotionForm.data.from_rank
                                                }
                                                onValueChange={(value) =>
                                                    promotionForm.setData(
                                                        'from_rank',
                                                        value,
                                                    )
                                                }
                                                items={rankItems}
                                                placeholder={t('Select rank')}
                                                searchPlaceholder={t(
                                                    'Search ranks…',
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    promotionForm.errors
                                                        .from_rank
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="to_rank">
                                            {t('To rank')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Combobox
                                            id="to_rank"
                                            value={promotionForm.data.to_rank}
                                            onValueChange={(value) =>
                                                promotionForm.setData(
                                                    'to_rank',
                                                    value,
                                                )
                                            }
                                            items={rankItems}
                                            placeholder={t('Select rank')}
                                            searchPlaceholder={t(
                                                'Search ranks…',
                                            )}
                                        />
                                        <InputError
                                            message={
                                                promotionForm.errors.to_rank
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="reason">
                                            {t('Reason')}
                                        </Label>
                                        <Textarea
                                            id="reason"
                                            value={promotionForm.data.reason}
                                            onChange={(event) =>
                                                promotionForm.setData(
                                                    'reason',
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={
                                                promotionForm.errors.reason
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="promotion_remarks">
                                            {t('Remarks')}
                                        </Label>
                                        <Textarea
                                            id="promotion_remarks"
                                            value={promotionForm.data.remarks}
                                            onChange={(event) =>
                                                promotionForm.setData(
                                                    'remarks',
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={
                                                promotionForm.errors.remarks
                                            }
                                        />
                                    </div>

                                    {renderEvidencePicker('promotion')}
                                </>
                            ) : (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="cash_reward_amount">
                                                {t('Cash reward amount')}{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="cash_reward_amount"
                                                value={
                                                    promotionForm.data
                                                        .cash_reward_amount
                                                }
                                                onChange={(event) =>
                                                    promotionForm.setData(
                                                        'cash_reward_amount',
                                                        event.target.value,
                                                    )
                                                }
                                                inputMode="decimal"
                                            />
                                            <InputError
                                                message={
                                                    promotionForm.errors
                                                        .cash_reward_amount
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cash_reward_date">
                                                {t('Cash reward date')}
                                            </Label>
                                            <DatePicker
                                                id="cash_reward_date"
                                                value={
                                                    promotionForm.data
                                                        .cash_reward_date
                                                }
                                                onChange={(value) =>
                                                    promotionForm.setData(
                                                        'cash_reward_date',
                                                        value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    promotionForm.errors
                                                        .cash_reward_date
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="cash_reward_reference">
                                            {t('Cash reward reference')}
                                        </Label>
                                        <Input
                                            id="cash_reward_reference"
                                            value={
                                                promotionForm.data
                                                    .cash_reward_reference
                                            }
                                            onChange={(event) =>
                                                promotionForm.setData(
                                                    'cash_reward_reference',
                                                    event.target.value,
                                                )
                                            }
                                            maxLength={100}
                                        />
                                        <InputError
                                            message={
                                                promotionForm.errors
                                                    .cash_reward_reference
                                            }
                                        />
                                    </div>

                                    {renderEvidencePicker('reward')}

                                    <div className="grid gap-2">
                                        <Label htmlFor="cash_reward_remarks">
                                            {t('Cash reward remarks')}
                                        </Label>
                                        <Textarea
                                            id="cash_reward_remarks"
                                            value={
                                                promotionForm.data
                                                    .cash_reward_remarks
                                            }
                                            onChange={(event) =>
                                                promotionForm.setData(
                                                    'cash_reward_remarks',
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={
                                                promotionForm.errors
                                                    .cash_reward_remarks
                                            }
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPromotionDialogOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={promotionForm.processing}
                            >
                                {promotionDialogMode === 'reward'
                                    ? t('Save reward')
                                    : t('Save promotion')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={certificationDialogOpen}
                onOpenChange={(open) => {
                    setCertificationDialogOpen(open);

                    if (!open) {
                        resetCertificationForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <form onSubmit={submitCertification}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingCertification
                                    ? t('Edit certification')
                                    : t('Add certification')}
                            </DialogTitle>
                            <DialogDescription>
                                {t(
                                    'Save one certification without changing the full coach profile.',
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Name')}</Label>
                                <Input
                                    value={certificationForm.data.name}
                                    onChange={(event) =>
                                        certificationForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                                {certificationForm.errors.name ? (
                                    <p className="text-sm text-destructive">
                                        {certificationForm.errors.name}
                                    </p>
                                ) : null}
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Type')}</Label>
                                <Input
                                    value={
                                        certificationForm.data.certificate_type
                                    }
                                    onChange={(event) =>
                                        certificationForm.setData(
                                            'certificate_type',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Issuer')}</Label>
                                <Input
                                    value={certificationForm.data.issuer}
                                    onChange={(event) =>
                                        certificationForm.setData(
                                            'issuer',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Attachment')}</Label>
                                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                                    <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                        <Upload className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium break-words">
                                            {certificationForm.data.attachment
                                                ?.name ??
                                                t('Upload attachment')}
                                        </span>
                                        <span className="mt-1 block text-xs break-words text-muted-foreground">
                                            {t(
                                                'PDF, JPG, PNG, or WEBP. Stored privately and available only to authorized users.',
                                            )}
                                        </span>
                                        {editingCertification?.attachment ? (
                                            <span className="mt-1 block text-xs break-words text-muted-foreground">
                                                {t(
                                                    'Current file: :name — choose a file to replace',
                                                ).replace(
                                                    ':name',
                                                    editingCertification
                                                        .attachment
                                                        .original_name ??
                                                        t('Document'),
                                                )}
                                            </span>
                                        ) : null}
                                    </span>
                                    <Input
                                        key={
                                            certificationDialogOpen
                                                ? (editingCertification?.id ??
                                                  'new')
                                                : 'closed'
                                        }
                                        className="sr-only"
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png,image/webp"
                                        onChange={(event) =>
                                            certificationForm.setData(
                                                'attachment',
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </label>
                                <InputError
                                    message={
                                        certificationForm.errors.attachment
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Issued')}</Label>
                                <DatePicker
                                    value={certificationForm.data.issued_at}
                                    onChange={(value) =>
                                        certificationForm.setData(
                                            'issued_at',
                                            value,
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Expired')}</Label>
                                <DatePicker
                                    value={certificationForm.data.expired_at}
                                    onChange={(value) =>
                                        certificationForm.setData(
                                            'expired_at',
                                            value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setCertificationDialogOpen(false)
                                }
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    certificationForm.processing ||
                                    certificationForm.data.name.trim() === ''
                                }
                            >
                                {t('Save certification')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={sportDialogOpen}
                onOpenChange={(open) => {
                    setSportDialogOpen(open);

                    if (!open) {
                        resetSportForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <form onSubmit={submitSport}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingSport
                                    ? t('Edit sport')
                                    : t('Add sport')}
                            </DialogTitle>
                            <DialogDescription>
                                {t(
                                    'Save one sport specialization without changing the full coach profile.',
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 lg:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Sport')}</Label>
                                <Combobox
                                    value={sportForm.data.sport_id}
                                    onValueChange={(value) =>
                                        sportForm.setData('sport_id', value)
                                    }
                                    items={sportItems}
                                    placeholder={t('Select sport')}
                                    searchPlaceholder={t('Search sports…')}
                                />
                                {sportForm.errors.sport_id ? (
                                    <p className="text-sm text-destructive">
                                        {sportForm.errors.sport_id}
                                    </p>
                                ) : null}
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Tier / level')}</Label>
                                <Combobox
                                    value={sportForm.data.level_master_id}
                                    onValueChange={(value) => {
                                        const selected = tierItems.find(
                                            (tier) => tier.value === value,
                                        );

                                        sportForm.setData({
                                            ...sportForm.data,
                                            level_master_id: value,
                                            level: selected?.label ?? '',
                                        });
                                    }}
                                    items={tierItems}
                                    placeholder={t('Select tier / level')}
                                    searchPlaceholder={t('Search tiers…')}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Sport event / discipline')}</Label>
                                <Input
                                    value={sportForm.data.sport_event}
                                    onChange={(event) =>
                                        sportForm.setData(
                                            'sport_event',
                                            event.target.value,
                                        )
                                    }
                                    placeholder={t(
                                        'e.g. 100m, freestyle, kata',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('From')}</Label>
                                    <DatePicker
                                        value={sportForm.data.effective_from}
                                        onChange={(value) =>
                                            sportForm.setData(
                                                'effective_from',
                                                value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('To')}</Label>
                                    <DatePicker
                                        value={sportForm.data.effective_to}
                                        onChange={(value) =>
                                            sportForm.setData(
                                                'effective_to',
                                                value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Notes')}</Label>
                                <Input
                                    value={sportForm.data.notes}
                                    onChange={(event) =>
                                        sportForm.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <Checkbox
                                    checked={sportForm.data.is_primary}
                                    onCheckedChange={(checked) =>
                                        sportForm.setData(
                                            'is_primary',
                                            !!checked,
                                        )
                                    }
                                />
                                <span className="text-sm text-muted-foreground">
                                    {t('Mark as primary')}
                                </span>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSportDialogOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    sportForm.processing ||
                                    sportForm.data.sport_id === ''
                                }
                            >
                                {t('Save sport')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                onPrint={handlePrint}
                onDownload={() => (window.location.href = buildExportUrl())}
                exportMode={exportMode}
                t={t}
            />

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Delete coach')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Are you sure you want to delete this coach? This action cannot be undone.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CoachStatusDialog
                coach={coach}
                open={statusOpen}
                onOpenChange={setStatusOpen}
                t={t}
            />
        </>
    );
}

function EmptyCoachTab({ title, message }: { title: string; message: string }) {
    return (
        <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

function CoachStatusDialog({
    coach,
    open,
    onOpenChange,
    t,
}: {
    coach: Coach;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: (key: string) => string;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [status, setStatus] = useState(coach.coach_status ?? 'ACTIVE');
    const [effectiveOn, setEffectiveOn] = useState(today);
    const [reason, setReason] = useState('');

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.post(
            storeCoachStatus.url(coach),
            {
                status,
                effective_on: effectiveOn,
                reason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReason('');
                    onOpenChange(false);
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{t('Change status')}</DialogTitle>
                        <DialogDescription>
                            {t('Record this change in coach status history.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-1.5">
                            <Label>{t('Status')}</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COACH_STATUSES.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="coach-status-effective-on">
                                {t('Effective date')}
                            </Label>
                            <Input
                                id="coach-status-effective-on"
                                type="date"
                                value={effectiveOn}
                                onChange={(event) =>
                                    setEffectiveOn(event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="coach-status-reason">
                                {t('Reason')}
                            </Label>
                            <Input
                                id="coach-status-reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={!effectiveOn}>
                            {t('Save status')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    selectedColumns,
    setSelectedColumns,
    onPrint,
    onDownload,
    exportMode,
    t,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedColumns: string[];
    setSelectedColumns: Dispatch<SetStateAction<string[]>>;
    onPrint: () => void;
    onDownload: () => void;
    exportMode: 'print' | 'download';
    t: (key: string) => string;
}) {
    const isPrintPrimary = exportMode === 'print';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Export coach')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Choose columns, then print or download the current view.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
                    <p className="mb-3 text-sm font-medium">
                        {t('Select columns to export')}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ALL_COLUMNS.map((col) => (
                            <div
                                key={col.key}
                                className="flex items-center gap-2"
                            >
                                <Checkbox
                                    id={`coach-${col.key}`}
                                    checked={selectedColumns.includes(col.key)}
                                    onCheckedChange={(checked) =>
                                        setSelectedColumns((previous) =>
                                            checked
                                                ? previous.includes(col.key)
                                                    ? previous
                                                    : [...previous, col.key]
                                                : previous.filter(
                                                      (k) => k !== col.key,
                                                  ),
                                        )
                                    }
                                />
                                <Label htmlFor={`coach-${col.key}`}>
                                    {t(col.label)}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            onPrint();
                            onOpenChange(false);
                        }}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {isPrintPrimary ? t('Print') : t('Print preview')}
                    </Button>
                    <Button
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            onDownload();
                            onOpenChange(false);
                        }}
                    >
                        <Download className="mr-1.5 h-4 w-4" />
                        {t('Download Excel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
