import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    usePage,
} from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Download,
    ExternalLink,
    Medal,
    Minus,
    Trophy,
    Printer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { ComponentProps } from 'react';
import { show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import { store as storeAchievementContext } from '@/actions/App/Http/Controllers/MemberAchievementContextController';
import {
    edit as editMember,
    index as membersIndex,
    preview as previewMember,
    show as showMember,
} from '@/actions/App/Http/Controllers/MemberController';
import { show as exportMember } from '@/actions/App/Http/Controllers/MemberExportController';
import {
    store as storeMemberPhoto,
    destroy as destroyMemberPhoto,
} from '@/actions/App/Http/Controllers/MemberPhotoController';
import {
    changelog as memberChangelog,
    events as memberEvents,
    externalCoaching as memberExternalCoaching,
    media as memberMedia,
    performance as memberPerformance,
    promotions as memberPromotions,
    specialAchievements as memberSpecialAchievements,
    status as memberStatus,
    teams as memberTeamsRoute,
} from '@/actions/App/Http/Controllers/MemberProfileTabController';
import { show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import AlertError from '@/components/alert-error';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import { AliasInlineForm } from '@/components/members/alias-inline-form';
import { MemberMediaTab } from '@/components/members/member-media-tab';
import { MemberPerformanceTab } from '@/components/members/member-performance-tab';
import type { MemberPerformanceData } from '@/components/members/member-performance-tab';
import { MemberTeamsTab } from '@/components/members/member-teams-tab';
import type { MemberTeamRow } from '@/components/members/member-teams-tab';
import { ParticipationMediaSheet } from '@/components/members/participation-media-sheet';
import { PromotionsTab } from '@/components/members/promotions-tab';
import { SpecialAchievementsTab } from '@/components/members/special-achievements-tab';
import type { SpecialAchievementsData } from '@/components/members/special-achievements-tab';
import { StatusChangeModal } from '@/components/members/status-change-modal';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
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
import { useTranslation } from '@/hooks/use-translation';
import { resolveRankLabel } from '@/lib/ranks';

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name: string;
    father_name: string | null;
    rank: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    home_district: { id: number; name: string } | null;
    posting_district: { id: number; name: string } | null;
    current_unit: { id: number; name: string } | null;
    photo_path: string | null;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    initial_rank: string | null;
    home_address: string | null;
    sport: { id: number; name: string } | null;
    playable_sports: {
        id: number;
        name: string;
        role?: string | null;
        position?: string | null;
        sport_event?: string | null;
        weight?: string | null;
        notes?: string | null;
    }[];
    other_notes: string | null;
    team_since: string | null;
};

type StatusEntry = {
    id: number;
    status: string;
    effective_on: string;
    reason: string | null;
    recorded_by_name: string | null;
};
type Alias = { id: number; alias: string; source: string };

type EventTeamRow = {
    id: number;
    name: string;
    is_active: boolean;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string; is_current?: boolean } | null;
};

type TournamentOption = {
    id: number;
    session_id: number;
    tier_id: number;
    sport_id: number | null;
    name: string;
    venue: string | null;
    date_from: string | null;
    date_to: string | null;
    sports: { id: number; name: string }[];
};

type EventOption = {
    id: number;
    tournament_id: number;
    sport_id: number;
    name: string;
    event_type: 'individual' | 'team';
    participants_required: number | null;
    gender_class: 'M' | 'F' | 'MIXED' | 'OPEN';
    discipline: string | null;
    weight_category: string | null;
    sport: { id: number; name: string } | null;
    team_achievements?: Array<{
        team_id: number;
        team_name: string | null;
        medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | string | null;
        position: number | null;
    }>;
};

function displayPostingLocation(member: Member): string | null {
    return member.current_unit?.name ?? member.posting_district?.name ?? null;
}

function eventClassLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (value) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return value ?? '—';
    }
}

function humanizeCode(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    if (!value) {
        return '';
    }

    const translated = t(value);

    return translated === value ? humanizeCode(value) : translated;
}

function isEventGenderCompatible(
    memberGender: string | null | undefined,
    eventGender: string | null | undefined,
): boolean {
    const normalizedMemberGender = (memberGender ?? '').toUpperCase();
    const normalizedEventGender = (eventGender ?? '').toUpperCase();

    if (normalizedEventGender === '' || ['OPEN', 'MIXED'].includes(normalizedEventGender)) {
        return true;
    }

    if (['M', 'MALE'].includes(normalizedMemberGender)) {
        return normalizedEventGender === 'M';
    }

    if (['F', 'FEMALE'].includes(normalizedMemberGender)) {
        return normalizedEventGender === 'F';
    }

    return true;
}

function isOtherTierOrLevel(value: string | null | undefined): boolean {
    return value?.toUpperCase() === 'OTHER';
}

function parseDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(
    value: string | null | undefined,
    locale: string,
): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}

type ParticipationEntry = {
    id: number;
    position: number | null;
    media_files_count: number;
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        tier_weight: number | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
        session_id: number | null;
        sport: { id: number; name: string } | null;
    };
    event: {
        id: number;
        name: string;
        event_type?: 'individual' | 'team' | string | null;
        gender_class: string;
        discipline: string | null;
        weight_category: string | null;
        sport: { id: number; name: string } | null;
    };
    team: { id: number; name: string } | null;
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
    cash_reward_amount?: string | null;
    cash_reward_date?: string | null;
    cash_reward_reference?: string | null;
    cash_reward_remarks?: string | null;
    reason: string | null;
    remarks: string | null;
    recorded_by_name: string | null;
    evidences: {
        id: number;
        type: 'achievement' | 'participation';
        evidence_id: number;
    }[];
};

type RankOption = {
    code: string;
    name: string;
    name_en: string | null;
    short_name: string | null;
};

type AchievementPreviewTarget =
    | {
          kind: 'tournament';
          tournament: ParticipationEntry['tournament'];
          session: ParticipationGroup['session'];
      }
    | {
          kind: 'event';
          tournament: ParticipationEntry['tournament'];
          event: ParticipationEntry['event'];
          session: ParticipationGroup['session'];
      };

type AchievementsData = {
    summary: { GOLD: number; SILVER: number; BRONZE: number; MERIT: number };
    achievements: Array<{
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        session: { id: number; name: string };
        tournament: {
            id: number;
            name: string;
            tier_code: string | null;
            tier_weight: number | null;
            venue: string | null;
            date_from: string | null;
            date_to: string | null;
            sport: { id: number; name: string } | null;
        };
        event: { id: number; name: string };
        benefits: AchievementBenefitRow[];
    }>;
};

type AchievementFiltersState = {
    dateFrom: string;
    dateTo: string;
    search: string;
    session: 'all' | 'current' | string;
    medal: 'all' | 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | 'none';
    tier: string;
    eventClass: string;
    benefit: 'all' | 'benefit' | 'promotion';
};

type QuickAddAchievementForm = {
    tournament_id: string;
    event_id: string;
    reuse_mode: 'auto' | 'manual';
    tournament_name: string;
    session_id: string;
    session_name: string;
    session_start_year: string;
    session_end_year: string;
    is_historical_session: string;
    tier_id: string;
    sport_id: string;
    venue: string;
    date_from: string;
    date_to: string;
    event_name: string;
    event_sport_id: string;
    gender_class: 'M' | 'F' | 'MIXED' | 'OPEN';
    event_type: 'individual' | 'team';
    discipline: string;
    weight_category: string;
    participants_required: string;
    team_id: string;
    medal_type: '' | 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT';
    position: string;
    medal_position: string;
    remarks: string;
    provisional_reason: string;
    allow_inactive_member: string;
};

type ExternalCoachingData = {
    assignments: Array<{
        id: number;
        start_date: string | null;
        end_date: string | null;
        status: string;
        attendance_mode: string;
        external_coach: { id: number; name: string } | null;
        training_venue: { id: number; name: string } | null;
        sport: { id: number; name: string } | null;
    }>;
    attendances: Array<{
        id: number;
        attendance_date: string | null;
        attendance_status: string;
        geo_status: string;
        review_status: string;
        distance_from_venue_meters: string | null;
        flag_reason: string | null;
        external_coach: { name: string } | null;
        training_venue: { name: string } | null;
        sport: { name: string } | null;
    }>;
    performanceUpdates: Array<{
        id: number;
        update_date: string | null;
        performance_level: string | null;
        performance_score: number | null;
        training_summary: string;
        review_status: string;
        external_coach: { name: string } | null;
        sport: { name: string } | null;
    }>;
};

const ALL_COLUMNS: { key: string; label: string }[] = [
    // { key: 'member_code', label: 'Member code' },
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'father_name', label: "Father's name" },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'rank', label: 'Rank' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'current_status', label: 'Status' },
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'unit', label: 'Posting' },
    { key: 'home_district', label: 'Home district' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'initial_rank', label: 'Initial rank' },
    { key: 'playable_sports', label: 'Playable sports' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

const MEMBER_SHOW_TABS = [
    'overview',
    'teams',
    'events',
    'performance',
    'external-coaching',
    'special-achievements',
    'promotions',
    'changelog',
    'media',
    'status',
] as const;

type MemberShowTab = (typeof MEMBER_SHOW_TABS)[number];

export default function MembersShow({
    member,
    activeTab: activeTabProp = 'overview',
    statusHistory,
    aliases,
    memberTeams,
    participations: participationsProp,
    achievementsData: achievementsDataProp,
    promotions,
    specialAchievements,
    performance,
    externalCoaching,
    auditLog,
    media,
    sessions = [],
    sports = [],
    tiers = [],
    tournaments = [],
    events = [],
    eventTeams,
    ranks,
}: {
    member: Member;
    activeTab?: MemberShowTab;
    statusHistory?: StatusEntry[];
    aliases?: Alias[];
    memberTeams?: MemberTeamRow[];
    participations?: ParticipationGroup[];
    achievementsData?: AchievementsData;
    promotions?: PromotionRow[];
    specialAchievements?: SpecialAchievementsData;
    performance?: MemberPerformanceData;
    externalCoaching?: ExternalCoachingData;
    auditLog?: AuditEntry[];
    media?: ComponentProps<typeof MemberMediaTab>['initialData'];
    sessions?: { id: number; name: string }[];
    sports?: { id: number; name: string }[];
    tiers?: { id: number; code: string }[];
    tournaments?: TournamentOption[];
    events?: EventOption[];
    eventTeams?: EventTeamRow[];
    ranks?: RankOption[];
}) {
    const memberId = member.id;
    const activeTab = MEMBER_SHOW_TABS.includes(activeTabProp)
        ? activeTabProp
        : 'overview';
    const participations = participationsProp ?? null;
    const achievementsData = achievementsDataProp ?? null;
    const loadingParticipations = false;
    const loadingAchievements = false;
    const page = usePage();
    const permissions = page.props.auth.permissions;
    const canManageMemberBenefits = permissions.includes('members.manageBenefits');
    const { t } = useTranslation();
    const { locale: pageLocale } = page.props;
    const canDeleteMedia = permissions.includes('media.delete');
    const canUploadMedia = permissions.includes('media.upload');
    const [mediaParticipationId, setMediaParticipationId] = useState<{
        id: number;
        eventName: string;
    } | null>(null);
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const displayName = member.full_name;
    const sportName = (sport: { name: string }): string => sport.name;
    const tabLinks: Record<MemberShowTab, string> = {
        overview: showMember.url(member),
        teams: memberTeamsRoute.url(member),
        events: memberEvents.url(member),
        performance: memberPerformance.url(member),
        'external-coaching': memberExternalCoaching.url(member),
        'special-achievements': memberSpecialAchievements.url(member),
        promotions: memberPromotions.url(member),
        changelog: memberChangelog.url(member),
        media: memberMedia.url(member),
        status: memberStatus.url(member),
    };
    const highlightedAchievement = useMemo(() => {
        const queryString = page.url.split('?')[1]?.split('#')[0] ?? '';
        const params = new URLSearchParams(queryString);
        const numberParam = (key: string): number | null => {
            const value = Number(params.get(key));

            return Number.isFinite(value) && value > 0 ? value : null;
        };

        return {
            achievementId: numberParam('highlight_achievement'),
            eventId: numberParam('highlight_event'),
            participationId: numberParam('highlight_participation'),
        };
    }, [page.url]);

    const refreshMemberHistory = useCallback(() => {
        router.reload();
    }, []);
    const [mediaKey] = useState(0);

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: displayName ?? member.full_name },
        ],
    });

    const [statusOpen, setStatusOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [achievementPreview, setAchievementPreview] =
        useState<AchievementPreviewTarget | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );
    const [eventSearch, setEventSearch] = useState('');
    const [achievementFiltersOpen, setAchievementFiltersOpen] = useState(false);
    const [sessionFilter, setSessionFilter] = useState<
        'all' | 'current' | string
    >('all');
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddErrors, setQuickAddErrors] = useState<
        Record<string, string>
    >({});
    const [quickAddSaving, setQuickAddSaving] = useState(false);
    const [quickAddForm, setQuickAddForm] = useState<QuickAddAchievementForm>({
        tournament_id: '',
        event_id: '',
        reuse_mode: 'auto',
        tournament_name: '',
        session_id: '',
        session_name: '',
        session_start_year: '',
        session_end_year: '',
        is_historical_session: '',
        tier_id: '',
        sport_id: '',
        venue: '',
        date_from: '',
        date_to: '',
        event_name: '',
        event_sport_id: '',
        gender_class: 'OPEN',
        event_type: 'individual',
        discipline: '',
        weight_category: '',
        participants_required: '',
        team_id: '',
        medal_type: '',
        position: '',
        medal_position: '',
        remarks: '',
        provisional_reason: 'Match not found in system, create new context.',
        allow_inactive_member: '',
    });
    const [medalFilter, setMedalFilter] = useState<
        'all' | 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | 'none'
    >('all');
    const [tierFilter, setTierFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [benefitFilter, setBenefitFilter] = useState<
        'all' | 'benefit' | 'promotion'
    >('all');
    const [draftAchievementFilters, setDraftAchievementFilters] =
        useState<AchievementFiltersState>({
            dateFrom: '',
            dateTo: '',
            search: '',
            session: 'all',
            medal: 'all',
            tier: 'all',
            eventClass: 'all',
            benefit: 'all',
        });
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

    const promotionSummary = useCallback(
        (promotion: PromotionRow): string => {
            const parts: string[] = [];

            if (promotion.from_rank || promotion.to_rank) {
                const fromRank = promotion.from_rank ?? t('Unknown');
                const toRank = promotion.to_rank ?? t('Unknown');

                parts.push(`${fromRank} → ${toRank}`);
            }

            return parts.join(' · ');
        },
        [t],
    );

    const formatReadableDate = useCallback(
        (value: string | null): string | null => {
            if (!value) {
                return null;
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }).format(date);
        },
        [],
    );

    const achievementPrizeMoney = useCallback(
        (
            benefits: AchievementBenefitRow[] | undefined,
            promotionsForRow: PromotionRow[] = [],
        ): string[] => {
            const amounts: string[] = [];

            for (const benefit of benefits ?? []) {
                if (benefit.cash_amount) {
                    amounts.push(
                        [
                            `₹${benefit.cash_amount}`,
                            formatReadableDate(benefit.benefit_date),
                        ]
                            .filter(Boolean)
                            .join(' · '),
                    );
                }
            }

            for (const promotion of promotionsForRow) {
                if (promotion.cash_reward_amount) {
                    amounts.push(
                        [
                            `₹${promotion.cash_reward_amount}`,
                            formatReadableDate(
                                promotion.cash_reward_date ?? null,
                            ),
                        ]
                            .filter(Boolean)
                            .join(' · '),
                    );
                }
            }

            return amounts;
        },
        [formatReadableDate],
    );

    const achievementBenefitTypes = useCallback(
        (
            benefits: AchievementBenefitRow[] | undefined,
            promotionsForRow: PromotionRow[] = [],
        ): string[] => {
            const types: string[] = [];

            for (const benefit of benefits ?? []) {
                types.push(benefit.benefit_type);
            }

            for (const promotion of promotionsForRow) {
                if (promotion.to_rank) {
                    types.push('PROMOTION');
                }

                if (promotion.cash_reward_amount) {
                    types.push('CASH_AWARD');
                }
            }

            return [...new Set(types)];
        },
        [],
    );

    const resetQuickAddForm = useCallback((): QuickAddAchievementForm => {
        const session = sessions[0];

        return {
            tournament_id: '',
            event_id: '',
            reuse_mode: 'auto',
            tournament_name: '',
            session_id: session ? String(session.id) : '',
            session_name: '',
            session_start_year: '',
            session_end_year: '',
            is_historical_session: '',
            tier_id: '',
            sport_id: '',
            venue: '',
            date_from: '',
            date_to: '',
            event_name: '',
            event_sport_id: '',
            gender_class: 'OPEN',
            event_type: 'individual',
            discipline: '',
            weight_category: '',
            participants_required: '',
            team_id: '',
            medal_type: '',
            position: '',
            medal_position: '',
            remarks: '',
            provisional_reason: 'Match not found in system, create new context.',
            allow_inactive_member: '',
        };
    }, [sessions]);

    const quickAddSelectedSessionId = Number.parseInt(quickAddForm.session_id || '0', 10) || 0;
    const quickAddSelectedSportId = Number.parseInt(
        (quickAddForm.event_sport_id || quickAddForm.sport_id || '0') as string,
        10,
    ) || 0;
    const quickAddSelectedEvent = useMemo(
        () =>
            events.find(
                (event) => String(event.id) === quickAddForm.event_id,
            ) ?? null,
        [events, quickAddForm.event_id],
    );
    const quickAddSelectedTeamAchievement = useMemo(() => {
        if (quickAddSelectedEvent?.event_type !== 'team') {
            return null;
        }

        const teamAchievements = quickAddSelectedEvent.team_achievements ?? [];

        if (quickAddForm.team_id) {
            return (
                teamAchievements.find(
                    (achievement) =>
                        String(achievement.team_id) === quickAddForm.team_id,
                ) ?? null
            );
        }

        return teamAchievements.length === 1 ? teamAchievements[0] : null;
    }, [quickAddForm.team_id, quickAddSelectedEvent]);
    const isQuickAddHistorical = quickAddForm.is_historical_session === '1';
    const hasQuickAddSessionContext =
        quickAddSelectedSessionId > 0 ||
        (isQuickAddHistorical && quickAddForm.session_name.trim() !== '');
    const canSelectQuickAddTournament =
        hasQuickAddSessionContext && quickAddForm.tier_id.trim() !== '';
    const quickAddSelectedTournament = useMemo(
        () =>
            tournaments.find(
                (tournament) =>
                    String(tournament.id) === quickAddForm.tournament_id,
            ) ?? null,
        [quickAddForm.tournament_id, tournaments],
    );
    const quickAddTournamentItems = useMemo(
        () => {
            if (!canSelectQuickAddTournament) {
                return [];
            }

            return tournaments
                .filter((tournament): boolean =>
                    quickAddSelectedSessionId > 0
                        ? tournament.session_id === quickAddSelectedSessionId
                        : true,
                )
                .filter((tournament): boolean =>
                    quickAddForm.tier_id
                        ? String(tournament.tier_id) === quickAddForm.tier_id
                        : true,
                )
                .map((tournament) => ({
                    value: String(tournament.id),
                    label: tournament.name,
                    description: [
                        tournament.venue,
                        tournament.date_from,
                        tournament.sports.map((sport) => sport.name).join(', '),
                    ]
                        .filter(Boolean)
                        .join(' · '),
                }));
        },
        [
            canSelectQuickAddTournament,
            quickAddForm.tier_id,
            quickAddSelectedSessionId,
            tournaments,
        ],
    );
    const quickAddSportItems = useMemo(() => {
        const tournamentSports = quickAddSelectedTournament?.sports ?? [];
        const attachedSportIds = new Set(
            tournamentSports.map((sport) => sport.id),
        );

        return sports.map((sport) => ({
            value: String(sport.id),
            label: sport.name,
            group:
                quickAddSelectedTournament === null
                    ? undefined
                    : attachedSportIds.has(sport.id)
                      ? t('Already in tournament')
                      : t('Add to tournament'),
            description:
                quickAddSelectedTournament === null
                    ? undefined
                    : attachedSportIds.has(sport.id)
                      ? t('Already attached to selected tournament')
                      : t('Will be added to selected tournament on save'),
        }));
    }, [quickAddSelectedTournament, sports, t]);
    const quickAddEventItems = useMemo(
        () =>
            events
                .filter((event): boolean =>
                    quickAddForm.tournament_id
                        ? String(event.tournament_id) === quickAddForm.tournament_id
                        : false,
                )
                .filter((event): boolean =>
                    quickAddSelectedSportId > 0
                        ? event.sport_id === quickAddSelectedSportId
                        : true,
                )
                .filter((event): boolean =>
                    isEventGenderCompatible(member.gender, event.gender_class),
                )
                .map((event) => ({
                    value: String(event.id),
                    label: event.name,
                    badge: t(event.event_type === 'team' ? 'Team' : 'Individual'),
                    badgeTone:
                        event.event_type === 'team'
                            ? ('team' as const)
                            : ('individual' as const),
                    description: [
                        event.sport?.name,
                        event.discipline,
                        event.weight_category,
                        event.gender_class,
                    ]
                        .filter(Boolean)
                        .join(' · '),
                })),
        [events, member.gender, quickAddForm.tournament_id, quickAddSelectedSportId, t],
    );

    const quickAddTeamItems = useMemo(() => {
        const teams = (eventTeams ?? [])
            .filter((team): boolean => (isQuickAddHistorical ? true : team.is_active))
            .filter((team): boolean =>
                quickAddSelectedSessionId > 0 && team.session?.id
                    ? team.session.id === quickAddSelectedSessionId
                    : true,
            )
            .filter((team): boolean =>
                quickAddSelectedSportId > 0 && team.sport
                    ? team.sport.id === quickAddSelectedSportId
                    : true,
            )
            .map((team) => ({
                value: String(team.id),
                label:
                    `${team.name}` +
                    (team.session?.name ? ` (${team.session.name})` : '') +
                    (team.sport?.name ? ` - ${team.sport.name}` : ''),
            }));

        if (teams.length > 0) {
            return teams;
        }

        if (quickAddSelectedSessionId > 0) {
            return (eventTeams ?? [])
                .filter((team): boolean => (isQuickAddHistorical ? true : team.is_active))
                .filter((team): boolean => team.session?.id === quickAddSelectedSessionId)
                .map((team) => ({
                    value: String(team.id),
                    label: team.name + (team.sport?.name ? ` - ${team.sport.name}` : ''),
                }));
        }

        if (quickAddSelectedSportId > 0) {
            return (eventTeams ?? [])
                .filter((team): boolean => isQuickAddHistorical ? true : team.is_active)
                .filter((team): boolean => team.sport?.id === quickAddSelectedSportId)
                .map((team) => ({
                    value: String(team.id),
                    label: team.name + (team.session?.name ? ` (${team.session.name})` : ''),
                }));
        }

        return [];
    }, [eventTeams, quickAddSelectedSessionId, quickAddSelectedSportId, isQuickAddHistorical]);

    useEffect(() => {
        const hasSingleOption = quickAddTeamItems.length === 1;
        const isSelected = quickAddTeamItems.some((team) => team.value === quickAddForm.team_id);

        if (hasSingleOption && !isSelected) {
            setQuickAddField('team_id', quickAddTeamItems[0].value);

            return;
        }

        if (!isSelected) {
            setQuickAddField('team_id', '');
        }
    }, [quickAddTeamItems, quickAddForm.team_id]);

    useEffect(() => {
        if (quickAddSelectedTournament === null) {
            return;
        }

        setQuickAddForm((current) => {
            const tournamentSportId =
                quickAddSelectedTournament.sports[0]?.id ??
                quickAddSelectedTournament.sport_id ??
                null;

            return {
                ...current,
                tournament_name: quickAddSelectedTournament.name,
                venue: quickAddSelectedTournament.venue ?? current.venue,
                date_from: quickAddSelectedTournament.date_from ?? current.date_from,
                date_to: quickAddSelectedTournament.date_to ?? current.date_to,
                sport_id: tournamentSportId ? String(tournamentSportId) : current.sport_id,
                event_sport_id: tournamentSportId
                    ? String(tournamentSportId)
                    : current.event_sport_id,
            };
        });
    }, [quickAddSelectedTournament]);

    useEffect(() => {
        if (!quickAddSelectedEvent) {
            return;
        }

        const teamAchievement =
            quickAddSelectedEvent.event_type === 'team' &&
            (quickAddSelectedEvent.team_achievements ?? []).length === 1
                ? (quickAddSelectedEvent.team_achievements ?? [])[0]
                : null;

        setQuickAddForm((current) => ({
            ...current,
            event_name: quickAddSelectedEvent.name,
            event_sport_id: String(quickAddSelectedEvent.sport_id),
            sport_id: current.sport_id || String(quickAddSelectedEvent.sport_id),
            event_type: quickAddSelectedEvent.event_type,
            participants_required: quickAddSelectedEvent.participants_required
                ? String(quickAddSelectedEvent.participants_required)
                : '',
            gender_class: quickAddSelectedEvent.gender_class,
            discipline: quickAddSelectedEvent.discipline ?? '',
            weight_category: quickAddSelectedEvent.weight_category ?? '',
            team_id: teamAchievement
                ? String(teamAchievement.team_id)
                : current.team_id,
            medal_type: teamAchievement?.medal_type
                ? (teamAchievement.medal_type as QuickAddAchievementForm['medal_type'])
                : current.medal_type,
            position:
                teamAchievement?.position !== null &&
                teamAchievement?.position !== undefined
                    ? String(teamAchievement.position)
                    : current.position,
        }));
    }, [quickAddSelectedEvent]);

    useEffect(() => {
        if (!quickAddSelectedTeamAchievement) {
            return;
        }

        setQuickAddForm((current) => ({
            ...current,
            medal_type: quickAddSelectedTeamAchievement.medal_type
                ? (quickAddSelectedTeamAchievement.medal_type as QuickAddAchievementForm['medal_type'])
                : current.medal_type,
            position:
                quickAddSelectedTeamAchievement.position !== null &&
                quickAddSelectedTeamAchievement.position !== undefined
                    ? String(quickAddSelectedTeamAchievement.position)
                    : current.position,
        }));
    }, [quickAddSelectedTeamAchievement]);

    const submitQuickAchievement = (): void => {
        setQuickAddErrors({});
        const isHistorical = quickAddForm.is_historical_session === '1';
        const normalizeNumericString = (value: string): string => {
            const normalized = String(value).trim();

            if (normalized === '' || normalized === '0') {
                return '';
            }

            return /^\d+$/.test(normalized) ? normalized : '';
        };
        const payload: Record<string, string> = {
            ...Object.fromEntries(
                Object.entries(quickAddForm).map(([key, value]) => [
                    key,
                    key === 'session_id' ||
                            key === 'team_id' ||
                            key === 'sport_id' ||
                            key === 'event_sport_id' ||
                            key === 'tier_id' ||
                            key === 'tournament_id' ||
                            key === 'event_id'
                        ? normalizeNumericString(String(value))
                        : String(value),
                ]),
            ),
        };

        if (!payload.tournament_id) {
            delete payload.tournament_id;
        }

        if (!payload.event_id) {
            delete payload.event_id;
        }

        if (isHistorical && !payload.session_id) {
            delete payload.session_id;
        }

        if (!payload.event_sport_id && payload.sport_id) {
            payload.event_sport_id = payload.sport_id;
        }

        setQuickAddSaving(true);

        router.post(storeAchievementContext.url(member), payload, {
            forceFormData: true,
            onError: (errors: Record<string, string>) => {
                const normalized = Object.fromEntries(
                    Object.entries(errors).map(([key, value]) => [
                        key,
                        Array.isArray(value) ? value[0] : String(value),
                    ]),
                ) as Record<string, string>;

                setQuickAddErrors(normalized);
                setQuickAddSaving(false);
            },
            onSuccess: () => {
                setQuickAddSaving(false);
                setQuickAddOpen(false);
                setQuickAddForm(resetQuickAddForm());
                setQuickAddErrors({});
                router.reload();
            },
        });
    };

    const setQuickAddField = (field: keyof QuickAddAchievementForm, value: string): void => {
        setQuickAddErrors((current) => {
            if (!(field in current)) {
                return current;
            }

            const next = { ...current };

            delete next[field];

            return next;
        });
        setQuickAddForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const getQuickAddError = (
        field: keyof QuickAddAchievementForm,
    ): string => {
        const error = quickAddErrors[field];

        return error ?? '';
    };

    const achievementSummary = useMemo(() => {
        const summary = {
            GOLD: 0,
            SILVER: 0,
            BRONZE: 0,
            MERIT: 0,
        };

        for (const achievement of achievementsData?.achievements ?? []) {
            if (isOtherTierOrLevel(achievement.tournament.tier_code)) {
                continue;
            }

            const medal = achievement.medal_type?.toUpperCase();

            if (medal && medal in summary) {
                summary[medal as keyof typeof summary] += 1;
            }
        }

        return summary;
    }, [achievementsData]);

    const filteredSessionGroups = useMemo(() => {
        const isCurrentSession = (value: unknown): boolean =>
            value === true || value === 1 || value === '1';

        const matchesFilters = (item: ParticipationEntry): boolean => {
            const search = eventSearch.trim().toLowerCase();
            const tournamentDate = item.tournament.date_from
                ? parseDateValue(item.tournament.date_from)
                : null;

            if (dateFromFilter && tournamentDate) {
                const fromDate = parseDateValue(dateFromFilter);

                if (fromDate && tournamentDate < fromDate) {
                    return false;
                }
            }

            if (dateToFilter && tournamentDate) {
                const toDate = parseDateValue(dateToFilter);

                if (toDate && tournamentDate > toDate) {
                    return false;
                }
            }

            const promotionRowsForItem = (() => {
                const seen = new Map<number, PromotionRow>();

                for (const promotion of promotionLookup.get(
                    `participation:${item.id}`,
                ) ?? []) {
                    seen.set(promotion.id, promotion);
                }

                if (item.achievement?.id) {
                    for (const promotion of promotionLookup.get(
                        `achievement:${item.achievement.id}`,
                    ) ?? []) {
                        seen.set(promotion.id, promotion);
                    }
                }

                return Array.from(seen.values());
            })();
            const promotionMatches = promotionRowsForItem.length;
            const hasBenefit = !!(
                item.achievement?.benefits?.length ||
                achievementBenefitTypes(
                    item.achievement?.benefits,
                    promotionRowsForItem,
                ).length
            );
            const hasPromotion = promotionMatches > 0;

            if (medalFilter !== 'all') {
                if (medalFilter === 'none' && item.achievement?.medal_type) {
                    return false;
                }

                if (
                    medalFilter !== 'none' &&
                    item.achievement?.medal_type !== medalFilter
                ) {
                    return false;
                }
            }

            if (
                tierFilter !== 'all' &&
                item.tournament.tier_code !== tierFilter
            ) {
                return false;
            }

            if (
                classFilter !== 'all' &&
                item.event.gender_class !== classFilter
            ) {
                return false;
            }

            if (benefitFilter === 'benefit' && !hasBenefit) {
                return false;
            }

            if (benefitFilter === 'promotion' && !hasPromotion) {
                return false;
            }

            if (!search) {
                return true;
            }

            const haystack = [
                item.tournament.name,
                item.event.name,
                item.tournament.tier_code ?? '',
                item.event.gender_class ?? '',
                item.achievement?.medal_type ?? '',
                achievementBenefitTypes(
                    item.achievement?.benefits,
                    promotionRowsForItem,
                ).join(' '),
                promotionRowsForItem
                    .map((promotion) => promotionSummary(promotion))
                    .join(' ') ?? '',
                item.achievement?.id
                    ? (promotionRowsForItem
                          .map((promotion) => promotionSummary(promotion))
                          .join(' ') ?? '')
                    : '',
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
            .sort(
                (a, b) =>
                    Number(isCurrentSession(b.session.is_current)) -
                    Number(isCurrentSession(a.session.is_current)),
            );
    }, [
        benefitFilter,
        classFilter,
        dateFromFilter,
        dateToFilter,
        eventSearch,
        medalFilter,
        participations,
        achievementBenefitTypes,
        promotionLookup,
        promotionSummary,
        sessionFilter,
        tierFilter,
    ]);

    const achievementTierGroups = useMemo(() => {
        const tierHierarchy = new Map<string, number>([
            ['INTERNATIONAL', 1],
            ['NATIONAL', 2],
            ['AIPSC', 3],
            ['APSC', 3],
            ['STATE', 4],
            ['ZONAL', 5],
        ]);

        const groups = new Map<
            string,
            {
                tier: string;
                tierWeight: number;
                rows: Array<{
                    group: (typeof filteredSessionGroups)[number];
                    participation: ParticipationEntry;
                }>;
            }
        >();

        for (const group of filteredSessionGroups) {
            for (const participation of group.participations) {
                const tier = participation.tournament.tier_code ?? t('Unknown');
                const existing = groups.get(tier);

                if (existing) {
                    existing.rows.push({ group, participation });
                    existing.tierWeight = Math.max(
                        existing.tierWeight,
                        participation.tournament.tier_weight ?? 0,
                    );
                } else {
                    groups.set(tier, {
                        tier,
                        tierWeight: participation.tournament.tier_weight ?? 0,
                        rows: [{ group, participation }],
                    });
                }
            }
        }

        return Array.from(groups.values()).sort((a, b) => {
            const aTier = a.tier.toUpperCase();
            const bTier = b.tier.toUpperCase();

            if (aTier === 'OTHER' && bTier !== 'OTHER') {
                return 1;
            }

            if (bTier === 'OTHER' && aTier !== 'OTHER') {
                return -1;
            }

            const aHierarchy = tierHierarchy.get(aTier);
            const bHierarchy = tierHierarchy.get(bTier);

            if (aHierarchy !== undefined && bHierarchy !== undefined) {
                return aHierarchy - bHierarchy;
            }

            if (aHierarchy !== undefined) {
                return -1;
            }

            if (bHierarchy !== undefined) {
                return 1;
            }

            if (a.tierWeight !== b.tierWeight) {
                return b.tierWeight - a.tierWeight;
            }

            return a.tier.localeCompare(b.tier);
        });
    }, [filteredSessionGroups, t]);

    const syncDraftAchievementFilters = useCallback((): void => {
        setDraftAchievementFilters({
            dateFrom: dateFromFilter,
            dateTo: dateToFilter,
            search: eventSearch,
            session: sessionFilter,
            medal: medalFilter,
            tier: tierFilter,
            eventClass: classFilter,
            benefit: benefitFilter,
        });
    }, [
        benefitFilter,
        classFilter,
        dateFromFilter,
        dateToFilter,
        eventSearch,
        medalFilter,
        sessionFilter,
        tierFilter,
    ]);

    const clearAchievementFilters = useCallback((): void => {
        setDateFromFilter('');
        setDateToFilter('');
        setEventSearch('');
        setSessionFilter('all');
        setMedalFilter('all');
        setTierFilter('all');
        setClassFilter('all');
        setBenefitFilter('all');
    }, []);

    const clearDraftAchievementFilters = useCallback((): void => {
        setDraftAchievementFilters({
            dateFrom: '',
            dateTo: '',
            search: '',
            session: 'all',
            medal: 'all',
            tier: 'all',
            eventClass: 'all',
            benefit: 'all',
        });
    }, []);

    const applyAchievementFilters = useCallback((): void => {
        setDateFromFilter(draftAchievementFilters.dateFrom);
        setDateToFilter(draftAchievementFilters.dateTo);
        setEventSearch(draftAchievementFilters.search);
        setSessionFilter(draftAchievementFilters.session);
        setMedalFilter(draftAchievementFilters.medal);
        setTierFilter(draftAchievementFilters.tier);
        setClassFilter(draftAchievementFilters.eventClass);
        setBenefitFilter(draftAchievementFilters.benefit);
        setAchievementFiltersOpen(false);
    }, [draftAchievementFilters]);

    const activeAchievementFilterChips = useMemo(() => {
        const chips: string[] = [];

        if (dateFromFilter) {
            chips.push(`${t('Date from')}: ${dateFromFilter}`);
        }

        if (dateToFilter) {
            chips.push(`${t('Date to')}: ${dateToFilter}`);
        }

        if (medalFilter !== 'all') {
            chips.push(`${t('Medal')}: ${t(medalFilter)}`);
        }

        if (tierFilter !== 'all') {
            chips.push(`${t('Tier')}: ${tierFilter}`);
        }

        if (classFilter !== 'all') {
            chips.push(`${t('Class')}: ${eventClassLabel(classFilter, t)}`);
        }

        if (benefitFilter !== 'all') {
            chips.push(`${t('Benefits')}: ${t(benefitFilter)}`);
        }

        if (eventSearch) {
            chips.push(`${t('Search')}: ${eventSearch}`);
        }

        return chips;
    }, [
        benefitFilter,
        classFilter,
        dateFromFilter,
        dateToFilter,
        eventSearch,
        medalFilter,
        t,
        tierFilter,
    ]);

    const eventPromotionRows = useCallback(
        (participation: ParticipationEntry): PromotionRow[] => {
            const seen = new Map<number, PromotionRow>();

            for (const promotion of promotionLookup.get(
                `participation:${participation.id}`,
            ) ?? []) {
                seen.set(promotion.id, promotion);
            }

            if (participation.achievement?.id) {
                for (const promotion of promotionLookup.get(
                    `achievement:${participation.achievement.id}`,
                ) ?? []) {
                    seen.set(promotion.id, promotion);
                }
            }

            return Array.from(seen.values());
        },
        [promotionLookup],
    );

    function eventBadgeClass(
        kind:
            | 'session'
            | 'tier'
            | 'class'
            | 'medal'
            | 'promotion'
            | 'benefit'
            | 'team'
            | 'individual',
    ): string {
        const base =
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium';

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
            case 'team':
                return `${base} border-indigo-200 bg-indigo-50 text-indigo-700`;
            case 'individual':
                return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
        }
    }

    function medalBadgeContent(medalType: string): {
        icon: ReactElement;
        label: string;
        className: string;
    } {
        switch (medalType) {
            case 'GOLD':
                return {
                    icon: <Trophy className="h-3.5 w-3.5" />,
                    label: t('Gold'),
                    className:
                        'border-amber-300 bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-50 text-amber-900 shadow-sm',
                };
            case 'SILVER':
                return {
                    icon: <Award className="h-3.5 w-3.5" />,
                    label: t('Silver'),
                    className: 'border-slate-200 bg-slate-50 text-slate-700',
                };
            case 'BRONZE':
                return {
                    icon: <Medal className="h-3.5 w-3.5" />,
                    label: t('Bronze'),
                    className: 'border-orange-200 bg-orange-50 text-orange-700',
                };
            case 'MERIT':
                return {
                    icon: <Minus className="h-3.5 w-3.5" />,
                    label: t('MERIT'),
                    className:
                        'border-emerald-200 bg-emerald-50 text-emerald-700',
                };
            default:
                return {
                    icon: <Medal className="h-3.5 w-3.5" />,
                    label: t(medalType),
                    className: 'border-slate-200 bg-slate-50 text-slate-700',
                };
        }
    }

    const previewUrl =
        achievementPreview?.kind === 'tournament'
            ? showTournament.url(achievementPreview.tournament.id)
            : achievementPreview?.kind === 'event'
              ? showEvent.url({
                    tournament: achievementPreview.tournament.id,
                    event: achievementPreview.event.id,
                })
              : null;

    function handlePrint(): void {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const getValue = (key: string): string => {
            switch (key) {
                case 'pno':
                    return member.pno ?? '';
                case 'full_name':
                    return displayName ?? '';
                case 'father_name':
                    return member.father_name ?? '';
                case 'gender':
                    return member.gender === 'M'
                        ? t('Male')
                        : member.gender === 'F'
                          ? t('Female')
                          : t('Other gender');
                case 'dob':
                    return formatDisplayDate(member.dob, pageLocale) ?? '';
                case 'rank':
                    return member.rank ?? '';
                case 'mobile':
                    return member.mobile ?? '';
                case 'current_status':
                    return statusLabel(member.current_status, t);
                case 'player_category':
                    return member.player_category ?? '';
                case 'player_level':
                    return member.player_level ?? '';
                case 'unit':
                    return displayPostingLocation(member) ?? '';
                case 'home_district':
                    return member.home_district?.name ?? '';
                case 'joining_date':
                    return (
                        formatDisplayDate(member.joining_date, pageLocale) ?? ''
                    );
                case 'blood_group':
                    return member.blood_group ?? '';
                case 'caste':
                    return member.caste ?? '';
                case 'initial_rank':
                    return member.initial_rank ?? '';
                case 'playable_sports':
                    return member.playable_sports
                        .map((sport) =>
                            [
                                sportName(sport),
                                sport.role,
                                sport.position,
                                sport.notes,
                            ]
                                .filter(Boolean)
                                .join(' · '),
                        )
                        .join(' | ');
                case 'promotion_date':
                    return (
                        formatDisplayDate(member.promotion_date, pageLocale) ??
                        ''
                    );
                case 'team_since':
                    return (
                        formatDisplayDate(member.team_since, pageLocale) ?? ''
                    );
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
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${member.full_name}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}@media print{@page{size:landscape}}</style></head><body><h2 style="margin-bottom:12px">${member.full_name}</h2><table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table></body></html>`;
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
            <Head title={member.full_name} />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                        {/* Photo */}
                        <div className="shrink-0">
                            {member.photo_path ? (
                                <div className="group relative size-20 overflow-hidden rounded-xl border bg-muted">
                                    <img
                                        src={`/storage/${member.photo_path}`}
                                        alt={member.full_name}
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
                                {member.full_name}
                            </h1>
                            {member.full_name && (
                                <p className="text-muted-foreground">
                                    {member.full_name}
                                </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {member.pno && (
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {member.pno}
                                    </span>
                                )}
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={membersIndex()}>
                                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                                        {t('Back')}
                                    </Link>
                                </Button>
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
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={previewMember.url(member)}>
                                        <Printer className="mr-1.5 h-4 w-4" />
                                        {t('Print preview')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab}>
                    <TabsList>
                        <TabsTrigger value="overview" asChild>
                            <Link href={tabLinks.overview} prefetch>
                                {t('Overview')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="teams" asChild>
                            <Link href={tabLinks.teams} prefetch>
                                {t('Teams')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="events" asChild>
                            <Link href={tabLinks.events} prefetch>
                                {t('Achievements')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="performance" asChild>
                            <Link href={tabLinks.performance} prefetch>
                                {t('Performance')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="external-coaching" asChild>
                            <Link href={tabLinks['external-coaching']} prefetch>
                                {t('External coaching')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="special-achievements" asChild>
                            <Link
                                href={tabLinks['special-achievements']}
                                prefetch
                            >
                                {t('Special achievements')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="promotions" asChild>
                            <Link href={tabLinks.promotions} prefetch>
                                {t('Promotions and Reward')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="changelog" asChild>
                            <Link href={tabLinks.changelog} prefetch>
                                {t('Change log')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="media" asChild>
                            <Link href={tabLinks.media} prefetch>
                                {t('Media')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="status" asChild>
                            <Link href={tabLinks.status} prefetch>
                                {t('Status history')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <div className="space-y-6">
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {t('Identity')}
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {detail(t('Name'), displayName)}
                                        {detail(
                                            t("Father's name"),
                                            member.father_name,
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
                                        {detail(
                                            t('Date of birth'),
                                            formatDisplayDate(
                                                member.dob,
                                                pageLocale,
                                            ),
                                        )}
                                        {detail(t('Mobile'), member.mobile)}
                                        {member.blood_group &&
                                            detail(
                                                t('Blood group'),
                                                member.blood_group,
                                            )}
                                        {member.caste &&
                                            detail(t('Caste'), member.caste)}
                                    </dl>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {t('Service')}
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {detail(
                                            t('PNO'),
                                            <span className="font-mono">
                                                {member.pno}
                                            </span>,
                                        )}
                                        {detail(
                                            t('Current status'),
                                            <Badge variant="outline">
                                                {statusLabel(
                                                    member.current_status,
                                                    t,
                                                )}
                                            </Badge>,
                                        )}
                                        {detail(
                                            t('Rank'),
                                            member.rank
                                                ? resolveRankLabel(
                                                      member.rank,
                                                      ranks ?? [],
                                                      pageLocale,
                                                  )
                                                : null,
                                        )}
                                        {detail(
                                            t('Joining date'),
                                            formatDisplayDate(
                                                member.joining_date,
                                                pageLocale,
                                            ),
                                        )}
                                        {detail(
                                            t('Home district'),
                                            member.home_district?.name,
                                        )}
                                        {detail(
                                            t('Posting'),
                                            displayPostingLocation(member),
                                        )}
                                        {detail(
                                            t('Category'),
                                            t(member.player_category),
                                        )}
                                        {detail(
                                            t('Level'),
                                            t(member.player_level),
                                        )}
                                        {member.initial_rank &&
                                            detail(
                                                t('Initial rank'),
                                                resolveRankLabel(
                                                    member.initial_rank,
                                                    ranks ?? [],
                                                    pageLocale,
                                                ),
                                            )}
                                        {member.promotion_date &&
                                            detail(
                                                t('Promotion date'),
                                                formatDisplayDate(
                                                    member.promotion_date,
                                                    pageLocale,
                                                ),
                                            )}
                                        {member.team_since &&
                                            detail(
                                                t('Team since'),
                                                formatDisplayDate(
                                                    member.team_since,
                                                    pageLocale,
                                                ),
                                            )}
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
                                </section>

                                {member.playable_sports.length > 0 && (
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {t('Playable sports')}
                                        </h3>
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                            {member.playable_sports.map(
                                                (sport) => (
                                                    <div
                                                        key={sport.id}
                                                        className="rounded-md border p-3"
                                                    >
                                                        <div className="font-medium">
                                                            {sportName(sport)}
                                                        </div>
                                                        <div className="mt-2 space-y-2 text-sm">
                                                            {sport.role && (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                                        {t(
                                                                            'Role / position',
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        {
                                                                            sport.role
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {sport.position && (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                                        {t(
                                                                            'Position',
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        {
                                                                            sport.position
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {sport.sport_event && (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                                        {t(
                                                                            'Sport event',
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        {
                                                                            sport.sport_event
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {sport.weight && (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                                        {t(
                                                                            'Weight',
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        {
                                                                            sport.weight
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {sport.notes && (
                                                                <div className="space-y-0.5">
                                                                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                                        {t(
                                                                            'Notes',
                                                                        )}
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        {
                                                                            sport.notes
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {!sport.role &&
                                                                !sport.position &&
                                                                !sport.notes && (
                                                                    <div className="text-sm text-muted-foreground">
                                                                        —
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
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
                        <Deferred
                            data="memberTeams"
                            fallback={
                                <div className="space-y-2 rounded-xl border bg-card p-4">
                                    {[1, 2].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-10 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <MemberTeamsTab
                                teams={memberTeams}
                                locale={pageLocale}
                            />
                        </Deferred>
                    </TabsContent>

                    {/* Events */}
                    <TabsContent value="events">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <h3 className="text-base font-semibold">
                                    {t('Member achievements')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'Competition achievements recorded through tournaments, events, medals, and benefits.',
                                    )}
                                </p>
                                        {canManageMemberBenefits ? (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setQuickAddOpen(true);
                                        }}
                                    >
                                        {t('Add achievement')}
                                    </Button>
                                ) : null}
                            </div>
                            {loadingParticipations ||
                            participations === null ||
                            loadingAchievements ||
                            achievementsData === null ? null : (
                                <div className="flex flex-wrap gap-3">
                                    {(
                                        [
                                            'GOLD',
                                            'SILVER',
                                            'BRONZE',
                                            'MERIT',
                                        ] as const
                                    ).map((m) => {
                                        const medal = medalBadgeContent(m);

                                        return (
                                            <div
                                                key={m}
                                                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3"
                                            >
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${medal.className}`}
                                                >
                                                    {medal.icon}
                                                    {medal.label}
                                                </span>
                                                <span className="text-xl font-bold">
                                                    {achievementSummary[m]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {loadingParticipations ||
                            participations === null ||
                            loadingAchievements ||
                            achievementsData === null ? (
                                <div className="space-y-2 p-4">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-10 w-full"
                                        />
                                    ))}
                                </div>
                            ) : achievementTierGroups.length === 0 ? (
                                <div className="rounded-xl border bg-card p-6">
                                    <p className="text-sm text-muted-foreground">
                                        {t('No events.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 p-4">
                                            <div className="sticky top-3 z-10 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 text-xs text-muted-foreground">
                                                        <span className="rounded-md border bg-white px-2 py-1">
                                                            {t('Session')}:{' '}
                                                            {sessionFilter ===
                                                            'current'
                                                                ? t('Current')
                                                                : sessionFilter ===
                                                                    'all'
                                                                  ? t(
                                                                        'All sessions',
                                                                    )
                                                                  : sessionFilter}
                                                        </span>
                                                        {activeAchievementFilterChips.map(
                                                            (chip) => (
                                                                <span
                                                                    key={chip}
                                                                    className="rounded-md border bg-white px-2 py-1"
                                                                >
                                                                    {chip}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 border-slate-200 bg-white shadow-sm"
                                                            onClick={() => {
                                                                syncDraftAchievementFilters();
                                                                setAchievementFiltersOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            {t('Filters')}
                                                            {activeAchievementFilterChips.length >
                                                            0
                                                                ? ` (${activeAchievementFilterChips.length})`
                                                                : ''}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={
                                                                clearAchievementFilters
                                                            }
                                                        >
                                                            {t('Clear filters')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {filteredSessionGroups.length ===
                                            0 ? (
                                                <div className="rounded-xl border bg-card p-6">
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('No results')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {achievementTierGroups.map(
                                                        ({ tier, rows }) => {
                                                            const medalCounts =
                                                                rows.reduce(
                                                                    (
                                                                        acc,
                                                                        {
                                                                            participation,
                                                                        },
                                                                    ) => {
                                                                        if (
                                                                            participation
                                                                                .tournament
                                                                                .tier_code ===
                                                                            'OTHER'
                                                                        ) {
                                                                            return acc;
                                                                        }

                                                                        const medal =
                                                                            participation
                                                                                .achievement
                                                                                ?.medal_type;

                                                                        if (
                                                                            medal &&
                                                                            medal in
                                                                                acc
                                                                        ) {
                                                                            acc[
                                                                                medal as keyof typeof acc
                                                                            ] +=
                                                                                1;
                                                                        }

                                                                        return acc;
                                                                    },
                                                                    {
                                                                        GOLD: 0,
                                                                        SILVER: 0,
                                                                        BRONZE: 0,
                                                                        MERIT: 0,
                                                                    },
                                                                );
                                                            let tierAchievementSerial = 0;

                                                            return (
                                                                <div
                                                                    key={`tier-${tier}`}
                                                                    className="overflow-hidden rounded-xl border bg-card"
                                                                >
                                                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span
                                                                                className={eventBadgeClass(
                                                                                    'tier',
                                                                                )}
                                                                            >
                                                                                {
                                                                                    tier
                                                                                }
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {
                                                                                    rows.length
                                                                                }{' '}
                                                                                {t(
                                                                                    'records',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <span className="flex flex-wrap gap-1.5">
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
                                                                                    medalCounts[
                                                                                        medal
                                                                                    ] >
                                                                                    0 ? (
                                                                                        <span
                                                                                            key={
                                                                                                medal
                                                                                            }
                                                                                            className={eventBadgeClass(
                                                                                                'medal',
                                                                                            )}
                                                                                        >
                                                                                            {t(
                                                                                                medal,
                                                                                            )}

                                                                                            :{' '}
                                                                                            {
                                                                                                medalCounts[
                                                                                                    medal
                                                                                                ]
                                                                                            }
                                                                                        </span>
                                                                                    ) : null,
                                                                            )}
                                                                        </span>
                                                                    </div>
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
                                                                                        'Tier / Level',
                                                                                    )}
                                                                                </TableHead>
                                                                                <TableHead>
                                                                                    {t(
                                                                                        'Tournament',
                                                                                    )}
                                                                                </TableHead>
                                                                                <TableHead>
                                                                                    {t(
                                                                                        'Session',
                                                                                    )}
                                                                                </TableHead>
                                                                                <TableHead>
                                                                                    {t(
                                                                                        'Venue',
                                                                                    )}
                                                                                </TableHead>
                                                                                <TableHead>
                                                                                    {t(
                                                                                        'Event / discipline',
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
                                                                                        'Benefits',
                                                                                    )}
                                                                                </TableHead>
                                                                                <TableHead>
                                                                                    {t(
                                                                                        'Prize money',
                                                                                    )}
                                                                                </TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {rows.map(
                                                                                ({
                                                                                    group,
                                                                                    participation,
                                                                                }) => {
                                                                                    const promotionsForRow =
                                                                                        eventPromotionRows(
                                                                                            participation,
                                                                                        );
                                                                                    const achievementBenefits =
                                                                                        achievementBenefitTypes(
                                                                                            participation
                                                                                                .achievement
                                                                                                ?.benefits,
                                                                                            promotionsForRow,
                                                                                        );
                                                                                    const isHighlightedAchievement =
                                                                                        (highlightedAchievement.achievementId !==
                                                                                            null &&
                                                                                            participation
                                                                                                .achievement
                                                                                                ?.id ===
                                                                                                highlightedAchievement.achievementId) ||
                                                                                        (highlightedAchievement.participationId !==
                                                                                            null &&
                                                                                            participation.id ===
                                                                                                highlightedAchievement.participationId) ||
                                                                                        (highlightedAchievement.eventId !==
                                                                                            null &&
                                                                                            participation
                                                                                                .event
                                                                                                .id ===
                                                                                                highlightedAchievement.eventId);

                                                                                    return (
                                                                                        <TableRow
                                                                                            key={
                                                                                                participation.id
                                                                                            }
                                                                                            id={
                                                                                                participation
                                                                                                    .achievement
                                                                                                    ?.id
                                                                                                    ? `achievement-${participation.achievement.id}`
                                                                                                    : `participation-${participation.id}`
                                                                                            }
                                                                                            className={
                                                                                                isHighlightedAchievement
                                                                                                    ? 'scroll-mt-28 bg-amber-50/80 ring-1 ring-amber-300 ring-inset dark:bg-amber-950/20 dark:ring-amber-700'
                                                                                                    : undefined
                                                                                            }
                                                                                        >
                                                                                            <TableCell>
                                                                                                {
                                                                                                    ++tierAchievementSerial
                                                                                                }
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <span
                                                                                                    className={eventBadgeClass(
                                                                                                        'tier',
                                                                                                    )}
                                                                                                >
                                                                                                    {participation
                                                                                                        .tournament
                                                                                                        .tier_code ??
                                                                                                        tier}
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <div className="space-y-1">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className="block text-left font-medium hover:underline"
                                                                                                        onClick={() =>
                                                                                                            setAchievementPreview(
                                                                                                                {
                                                                                                                    kind: 'tournament',
                                                                                                                    tournament:
                                                                                                                        participation.tournament,
                                                                                                                    session:
                                                                                                                        group.session,
                                                                                                                },
                                                                                                            )
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            participation
                                                                                                                .tournament
                                                                                                                .name
                                                                                                        }
                                                                                                    </button>
                                                                                                    <p className="text-xs text-muted-foreground">
                                                                                                        {
                                                                                                            participation
                                                                                                                .team
                                                                                                                ?.name
                                                                                                        }
                                                                                                    </p>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {
                                                                                                    group
                                                                                                        .session
                                                                                                        .name
                                                                                                }
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {participation
                                                                                                    .tournament
                                                                                                    .venue ??
                                                                                                    '—'}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <div className="space-y-1.5">
                                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            className="text-left font-medium hover:underline"
                                                                                                            onClick={() =>
                                                                                                                setAchievementPreview(
                                                                                                                    {
                                                                                                                        kind: 'event',
                                                                                                                        tournament:
                                                                                                                            participation.tournament,
                                                                                                                        event: participation.event,
                                                                                                                        session:
                                                                                                                            group.session,
                                                                                                                    },
                                                                                                                )
                                                                                                            }
                                                                                                        >
                                                                                                            {
                                                                                                                participation
                                                                                                                    .event
                                                                                                                    .name
                                                                                                            }
                                                                                                        </button>
                                                                                                        <span
                                                                                                            className={eventBadgeClass(
                                                                                                                participation
                                                                                                                    .event
                                                                                                                    .event_type ===
                                                                                                                    'team'
                                                                                                                    ? 'team'
                                                                                                                    : 'individual',
                                                                                                            )}
                                                                                                        >
                                                                                                            {participation
                                                                                                                .event
                                                                                                                .event_type ===
                                                                                                            'team'
                                                                                                                ? t(
                                                                                                                      'Team',
                                                                                                                  )
                                                                                                                : t(
                                                                                                                      'Individual',
                                                                                                                  )}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    {participation
                                                                                                        .event
                                                                                                        .discipline ? (
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            {
                                                                                                                participation
                                                                                                                    .event
                                                                                                                    .discipline
                                                                                                            }
                                                                                                        </p>
                                                                                                    ) : null}
                                                                                                    {participation
                                                                                                        .event
                                                                                                        .weight_category ? (
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            {
                                                                                                                participation
                                                                                                                    .event
                                                                                                                    .weight_category
                                                                                                            }
                                                                                                        </p>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {participation
                                                                                                    .tournament
                                                                                                    .date_from ??
                                                                                                    t(
                                                                                                        'No date',
                                                                                                    )}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {eventClassLabel(
                                                                                                    participation
                                                                                                        .event
                                                                                                        .gender_class,
                                                                                                    t,
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {participation
                                                                                                    .achievement
                                                                                                    ?.medal_type ? (
                                                                                                    (() => {
                                                                                                        const medal =
                                                                                                            medalBadgeContent(
                                                                                                                participation
                                                                                                                    .achievement
                                                                                                                    .medal_type,
                                                                                                            );

                                                                                                        return (
                                                                                                            <span
                                                                                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${medal.className}`}
                                                                                                            >
                                                                                                                {
                                                                                                                    medal.icon
                                                                                                                }
                                                                                                                {
                                                                                                                    medal.label
                                                                                                                }
                                                                                                            </span>
                                                                                                        );
                                                                                                    })()
                                                                                                ) : (
                                                                                                    <span
                                                                                                        className={eventBadgeClass(
                                                                                                            'medal',
                                                                                                        )}
                                                                                                    >
                                                                                                        {t(
                                                                                                            'No medal',
                                                                                                        )}
                                                                                                    </span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                #
                                                                                                {participation
                                                                                                    .achievement
                                                                                                    ?.position ??
                                                                                                    participation.position ??
                                                                                                    '—'}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                                    {achievementBenefits.length ? (
                                                                                                        achievementBenefits.map(
                                                                                                            (
                                                                                                                benefitType,
                                                                                                                index,
                                                                                                            ) => (
                                                                                                                <span
                                                                                                                    key={`${participation.id}-benefit-${index}`}
                                                                                                                    className={eventBadgeClass(
                                                                                                                        'benefit',
                                                                                                                    )}
                                                                                                                >
                                                                                                                    {t(
                                                                                                                        benefitType,
                                                                                                                    )}
                                                                                                                </span>
                                                                                                            ),
                                                                                                        )
                                                                                                    ) : (
                                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                            —
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <div className="space-y-1.5">
                                                                                                    {achievementPrizeMoney(
                                                                                                        participation
                                                                                                            .achievement
                                                                                                            ?.benefits,
                                                                                                        promotionsForRow,
                                                                                                    )
                                                                                                        .length >
                                                                                                    0 ? (
                                                                                                        achievementPrizeMoney(
                                                                                                            participation
                                                                                                                .achievement
                                                                                                                ?.benefits,
                                                                                                            promotionsForRow,
                                                                                                        ).map(
                                                                                                            (
                                                                                                                amount,
                                                                                                                index,
                                                                                                            ) => (
                                                                                                                <div
                                                                                                                    key={`${participation.id}-amount-${index}`}
                                                                                                                    className="text-xs font-medium text-foreground"
                                                                                                                >
                                                                                                                    {
                                                                                                                        amount
                                                                                                                    }
                                                                                                                </div>
                                                                                                            ),
                                                                                                        )
                                                                                                    ) : (
                                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                            —
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    );
                                                                                },
                                                                            )}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="performance">
                        {activeTab === 'performance' && (
                            <Deferred
                                data="performance"
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
                                <MemberPerformanceTab
                                    performance={performance}
                                />
                            </Deferred>
                        )}
                    </TabsContent>
                    <TabsContent value="external-coaching">
                        {activeTab === 'external-coaching' && (
                            <Deferred
                                data="externalCoaching"
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
                                <div className="space-y-6 rounded-xl border bg-card p-6">
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold">
                                            {t('External coaching assignments')}
                                        </h3>
                                        <div className="overflow-hidden rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            {t('Period')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t(
                                                                'External coach',
                                                            )}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Venue')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Sport')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Status')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(
                                                        externalCoaching?.assignments ??
                                                        []
                                                    ).map((assignment) => (
                                                        <TableRow
                                                            key={assignment.id}
                                                        >
                                                            <TableCell>
                                                                {assignment.start_date ??
                                                                    '-'}{' '}
                                                                →{' '}
                                                                {assignment.end_date ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {assignment
                                                                    .external_coach
                                                                    ?.name ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {assignment
                                                                    .training_venue
                                                                    ?.name ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {assignment
                                                                    .sport
                                                                    ?.name ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {t(
                                                                        assignment.status,
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold">
                                            {t('External training attendance')}
                                        </h3>
                                        <div className="overflow-hidden rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            {t('Date')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Status')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Geo status')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Review status')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Distance')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(
                                                        externalCoaching?.attendances ??
                                                        []
                                                    ).map((attendance) => (
                                                        <TableRow
                                                            key={attendance.id}
                                                        >
                                                            <TableCell>
                                                                {attendance.attendance_date ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {t(
                                                                    attendance.attendance_status,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={
                                                                        attendance.geo_status ===
                                                                        'valid'
                                                                            ? 'secondary'
                                                                            : 'destructive'
                                                                    }
                                                                >
                                                                    {t(
                                                                        attendance.geo_status,
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {t(
                                                                        attendance.review_status,
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {attendance.distance_from_venue_meters ??
                                                                    '-'}{' '}
                                                                m
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold">
                                            {t('Performance updates')}
                                        </h3>
                                        <div className="overflow-hidden rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            {t('Date')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Level')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Score')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Summary')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Review status')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(
                                                        externalCoaching?.performanceUpdates ??
                                                        []
                                                    ).map((update) => (
                                                        <TableRow
                                                            key={update.id}
                                                        >
                                                            <TableCell>
                                                                {update.update_date ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {update.performance_level
                                                                    ? t(
                                                                          update.performance_level,
                                                                      )
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {update.performance_score ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    update.training_summary
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {t(
                                                                        update.review_status,
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>
                                </div>
                            </Deferred>
                        )}
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
                            <SpecialAchievementsTab
                                member={member}
                                data={specialAchievements}
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
                                achievements={
                                    achievementsData?.achievements ?? []
                                }
                                onSaved={refreshMemberHistory}
                            />
                        </Deferred>
                    </TabsContent>
                    {/* Change log */}
                    <TabsContent value="changelog">
                        <ChangeLog
                            entries={auditLog}
                            primaryEntity="Member"
                            storageKey="member-changelog-view"
                        />
                    </TabsContent>

                    {/* Media tab */}
                    <TabsContent value="media">
                        {activeTab === 'media' && (
                            <MemberMediaTab
                                key={mediaKey}
                                memberId={memberId}
                                canDelete={canDeleteMedia}
                                initialData={media}
                            />
                        )}
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
                                                        {statusLabel(
                                                            row.status,
                                                            t,
                                                        )}
                                                    </Badge>
                                                    {row.reason && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>
                                                        {formatDisplayDate(
                                                            row.effective_on,
                                                            pageLocale,
                                                        )}
                                                    </p>
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
                </Tabs>
            </div>

            {mediaParticipationId !== null && (
                <ParticipationMediaSheet
                    participationId={mediaParticipationId.id}
                    memberName={member.full_name}
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

                <Dialog
                    open={quickAddOpen}
                    onOpenChange={(open) => setQuickAddOpen(open)}
                >
                <DialogContent
                    className="w-[98vw] max-w-[95rem] sm:max-w-[95rem]"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Add achievement')}</DialogTitle>
                    </DialogHeader>
                    {Object.keys(quickAddErrors).length > 0 ? (
                        <AlertError
                            errors={Object.values(quickAddErrors)}
                            title={t('Please fix these errors before saving.')}
                        />
                    ) : null}

                    <div className="space-y-5">
                        <div className="rounded-md border p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">
                                        {t('Step 1: Tournament context')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Choose session, tier, then select an existing tournament or type a new one.')}
                                    </p>
                                </div>
                                <Badge variant="outline">{t('Context')}</Badge>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>{t('Session')}</Label>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="historical-session"
                                        checked={
                                            quickAddForm.is_historical_session === '1'
                                        }
                                        onCheckedChange={(checked) => {
                                            const next = checked
                                                ? '1'
                                                : '';

                                            setQuickAddField(
                                                'is_historical_session',
                                                next,
                                            );
                                            setQuickAddField('tournament_id', '');
                                            setQuickAddField('event_id', '');

                                            if (checked) {
                                                setQuickAddField(
                                                    'session_id',
                                                    '',
                                                );
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor="historical-session"
                                        className="cursor-pointer"
                                    >
                                        {t('Session is not in list / historical entry')}
                                    </Label>
                                </div>
                                {quickAddForm.is_historical_session !== '1' ? (
                                    <>
                                        <Combobox
                                            value={quickAddForm.session_id}
                                            onValueChange={(value) => {
                                                setQuickAddField(
                                                    'session_id',
                                                    value,
                                                );
                                                setQuickAddField('tournament_id', '');
                                                setQuickAddField('event_id', '');
                                            }}
                                            items={sessions.map((session) => ({
                                                value: String(session.id),
                                                label: session.name,
                                            }))}
                                            placeholder={t('Select session')}
                                            searchPlaceholder={t('Search sessions')}
                                            emptyMessage={t('No sessions found')}
                                        />
                                        {getQuickAddError('session_id') ? (
                                            <p className="text-xs text-destructive">
                                                {getQuickAddError('session_id')}
                                            </p>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label>{t('Session name')}</Label>
                                        <Input
                                            value={quickAddForm.session_name}
                                            onChange={(e) => {
                                                setQuickAddField(
                                                    'session_name',
                                                    e.target.value,
                                                );
                                                setQuickAddField('tournament_id', '');
                                                setQuickAddField('event_id', '');
                                            }}
                                        />
                                        {getQuickAddError('session_name') ? (
                                            <p className="text-xs text-destructive">
                                                {getQuickAddError('session_name')}
                                            </p>
                                        ) : null}
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label>{t('Start year')}</Label>
                                                <Input
                                                    value={quickAddForm.session_start_year}
                                                    onChange={(e) => {
                                                        setQuickAddField(
                                                            'session_start_year',
                                                            e.target.value,
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t('End year')}</Label>
                                                <Input
                                                    value={quickAddForm.session_end_year}
                                                    onChange={(e) => {
                                                        setQuickAddField(
                                                            'session_end_year',
                                                            e.target.value,
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Allow inactive / backfill entry')}</Label>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="allow-inactive-member"
                                        checked={
                                            quickAddForm.allow_inactive_member === '1'
                                        }
                                        onCheckedChange={(checked) => {
                                            setQuickAddField(
                                                'allow_inactive_member',
                                                checked ? '1' : '',
                                            );
                                        }}
                                    />
                                    <Label
                                        htmlFor="allow-inactive-member"
                                        className="cursor-pointer text-sm"
                                    >
                                        {t(
                                            'Allow inactive member or historical roster entries',
                                        )}
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Tier')}</Label>
                                <Combobox
                                    value={quickAddForm.tier_id}
                                    onValueChange={(value) => {
                                        setQuickAddField('tier_id', value);
                                        setQuickAddField('tournament_id', '');
                                        setQuickAddField('event_id', '');
                                    }}
                                    items={tiers.map((tier) => ({
                                        value: String(tier.id),
                                        label: tier.code,
                                    }))}
                                    placeholder={t('Select tier')}
                                    searchPlaceholder={t('Search tiers')}
                                    emptyMessage={t('No tiers found')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Existing tournament')}</Label>
                                <Combobox
                                    value={quickAddForm.tournament_id}
                                    onValueChange={(value) => {
                                        setQuickAddField('tournament_id', value);
                                    }}
                                    items={quickAddTournamentItems}
                                    placeholder={
                                        canSelectQuickAddTournament
                                            ? t('Select existing tournament')
                                            : t('Select session and tier first')
                                    }
                                    searchPlaceholder={t('Search tournaments')}
                                    emptyMessage={
                                        canSelectQuickAddTournament
                                            ? t('No matching tournament. Type new name below.')
                                            : t('Select session and tier first')
                                    }
                                    disabled={!canSelectQuickAddTournament}
                                />
                                {getQuickAddError('tournament_id') ? (
                                    <p className="text-xs text-destructive">
                                        {getQuickAddError('tournament_id')}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t('Tournament name')}</Label>
                                <Input
                                    value={quickAddForm.tournament_name}
                                    onChange={(e) => {
                                        setQuickAddField(
                                            'tournament_id',
                                            '',
                                        );
                                        setQuickAddField(
                                            'tournament_name',
                                            e.target.value,
                                        );
                                    }}
                                />
                                {getQuickAddError('tournament_name') ? (
                                    <p className="text-xs text-destructive">
                                        {getQuickAddError('tournament_name')}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Venue')}</Label>
                                <Input
                                    value={quickAddForm.venue}
                                    onChange={(e) => {
                                        setQuickAddField('venue', e.target.value);
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Event date from')}</Label>
                                <DatePicker
                                    value={quickAddForm.date_from}
                                    onChange={(value) => {
                                        setQuickAddField('date_from', value);
                                    }}
                                    placeholder={t('Select date')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Event date to')}</Label>
                                <DatePicker
                                    value={quickAddForm.date_to}
                                    onChange={(value) => {
                                        setQuickAddField('date_to', value);
                                    }}
                                    placeholder={t('Select date')}
                                />
                            </div>
                        </div>
                        </div>

                        <div className="rounded-md border p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">
                                        {t('Step 2: Sport, event and team')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Pick tournament sport, reuse an event if found, or type a new event.')}
                                    </p>
                                </div>
                                <Badge variant="outline">{t('Participation')}</Badge>
                            </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>{t('Tournament sport')}</Label>
                                <Combobox
                                    value={quickAddForm.sport_id}
                                    onValueChange={(value) => {
                                        setQuickAddField('sport_id', value);
                                        setQuickAddField('event_sport_id', value);
                                        setQuickAddField('event_id', '');
                                    }}
                                    items={quickAddSportItems}
                                    placeholder={t('Select sport')}
                                    searchPlaceholder={t('Search sports')}
                                    emptyMessage={t('No sports found')}
                                />
                                {quickAddSelectedTournament?.sports.length ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t('Attached sports are listed first; other sports will be added to this tournament on save.')}
                                    </p>
                                ) : null}
                                {getQuickAddError('event_sport_id') ? (
                                    <p className="text-xs text-destructive">
                                        {getQuickAddError('event_sport_id')}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Existing event')}</Label>
                                <Combobox
                                    value={quickAddForm.event_id}
                                    onValueChange={(value) => {
                                        setQuickAddField('event_id', value);
                                    }}
                                    items={quickAddEventItems}
                                    placeholder={t('Select existing event')}
                                    searchPlaceholder={t('Search events')}
                                    emptyMessage={t('No matching event. Type new event below.')}
                                    disabled={!quickAddForm.tournament_id}
                                />
                                {quickAddSelectedEvent?.event_type === 'team' &&
                                (quickAddSelectedEvent.team_achievements ?? []).length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        {quickAddSelectedTeamAchievement
                                            ? t(
                                                  'Team medal already exists for this event; team, medal and position are reused for this member participation.',
                                              )
                                            : t(
                                                  'Team medals already exist for this event. Select a team to reuse its medal and position.',
                                              )}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t('Event name')}</Label>
                                <Input
                                    value={quickAddForm.event_name}
                                    onChange={(e) => {
                                        setQuickAddField('event_id', '');
                                        setQuickAddField(
                                            'event_name',
                                            e.target.value,
                                        );
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Event type')}</Label>
                                <Combobox
                                    value={quickAddForm.event_type}
                                    onValueChange={(value) => {
                                        setQuickAddField(
                                            'event_type',
                                            value as QuickAddAchievementForm['event_type'],
                                        );
                                    }}
                                    items={[
                                        {
                                            value: 'individual',
                                            label: t('Individual'),
                                        },
                                        {
                                            value: 'team',
                                            label: t('Team'),
                                        },
                                    ]}
                                    placeholder={t('Select type')}
                                    searchPlaceholder={t('Search type')}
                                    emptyMessage={t('No types found')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Gender class')}</Label>
                                <Combobox
                                    value={quickAddForm.gender_class}
                                    onValueChange={(value) => {
                                        setQuickAddField(
                                            'gender_class',
                                            value as QuickAddAchievementForm['gender_class'],
                                        );
                                    }}
                                    items={[
                                        { value: 'OPEN', label: t('Open') },
                                        { value: 'M', label: t('Male') },
                                        { value: 'F', label: t('Female') },
                                        { value: 'MIXED', label: t('Mixed') },
                                    ]}
                                    placeholder={t('Select class')}
                                    searchPlaceholder={t('Search class')}
                                    emptyMessage={t('No class found')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Discipline')}</Label>
                                <Input
                                    value={quickAddForm.discipline}
                                    onChange={(e) => {
                                        setQuickAddField(
                                            'discipline',
                                            e.target.value,
                                        );
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Weight category')}</Label>
                                <Input
                                    value={quickAddForm.weight_category}
                                    onChange={(e) => {
                                        setQuickAddField(
                                            'weight_category',
                                            e.target.value,
                                        );
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Participants required')}</Label>
                                <Input
                                    type="number"
                                    value={quickAddForm.participants_required}
                                    min={1}
                                    onChange={(e) => {
                                        setQuickAddField(
                                            'participants_required',
                                            e.target.value,
                                        );
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Team')}</Label>
                                <Combobox
                                    value={quickAddForm.team_id}
                                    onValueChange={(value) => {
                                        setQuickAddField('team_id', value);
                                    }}
                                    items={quickAddTeamItems}
                                    placeholder={t('Select team')}
                                    searchPlaceholder={t('Search teams')}
                                    emptyMessage={t('No teams found')}
                                />
                                {getQuickAddError('team_id') ? (
                                    <p className="text-xs text-destructive">
                                        {getQuickAddError('team_id')}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        </div>

                        <div className="rounded-md border p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">
                                        {t('Step 3: Medal and result')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Record the medal or position after participation is resolved.')}
                                    </p>
                                </div>
                                <Badge variant="outline">{t('Result')}</Badge>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>{t('Medal')}</Label>
                                <Combobox
                                    value={quickAddForm.medal_type}
                                    onValueChange={(value) => {
                                        const nextMedal =
                                            value === '__no_medal__'
                                                ? ''
                                                : (value as QuickAddAchievementForm['medal_type']);

                                        setQuickAddField(
                                            'medal_type',
                                            nextMedal,
                                        );

                                        if (nextMedal === 'GOLD') {
                                            setQuickAddField('position', '1');
                                        } else if (nextMedal === 'SILVER') {
                                            setQuickAddField('position', '2');
                                        } else if (nextMedal === 'BRONZE') {
                                            setQuickAddField('position', '3');
                                        }
                                    }}
                                    items={[
                                        {
                                            value: '__no_medal__',
                                            label: t('No medal'),
                                        },
                                        { value: 'GOLD', label: t('Gold') },
                                        { value: 'SILVER', label: t('Silver') },
                                        { value: 'BRONZE', label: t('Bronze') },
                                        { value: 'MERIT', label: t('Merit') },
                                    ]}
                                    placeholder={t('Select medal')}
                                    searchPlaceholder={t('Search medals')}
                                    emptyMessage={t('No medals found')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Position')}</Label>
                                <Input
                                    type="number"
                                    value={quickAddForm.position}
                                    min={1}
                                    max={20}
                                    onChange={(e) => {
                                        setQuickAddField('position', e.target.value);
                                    }}
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>{t('Remarks')}</Label>
                                <Input
                                    value={quickAddForm.remarks}
                                    onChange={(e) => {
                                        setQuickAddField('remarks', e.target.value);
                                    }}
                                />
                            </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setQuickAddOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            disabled={quickAddSaving}
                            onClick={submitQuickAchievement}
                        >
                            {quickAddSaving ? t('Saving...') : t('Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            {member.full_name}
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

            <Dialog
                open={achievementPreview !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAchievementPreview(null);
                    }
                }}
            >
                <DialogContent
                    className="sm:max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {achievementPreview?.kind === 'tournament'
                                ? t('Tournament details')
                                : t('Event details')}
                        </DialogTitle>
                    </DialogHeader>

                    {achievementPreview ? (
                        <div className="space-y-4 text-sm">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('Session')}
                                    </p>
                                    <p>{achievementPreview.session.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('Tier / Level')}
                                    </p>
                                    <p>
                                        {achievementPreview.tournament
                                            .tier_code ?? t('Unknown')}
                                    </p>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('Tournament')}
                                    </p>
                                    <p>{achievementPreview.tournament.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('Venue')}
                                    </p>
                                    <p>
                                        {achievementPreview.tournament.venue ??
                                            '—'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('Date')}
                                    </p>
                                    <p>
                                        {[
                                            formatDisplayDate(
                                                achievementPreview.tournament
                                                    .date_from,
                                                pageLocale,
                                            ),
                                            formatDisplayDate(
                                                achievementPreview.tournament
                                                    .date_to,
                                                pageLocale,
                                            ),
                                        ]
                                            .filter(Boolean)
                                            .join(' - ') || t('No date')}
                                    </p>
                                </div>
                                {achievementPreview.kind === 'event' ? (
                                    <>
                                        <div className="space-y-1 sm:col-span-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t('Event')}
                                            </p>
                                            <p>
                                                {achievementPreview.event.name}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t('Discipline')}
                                            </p>
                                            <p>
                                                {achievementPreview.event
                                                    .discipline ?? '—'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t('Class')}
                                            </p>
                                            <p>
                                                {eventClassLabel(
                                                    achievementPreview.event
                                                        .gender_class,
                                                    t,
                                                )}
                                            </p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t('Event type')}
                                            </p>
                                            <p>
                                                {achievementPreview.event
                                                    .weight_category ?? '—'}
                                            </p>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAchievementPreview(null)}
                        >
                            {t('Close')}
                        </Button>
                        {previewUrl ? (
                            <Button asChild>
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="mr-1.5 h-4 w-4" />
                                    {t('Open in new tab')}
                                </a>
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={achievementFiltersOpen}
                onOpenChange={(open) => {
                    setAchievementFiltersOpen(open);

                    if (!open) {
                        syncDraftAchievementFilters();
                    }
                }}
            >
                <DialogContent
                    className="overflow-hidden p-0 sm:max-w-3xl"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <div className="border-b bg-muted/30 px-6 py-5">
                            <DialogTitle className="text-base font-semibold">
                                {t('Filters')}
                            </DialogTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t(
                                    'Refine post-recruitment achievements without leaving the table.',
                                )}
                            </p>
                        </div>
                    </DialogHeader>

                    <div className="space-y-5 px-6 py-5">
                        <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Search & scope')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Narrow the list by text, session, medal, and event dates.',
                                    )}
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label
                                        htmlFor="achievement-filter-search"
                                        className="text-xs font-medium text-muted-foreground"
                                    >
                                        {t('Search…')}
                                    </Label>
                                    <Input
                                        id="achievement-filter-search"
                                        value={draftAchievementFilters.search}
                                        onChange={(e) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    search: e.target.value,
                                                }),
                                            )
                                        }
                                        placeholder={t(
                                            'Search events, medals, benefits…',
                                        )}
                                        className="h-10 bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {t('Session')}
                                    </Label>
                                    <Select
                                        value={draftAchievementFilters.session}
                                        onValueChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    session: value as
                                                        | 'all'
                                                        | 'current'
                                                        | string,
                                                }),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue
                                                placeholder={t('All sessions')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="current">
                                                {t('Current')}
                                            </SelectItem>
                                            <SelectItem value="all">
                                                {t('All sessions')}
                                            </SelectItem>
                                            {(participations ?? []).map(
                                                (group) => (
                                                    <SelectItem
                                                        key={group.session.id}
                                                        value={String(
                                                            group.session.id,
                                                        )}
                                                    >
                                                        {group.session.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {t('Medal')}
                                    </Label>
                                    <Select
                                        value={draftAchievementFilters.medal}
                                        onValueChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    medal: value as AchievementFiltersState['medal'],
                                                }),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue
                                                placeholder={t('All medals')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('All medals')}
                                            </SelectItem>
                                            <SelectItem value="GOLD">
                                                {t('Gold')}
                                            </SelectItem>
                                            <SelectItem value="SILVER">
                                                {t('Silver')}
                                            </SelectItem>
                                            <SelectItem value="BRONZE">
                                                {t('Bronze')}
                                            </SelectItem>
                                            <SelectItem value="MERIT">
                                                {t('MERIT')}
                                            </SelectItem>
                                            <SelectItem value="none">
                                                {t('No medal')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="achievement-filter-date-from"
                                        className="text-xs font-medium text-muted-foreground"
                                    >
                                        {t('Date from')}
                                    </Label>
                                    <DatePicker
                                        id="achievement-filter-date-from"
                                        value={draftAchievementFilters.dateFrom}
                                        onChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    dateFrom: value,
                                                }),
                                            )
                                        }
                                        className="gap-2"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="achievement-filter-date-to"
                                        className="text-xs font-medium text-muted-foreground"
                                    >
                                        {t('Date to')}
                                    </Label>
                                    <DatePicker
                                        id="achievement-filter-date-to"
                                        value={draftAchievementFilters.dateTo}
                                        onChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    dateTo: value,
                                                }),
                                            )
                                        }
                                        className="gap-2"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {t('Classification')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'Filter by competition level, event class, and recorded benefits.',
                                    )}
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {t('Tier')}
                                    </Label>
                                    <Select
                                        value={draftAchievementFilters.tier}
                                        onValueChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    tier: value,
                                                }),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue
                                                placeholder={t('All tiers')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('All tiers')}
                                            </SelectItem>
                                            {Array.from(
                                                new Set(
                                                    (participations ?? []).flatMap(
                                                        (group) =>
                                                            group.participations
                                                                .map(
                                                                    (
                                                                        participation,
                                                                    ) =>
                                                                        participation
                                                                            .tournament
                                                                            .tier_code,
                                                                )
                                                                .filter(
                                                                    Boolean,
                                                                ) as string[],
                                                    ),
                                                ),
                                            ).map((tier) => (
                                                <SelectItem
                                                    key={tier}
                                                    value={tier}
                                                >
                                                    {tier}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {t('Class')}
                                    </Label>
                                    <Select
                                        value={
                                            draftAchievementFilters.eventClass
                                        }
                                        onValueChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    eventClass: value,
                                                }),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue
                                                placeholder={t('All types')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('All types')}
                                            </SelectItem>
                                            {Array.from(
                                                new Set(
                                                    (participations ?? []).flatMap(
                                                        (group) =>
                                                            group.participations.map(
                                                                (
                                                                    participation,
                                                                ) =>
                                                                    participation
                                                                        .event
                                                                        .gender_class,
                                                            ),
                                                    ),
                                                ),
                                            ).map((item) => (
                                                <SelectItem
                                                    key={item}
                                                    value={item}
                                                >
                                                    {eventClassLabel(item, t)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {t('Benefits')}
                                    </Label>
                                    <Select
                                        value={draftAchievementFilters.benefit}
                                        onValueChange={(value) =>
                                            setDraftAchievementFilters(
                                                (current) => ({
                                                    ...current,
                                                    benefit:
                                                        value as AchievementFiltersState['benefit'],
                                                }),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-10 bg-white sm:max-w-80">
                                            <SelectValue
                                                placeholder={t('All types')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('All types')}
                                            </SelectItem>
                                            <SelectItem value="benefit">
                                                {t('Benefit recorded')}
                                            </SelectItem>
                                            <SelectItem value="promotion">
                                                {t('Promotion')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </section>

                        {activeAchievementFilterChips.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {activeAchievementFilterChips.map((chip) => (
                                    <span
                                        key={chip}
                                        className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                                    >
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-between">
                        <Button
                            variant="ghost"
                            onClick={clearDraftAchievementFilters}
                            className="sm:mr-auto"
                        >
                            {t('Clear filters')}
                        </Button>
                        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    syncDraftAchievementFilters();
                                    setAchievementFiltersOpen(false);
                                }}
                            >
                                {t('Close')}
                            </Button>
                            <Button onClick={applyAchievementFilters}>
                                {t('Apply filters')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}
