import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/use-translation';
import { coachRoleLabel } from '@/lib/coach';
import { resolveRankLabel } from '@/lib/ranks';
import type { RankOption } from '@/lib/ranks';

type TournamentTierInfo = {
    tier_code?: string | null;
    tier_label_en?: string | null;
    tier_label_hi?: string | null;
    tier_label?: string | null;
};

type Coach = {
    id: number;
    full_name: string;
    display_name: string | null;
    blood_group: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string | null;
    bio: string | null;
    address: string | null;
    photo_path: string | null;
    pno: string | null;
    mobile: string | null;
    district?: { id: number; name: string } | null;
    unit?: { id: number; name: string } | null;
    rank_master?: {
        id: number;
        code: string | null;
        name: string | null;
        short_name: string | null;
    } | null;
    sports?: CoachSport[];
    certifications?: CoachCertification[];
    promotions?: CoachPromotion[];
};

type CoachSport = {
    id: number;
    name: string;
    is_primary: boolean;
    sport_event: string | null;
    level: string | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
};

type CoachCertification = {
    id: number;
    name: string;
    certificate_type: string | null;
    issuer: string | null;
    issued_at: string | null;
    expired_at: string | null;
};

type CoachAssignment = {
    id: number;
    role: string | null;
    is_current: boolean;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
    team: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type CoachStatusHistory = {
    id: number;
    status: string;
    effective_on: string;
    reason: string | null;
    recorded_by_name: string | null;
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

type CoachAchievementGroup = {
    id: string;
    session: { id: number; name: string; is_current: boolean };
    team: { id: number; name: string };
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        tier_label_en?: string | null;
        tier_label_hi?: string | null;
        tier_label?: string | null;
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
    players: CoachAchievementPlayer[];
};

type CoachAchievementsData = {
    summary: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number> & {
        total_events: number;
        medal_winning_players: number;
    };
    groups: CoachAchievementGroup[];
};

type SpecialAchievementRecord = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    place: string | null;
    remarks: string | null;
};

type SpecialAchievementsData = {
    records: SpecialAchievementRecord[];
    summary: {
        total: number;
        commendation_discs: number;
    };
};

type PlayingAchievementRecord = {
    id: number;
    title: string;
    period: string | null;
    level: string | null;
    competition_details: string | null;
    event_date: string | null;
    venue: string | null;
    sport_id: number;
    sport: { id: number; name: string } | null;
    event: string | null;
    medal_type: string | null;
    event_type: 'team' | 'individual' | null;
    position: number | null;
    achieved_on: string | null;
    remarks: string | null;
};

type MemberPlayingAchievementRecord = {
    id: number;
    medal_type: string | null;
    position: number | null;
    remarks: string | null;
    session: { id: number; name: string };
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        tier_label: string | null;
        tier_label_en?: string | null;
        tier_label_hi?: string | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
    };
    event: { id: number; name: string };
    event_kind: 'team' | 'individual';
    achieved_on: string | null;
};

type PlayingAchievementsData = {
    source: 'member' | 'legacy';
    linked_member: {
        id: number;
        member_code: string;
        full_name: string;
    } | null;
    records: (PlayingAchievementRecord | MemberPlayingAchievementRecord)[];
    summary: {
        total: number;
        medals: number;
    };
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
    evidences: {
        id: number;
        summary: string | null;
        session: { id: number; name: string } | null;
        tournament: {
            id: number;
            name: string;
            tier_code: string | null;
            tier_label_en?: string | null;
            tier_label_hi?: string | null;
            tier_label?: string | null;
            date_from?: string | null;
            date_to?: string | null;
            venue?: string | null;
        } | null;
        event: {
            id: number;
            name: string;
            gender_class?: string | null;
            discipline?: string | null;
            weight_category: string | null;
            event_type?: string | null;
        } | null;
        team: { id: number; name: string } | null;
        achievement?: {
            id: number;
            medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | null;
            position: number | null;
        } | null;
    }[];
};

type PromotionEvidenceTableRow = {
    key: string;
    session?: string | null;
    tournament?: string | null;
    event?: string | null;
    eventType?: string | null;
    level?: string | number | null;
    date?: string | null;
    gender?: string | null;
    result?: string | null;
    venue?: string | null;
};

type SectionKey =
    | 'profile'
    | 'service'
    | 'sports'
    | 'assignments'
    | 'achievements'
    | 'specialAchievements'
    | 'playingAchievements'
    | 'certifications'
    | 'promotions'
    | 'status';

type Props = {
    coach: Coach;
    coachTeams?: CoachAssignment[];
    statusHistory?: CoachStatusHistory[];
    coachAchievements?: CoachAchievementsData;
    specialAchievements?: SpecialAchievementsData;
    playingAchievements?: PlayingAchievementsData;
    ranks?: RankOption[];
};

const LETTERHEAD_LOGO_SRC = '/logo.jpg';

const SECTION_LABELS: Record<SectionKey, string> = {
    profile: 'Profile details',
    service: 'Service and contact',
    sports: 'Playable sports',
    assignments: 'Team assignments',
    achievements: 'Achievements',
    specialAchievements: 'Special achievements',
    playingAchievements: 'Playing career achievements',
    certifications: 'Certifications',
    promotions: 'Promotions / rewards',
    status: 'Status history',
};

const DEFAULT_SECTIONS: SectionKey[] = [
    'profile',
    'service',
    'sports',
    'assignments',
    'achievements',
    'specialAchievements',
    'playingAchievements',
    'certifications',
    'promotions',
    'status',
];

function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
}

function humanize(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const datePart = value.trim().split('T')[0].split(' ')[0];
    const [year, month, day] = datePart.split('-');

    if (!year || !month || !day) {
        return value;
    }

    return `${day}/${month}/${year}`;
}

function genderLabel(value: string | null | undefined): string {
    if (value === 'M') {
        return 'Male';
    }

    if (value === 'F') {
        return 'Female';
    }

    if (value === 'O') {
        return 'Other';
    }

    return value ?? '';
}

function rankLabel(coach: Coach): string {
    return (
        coach.rank_master?.name ??
        coach.rank_master?.short_name ??
        coach.rank_master?.code ??
        ''
    );
}

const TIER_FALLBACKS: Record<string, { en: string; hi: string }> = {
    INTERNATIONAL: { en: 'International', hi: 'अंतरराष्ट्रीय' },
    NATIONAL: { en: 'National', hi: 'राष्ट्रीय' },
    AIPSC: { en: 'All India Police (AIPSC)', hi: 'अखिल भारतीय पुलिस (AIPSC)' },
    STATE: { en: 'State', hi: 'राज्य' },
    ZONAL: { en: 'Zonal', hi: 'क्षेत्रीय' },
    OTHER: { en: 'Other', hi: 'अन्य' },
};

function tierLabel(
    tier: TournamentTierInfo | null | undefined,
    locale: string,
    t: (key: string) => string,
): string | null {
    if (!tier) {
        return null;
    }

    const configured =
        locale === 'en'
            ? (tier.tier_label_en ?? tier.tier_label)
            : (tier.tier_label_hi ?? tier.tier_label);

    if (configured) {
        return configured;
    }

    if (tier.tier_code) {
        const codeUpper = tier.tier_code.toUpperCase();
        const fallback = TIER_FALLBACKS[codeUpper];

        if (fallback) {
            return locale === 'en' ? fallback.en : fallback.hi;
        }

        const translated = t(tier.tier_code);

        return translated === tier.tier_code
            ? humanize(tier.tier_code)
            : translated;
    }

    return null;
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="break-inside-avoid rounded-lg border bg-white p-3 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase print:mb-1 print:text-[10px] print:text-black">
                {title}
            </h2>
            {children}
        </section>
    );
}

function DetailsTable({
    rows,
}: {
    rows: { label: string; value: React.ReactNode }[];
}) {
    const visibleRows = rows.filter((row) => hasValue(row.value));

    if (visibleRows.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full text-xs">
                <tbody className="print:text-[10px]">
                    {visibleRows.map((row) => (
                        <tr
                            key={row.label}
                            className="border-t first:border-t-0"
                        >
                            <th className="w-1/3 bg-muted/30 p-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase print:py-1 print:text-[9px]">
                                {row.label}
                            </th>
                            <td className="p-2 text-foreground print:py-1">
                                {row.value}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function hasAnyValue<T>(items: T[], extractor: (item: T) => unknown): boolean {
    return items.some((item) => hasValue(extractor(item)));
}

function genderClassLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string | null {
    if (!value) {
        return null;
    }

    const labels: Record<string, string> = {
        F: 'Female',
        M: 'Male',
        MIXED: 'Mixed',
        OPEN: 'Open',
        O: 'Other',
    };

    return t(labels[value.toUpperCase()] ?? humanize(value));
}

function hasPromotionFields(row: CoachPromotion): boolean {
    const hasRankChange = !!(
        row.from_rank &&
        row.to_rank &&
        row.from_rank !== row.to_rank
    );

    return !!(row.promotion_date || hasRankChange || row.reason || row.remarks);
}

function hasRewardFields(row: CoachPromotion): boolean {
    return !!(
        row.cash_reward_amount ||
        row.cash_reward_date ||
        row.cash_reward_reference ||
        row.cash_reward_remarks
    );
}

function promotionEvidenceKey(
    evidence: CoachPromotion['evidences'][number],
): string {
    if (evidence.tournament?.id && evidence.event?.id) {
        return `event:${evidence.tournament.id}:${evidence.event.id}`;
    }

    return `evidence:${evidence.id}`;
}

function promotionEvidenceTableRows(
    row: CoachPromotion,
    locale: string,
    t: (key: string) => string,
): PromotionEvidenceTableRow[] {
    const rows = new Map<string, PromotionEvidenceTableRow>();

    for (const evidence of row.evidences) {
        const result = evidence.achievement?.medal_type
            ? t(evidence.achievement.medal_type) ===
              evidence.achievement.medal_type
                ? humanize(evidence.achievement.medal_type)
                : t(evidence.achievement.medal_type)
            : evidence.achievement?.position != null
              ? `${t('Position')}: ${evidence.achievement.position}`
              : null;

        const eventType = evidence.event?.event_type
            ? evidence.event.event_type === 'team'
                ? t('Team')
                : t('Individual')
            : evidence.team
              ? t('Team')
              : null;

        rows.set(promotionEvidenceKey(evidence), {
            key: promotionEvidenceKey(evidence),
            session: evidence.session?.name,
            tournament: evidence.tournament?.name ?? evidence.summary,
            event: evidence.event?.name,
            eventType,
            level: tierLabel(evidence.tournament, locale, t),
            date: formatDate(evidence.tournament?.date_from),
            gender: genderClassLabel(evidence.event?.gender_class, t),
            result,
            venue: evidence.tournament?.venue,
        });
    }

    return Array.from(rows.values());
}

function PromotionEvidenceTable({
    rows,
    t,
}: {
    rows: PromotionEvidenceTableRow[];
    t: (key: string) => string;
}) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <table className="w-full border-collapse text-xs print:text-[9px]">
            <thead className="bg-muted/40 text-left text-[10px] tracking-wide text-muted-foreground uppercase print:text-[8px]">
                <tr>
                    <th className="w-12 border p-1.5 whitespace-nowrap">
                        {t('S. No.')}
                    </th>
                    <th className="w-16 border p-1.5 whitespace-nowrap">
                        {t('Session')}
                    </th>
                    <th className="border p-1.5">{t('Tournament')}</th>
                    <th className="border p-1.5">{t('Event')}</th>
                    <th className="w-16 border p-1.5 whitespace-nowrap">
                        {t('Event type')}
                    </th>
                    <th className="w-20 border p-1.5 whitespace-nowrap">
                        {t('Level')}
                    </th>
                    <th className="w-24 border p-1.5 whitespace-nowrap">
                        {t('Event date')}
                    </th>
                    <th className="w-14 border p-1.5 whitespace-nowrap">
                        {t('Gender')}
                    </th>
                    <th className="border p-1.5 whitespace-nowrap">
                        {t('Result')}
                    </th>
                    <th className="border p-1.5">{t('Venue')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => (
                    <tr key={row.key}>
                        <td className="border p-1.5 text-center text-muted-foreground">
                            {index + 1}
                        </td>
                        <td className="border p-1.5 align-top whitespace-nowrap">
                            {row.session || '—'}
                        </td>
                        <td className="border p-1.5 align-top">
                            {row.tournament || '—'}
                        </td>
                        <td className="border p-1.5 align-top">
                            {row.event || '—'}
                        </td>
                        <td className="border p-1.5 align-top whitespace-nowrap">
                            {row.eventType || '—'}
                        </td>
                        <td className="border p-1.5 align-top whitespace-nowrap">
                            {row.level || '—'}
                        </td>
                        <td className="border p-1.5 align-top whitespace-nowrap">
                            {row.date || '—'}
                        </td>
                        <td className="border p-1.5 align-top whitespace-nowrap">
                            {row.gender || '—'}
                        </td>
                        <td className="border p-1.5 align-top font-medium whitespace-nowrap">
                            {row.result || '—'}
                        </td>
                        <td className="border p-1.5 align-top">
                            {row.venue || '—'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function DetailStack({
    items,
}: {
    items: { label: string; value: React.ReactNode; muted?: boolean }[];
}) {
    const visibleItems = items.filter((item) => hasValue(item.value));

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <table className="w-full border-collapse overflow-hidden rounded-sm border border-border/70 bg-background text-xs leading-4 print:text-[9px]">
            <tbody>
                {visibleItems.map((item) => (
                    <tr key={item.label} className="border-b last:border-b-0">
                        <th className="w-36 border-r bg-muted/30 px-2 py-1.5 text-left align-top font-medium text-muted-foreground print:w-28 print:px-1.5 print:py-1">
                            {item.label}
                        </th>
                        <td
                            className={
                                item.muted
                                    ? 'px-2 py-1.5 align-top break-words text-muted-foreground print:px-1.5 print:py-1'
                                    : 'px-2 py-1.5 align-top break-words text-foreground print:px-1.5 print:py-1'
                            }
                        >
                            {item.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function CoachPrintPreview({
    coach,
    coachTeams = [],
    statusHistory = [],
    coachAchievements,
    specialAchievements,
    playingAchievements,
    ranks = [],
}: Props) {
    const { t } = useTranslation();
    const { locale = 'en' } = usePage().props as { locale?: string };
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const [selectedSections, setSelectedSections] =
        useState<SectionKey[]>(DEFAULT_SECTIONS);
    const enabled = (section: SectionKey) => selectedSections.includes(section);

    const filename = useMemo(() => {
        const safeName = coach.full_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const date = new Date().toISOString().slice(0, 10);

        return `uppscb-coach-${safeName || coach.id}-${coach.pno || 'no-pno'}-${date}`;
    }, [coach.full_name, coach.id, coach.pno]);

    function handlePrint(): void {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

        document.title = filename;

        // Reparent the sheet to <body> for the duration of the print so the
        // print-isolation CSS only has to hide top-level siblings. Restored
        // on afterprint (fires even when the dialog is cancelled).
        const parent = target.parentNode;
        const nextSibling = target.nextSibling;
        document.body.appendChild(target);

        const restore = (): void => {
            window.removeEventListener('afterprint', restore);

            if (!parent) {
                return;
            }

            if (nextSibling) {
                parent.insertBefore(target, nextSibling);
            } else {
                parent.appendChild(target);
            }
        };

        window.addEventListener('afterprint', restore);
        window.print();
    }

    function toggleSection(section: SectionKey): void {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    }

    const sports = coach.sports ?? [];
    const certifications = coach.certifications ?? [];
    const promotions = coach.promotions ?? [];
    const achievements = coachAchievements?.groups ?? [];
    const specialAchievementRecords = specialAchievements?.records ?? [];
    const playingAchievementRecords = playingAchievements?.records ?? [];

    const showSportEvent = hasAnyValue(sports, (s) => s.sport_event);
    const showSportLevel = hasAnyValue(sports, (s) => s.level);
    const showSportPeriod = hasAnyValue(
        sports,
        (s) => s.effective_from || s.effective_to,
    );
    const showSportNotes = hasAnyValue(sports, (s) => s.notes);

    const showAssignmentSport = hasAnyValue(coachTeams, (a) => a.sport?.name);
    const showAssignmentSession = hasAnyValue(
        coachTeams,
        (a) => a.session?.name,
    );
    const showAssignmentRole = hasAnyValue(coachTeams, (a) => a.role);
    const showAssignmentAssignedAt = hasAnyValue(
        coachTeams,
        (a) => a.assigned_at,
    );
    const showAssignmentRemovedAt = hasAnyValue(
        coachTeams,
        (a) => a.removed_at,
    );

    const showSpecialAwardedOn = hasAnyValue(
        specialAchievementRecords,
        (r) => r.awarded_on,
    );
    const showSpecialIssuingAuthority = hasAnyValue(
        specialAchievementRecords,
        (r) => r.issuing_authority,
    );
    const showSpecialOrderReference = hasAnyValue(
        specialAchievementRecords,
        (r) => r.order_reference,
    );
    const showSpecialPlace = hasAnyValue(
        specialAchievementRecords,
        (r) => r.place,
    );
    const showSpecialRemarks = hasAnyValue(
        specialAchievementRecords,
        (r) => r.remarks,
    );

    const showCertType = hasAnyValue(certifications, (c) => c.certificate_type);
    const showCertIssuer = hasAnyValue(certifications, (c) => c.issuer);
    const showCertIssuedAt = hasAnyValue(certifications, (c) => c.issued_at);
    const showCertExpiredAt = hasAnyValue(certifications, (c) => c.expired_at);

    const showStatusReason = hasAnyValue(statusHistory, (s) => s.reason);
    const showStatusRecordedBy = hasAnyValue(
        statusHistory,
        (s) => s.recorded_by_name,
    );

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

    return (
        <>
            <Head title={`${coach.full_name} - ${t('Print preview')}`} />

            <div
                ref={printTargetRef}
                id="quick-view-print-target"
                className="relative mx-auto max-w-5xl space-y-4 overflow-hidden rounded-2xl border border-neutral-300 bg-white p-4 text-black shadow-sm print:max-w-none print:space-y-2 print:rounded-none print:border-0 print:p-0 print:text-[10px] print:leading-4 print:shadow-none"
            >
                <div className="pointer-events-none absolute inset-0 hidden print:block">
                    <div className="absolute inset-0 border border-neutral-300/70" />
                    <div className="absolute inset-3 border border-dashed border-neutral-300/60" />
                </div>
                <img
                    src={LETTERHEAD_LOGO_SRC}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 z-0 hidden size-[520px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.045] print:block"
                />

                <div className="flex items-start justify-between gap-4 print:hidden">
                    <div className="flex items-start gap-4">
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                                {[t('Coaches'), coach.full_name].join(' / ')}
                            </div>
                            <h1 className="text-2xl font-bold">
                                {t('Print preview')}
                            </h1>
                            <div className="pt-1">
                                <LocaleSwitcher />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={CoachController.show.url(coach)}>
                                <ArrowLeft className="mr-1.5 size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button type="button" onClick={handlePrint}>
                            <Printer className="mr-1.5 size-4" />
                            {t('Print')}
                        </Button>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-4 border-b-2 border-neutral-900 pb-3 print:gap-3 print:pb-2">
                    <img
                        src={LETTERHEAD_LOGO_SRC}
                        alt={t('UP Police Sports Control Board')}
                        className="size-20 shrink-0 object-contain print:size-16"
                    />
                    <div className="min-w-0 flex-1 text-center">
                        <div className="text-lg font-bold tracking-wide uppercase print:text-[16px]">
                            {t('UP Police Sports Control Board')}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-700 uppercase print:text-[11px] print:text-black">
                            {t('Coach profile record')}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground print:text-[9px] print:text-neutral-700">
                            {t('Official print preview')}
                        </div>
                    </div>
                    <div
                        className="hidden w-20 print:block"
                        aria-hidden="true"
                    />
                </div>

                <div className="grid gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 print:hidden">
                    <div className="text-sm font-semibold text-foreground">
                        {t('Print options')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_SECTIONS.map((section) => (
                            <label
                                key={section}
                                className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"
                            >
                                <Checkbox
                                    checked={selectedSections.includes(section)}
                                    onCheckedChange={() =>
                                        toggleSection(section)
                                    }
                                />
                                <span>{t(SECTION_LABELS[section])}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 grid gap-3 print:gap-2">
                    {enabled('profile') && (
                        <Section title={t('Profile details')}>
                            <div className="flex items-start gap-4 print:gap-3">
                                <div className="min-w-0 flex-1 space-y-3 print:space-y-2">
                                    <div>
                                        <div className="text-2xl leading-tight font-bold text-foreground print:text-[16px]">
                                            {coach.full_name}
                                        </div>
                                        <div className="mt-2 border-b border-neutral-200 print:mt-1.5" />
                                    </div>
                                    <DetailsTable
                                        rows={[
                                            {
                                                label: t('PNO'),
                                                value: coach.pno ? (
                                                    <span className="font-mono">
                                                        {coach.pno}
                                                    </span>
                                                ) : null,
                                            },
                                            {
                                                label: t('Rank'),
                                                value: rankLabel(coach),
                                            },
                                            {
                                                label: t('Gender'),
                                                value: genderLabel(
                                                    coach.gender,
                                                ),
                                            },
                                            {
                                                label: t('Date of birth'),
                                                value: formatDate(
                                                    coach.date_of_birth,
                                                ),
                                            },
                                            {
                                                label: t('Blood group'),
                                                value: coach.blood_group,
                                            },
                                            {
                                                label: t('Status'),
                                                value: humanize(
                                                    coach.coach_status,
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="size-28 shrink-0 overflow-hidden rounded-md border bg-muted print:size-24">
                                    {coach.photo_path ? (
                                        <img
                                            src={`/storage/${coach.photo_path}`}
                                            alt={coach.full_name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground print:text-[9px]">
                                            {t('No photo')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Section>
                    )}

                    {enabled('service') && (
                        <Section title={t('Service and contact')}>
                            <DetailsTable
                                rows={[
                                    {
                                        label: t('Mobile'),
                                        value: coach.mobile,
                                    },
                                    {
                                        label: t('Email'),
                                        value: coach.email,
                                    },
                                    {
                                        label: t('Unit'),
                                        value: coach.unit?.name,
                                    },
                                    {
                                        label: t('District'),
                                        value: coach.district?.name,
                                    },
                                    {
                                        label: t('Address'),
                                        value: coach.address,
                                    },
                                    {
                                        label: t('Bio'),
                                        value: coach.bio,
                                    },
                                ]}
                            />
                        </Section>
                    )}

                    {enabled('sports') && sports.length > 0 && (
                        <Section title={t('Playable sports')}>
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="p-2">
                                                {t('Sport')}
                                            </th>
                                            {showSportEvent && (
                                                <th className="p-2">
                                                    {t('Event / Discipline')}
                                                </th>
                                            )}
                                            {showSportLevel && (
                                                <th className="p-2">
                                                    {t('Level')}
                                                </th>
                                            )}
                                            {showSportPeriod && (
                                                <th className="p-2 whitespace-nowrap">
                                                    {t('Period')}
                                                </th>
                                            )}
                                            {showSportNotes && (
                                                <th className="p-2">
                                                    {t('Notes')}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="print:text-[10px]">
                                        {sports.map((sport) => (
                                            <tr
                                                key={sport.id}
                                                className="border-t print:align-top"
                                            >
                                                <td className="p-2 font-medium print:py-1">
                                                    {sport.name}
                                                    {sport.is_primary && (
                                                        <span className="ml-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase print:text-[8px]">
                                                            {t('Primary')}
                                                        </span>
                                                    )}
                                                </td>
                                                {showSportEvent && (
                                                    <td className="p-2 print:py-1">
                                                        {sport.sport_event ||
                                                            '—'}
                                                    </td>
                                                )}
                                                {showSportLevel && (
                                                    <td className="p-2 print:py-1">
                                                        {sport.level || '—'}
                                                    </td>
                                                )}
                                                {showSportPeriod && (
                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                        {[
                                                            formatDate(
                                                                sport.effective_from,
                                                            ),
                                                            formatDate(
                                                                sport.effective_to,
                                                            ),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' - ') || '—'}
                                                    </td>
                                                )}
                                                {showSportNotes && (
                                                    <td className="p-2 print:py-1">
                                                        {sport.notes || '—'}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {enabled('assignments') && coachTeams.length > 0 && (
                        <Section title={t('Team assignments')}>
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="w-10 p-2 text-center align-top">
                                                {t('S. No.')}
                                            </th>
                                            <th className="p-2">{t('Team')}</th>
                                            {showAssignmentSport && (
                                                <th className="p-2">
                                                    {t('Sport')}
                                                </th>
                                            )}
                                            {showAssignmentSession && (
                                                <th className="p-2">
                                                    {t('Session')}
                                                </th>
                                            )}
                                            {showAssignmentRole && (
                                                <th className="p-2">
                                                    {t('Role')}
                                                </th>
                                            )}
                                            {showAssignmentAssignedAt && (
                                                <th className="p-2 whitespace-nowrap">
                                                    {t('Assigned at')}
                                                </th>
                                            )}
                                            {showAssignmentRemovedAt && (
                                                <th className="p-2 whitespace-nowrap">
                                                    {t('Removed at')}
                                                </th>
                                            )}
                                            <th className="p-2 whitespace-nowrap">
                                                {t('Status')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="print:text-[10px]">
                                        {coachTeams.map((assignment, index) => (
                                            <tr
                                                key={assignment.id}
                                                className="border-t print:align-top"
                                            >
                                                <td className="p-2 text-center text-muted-foreground print:py-1">
                                                    {index + 1}
                                                </td>
                                                <td className="p-2 font-medium print:py-1">
                                                    {assignment.team?.name ??
                                                        '—'}
                                                </td>
                                                {showAssignmentSport && (
                                                    <td className="p-2 print:py-1">
                                                        {assignment.sport
                                                            ?.name ?? '—'}
                                                    </td>
                                                )}
                                                {showAssignmentSession && (
                                                    <td className="p-2 print:py-1">
                                                        {assignment.session
                                                            ?.name ?? '—'}
                                                    </td>
                                                )}
                                                {showAssignmentRole && (
                                                    <td className="p-2 print:py-1">
                                                        {coachRoleLabel(
                                                            assignment.role,
                                                            t,
                                                        ) || '—'}
                                                    </td>
                                                )}
                                                {showAssignmentAssignedAt && (
                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                        {formatDate(
                                                            assignment.assigned_at,
                                                        ) || '—'}
                                                    </td>
                                                )}
                                                {showAssignmentRemovedAt && (
                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                        {formatDate(
                                                            assignment.removed_at,
                                                        ) || '—'}
                                                    </td>
                                                )}
                                                <td className="p-2 whitespace-nowrap print:py-1">
                                                    <span
                                                        className={
                                                            assignment.is_current
                                                                ? 'font-medium text-emerald-700'
                                                                : 'text-muted-foreground'
                                                        }
                                                    >
                                                        {assignment.is_current
                                                            ? t('Current')
                                                            : t('Removed')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {enabled('achievements') && achievements.length > 0 && (
                        <Section title={t('Achievements')}>
                            <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-6 print:grid-cols-6 print:p-2 print:text-[9px]">
                                {(
                                    [
                                        'GOLD',
                                        'SILVER',
                                        'BRONZE',
                                        'MERIT',
                                    ] as const
                                ).map((medal) => (
                                    <div key={medal} className="text-center">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                                            {humanize(medal)}
                                        </div>
                                        <div className="text-sm font-bold text-foreground print:text-[11px]">
                                            {coachAchievements?.summary[
                                                medal
                                            ] ?? 0}
                                        </div>
                                    </div>
                                ))}
                                <div className="text-center">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                                        {t('Events')}
                                    </div>
                                    <div className="text-sm font-bold text-foreground print:text-[11px]">
                                        {coachAchievements?.summary
                                            .total_events ?? 0}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase print:text-[8px]">
                                        {t('Players')}
                                    </div>
                                    <div className="text-sm font-bold text-foreground print:text-[11px]">
                                        {coachAchievements?.summary
                                            .medal_winning_players ?? 0}
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="w-10 p-2 text-center align-top">
                                                {t('S. No.')}
                                            </th>
                                            <th className="p-2 align-top">
                                                {t('Tournament')}
                                            </th>
                                            <th className="w-[10%] p-2 align-top whitespace-nowrap">
                                                {t('Session')}
                                            </th>
                                            <th className="w-[12%] p-2 align-top">
                                                {t('Team')}
                                            </th>
                                            <th className="p-2 align-top">
                                                {t('Event')}
                                            </th>
                                            <th className="w-[12%] p-2 align-top">
                                                {t('Medals')}
                                            </th>
                                            <th className="p-2 align-top">
                                                {t('Players')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y print:text-[10px]">
                                        {achievements.map((group, index) => (
                                            <tr
                                                key={group.id}
                                                className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                            >
                                                <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3 align-top print:p-2">
                                                    <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                        {group.tournament.name}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-muted-foreground print:text-[9px]">
                                                        {[
                                                            tierLabel(
                                                                group.tournament,
                                                                locale,
                                                                t,
                                                            ),
                                                            formatDate(
                                                                group.tournament
                                                                    .date_from,
                                                            ),
                                                            group.tournament
                                                                .venue,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </div>
                                                </td>
                                                <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                    {group.session.name}
                                                </td>
                                                <td className="p-3 align-top text-xs font-medium text-foreground print:p-2 print:text-[9px]">
                                                    {group.team.name}
                                                </td>
                                                <td className="p-3 align-top print:p-2">
                                                    <div className="text-xs font-medium text-foreground print:text-[9px]">
                                                        {group.event.name}
                                                    </div>
                                                    {group.event
                                                        .weight_category && (
                                                        <div className="text-xs text-muted-foreground print:text-[9px]">
                                                            {
                                                                group.event
                                                                    .weight_category
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 align-top whitespace-nowrap print:p-2">
                                                    <div className="space-y-0.5 text-xs print:text-[9px]">
                                                        {(
                                                            [
                                                                'GOLD',
                                                                'SILVER',
                                                                'BRONZE',
                                                                'MERIT',
                                                            ] as const
                                                        )
                                                            .filter(
                                                                (m) =>
                                                                    (group
                                                                        .medal_counts[
                                                                        m
                                                                    ] ?? 0) > 0,
                                                            )
                                                            .map((m) => (
                                                                <div
                                                                    key={m}
                                                                    className="font-semibold text-foreground"
                                                                >
                                                                    {humanize(
                                                                        m,
                                                                    )}
                                                                    :{' '}
                                                                    {
                                                                        group
                                                                            .medal_counts[
                                                                            m
                                                                        ]
                                                                    }
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td>
                                                <td className="p-3 align-top print:p-2">
                                                    <div className="space-y-1">
                                                        {group.players.map(
                                                            (player) => (
                                                                <div
                                                                    key={
                                                                        player.achievement_id
                                                                    }
                                                                    className="text-xs leading-4 print:text-[9px]"
                                                                >
                                                                    <span className="font-medium text-foreground">
                                                                        {
                                                                            player
                                                                                .member
                                                                                .full_name
                                                                        }
                                                                    </span>
                                                                    {player
                                                                        .member
                                                                        .pno && (
                                                                        <span className="ml-1 font-mono text-muted-foreground">
                                                                            (
                                                                            {
                                                                                player
                                                                                    .member
                                                                                    .pno
                                                                            }
                                                                            )
                                                                        </span>
                                                                    )}
                                                                    <span className="mx-1 text-muted-foreground">
                                                                        ·
                                                                    </span>
                                                                    <span className="font-semibold text-foreground">
                                                                        {humanize(
                                                                            player.medal_type,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {enabled('specialAchievements') &&
                        specialAchievementRecords.length > 0 && (
                            <Section title={t('Special achievements')}>
                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                            <tr>
                                                <th className="w-10 p-2 text-center align-top">
                                                    {t('S. No.')}
                                                </th>
                                                <th className="p-2">
                                                    {t('Achievement type')}
                                                </th>
                                                <th className="p-2">
                                                    {t('Title')}
                                                </th>
                                                {showSpecialAwardedOn && (
                                                    <th className="p-2 whitespace-nowrap">
                                                        {t('Award date')}
                                                    </th>
                                                )}
                                                {showSpecialIssuingAuthority && (
                                                    <th className="p-2">
                                                        {t('Issuing authority')}
                                                    </th>
                                                )}
                                                {showSpecialOrderReference && (
                                                    <th className="p-2">
                                                        {t('Order reference')}
                                                    </th>
                                                )}
                                                {showSpecialPlace && (
                                                    <th className="p-2">
                                                        {t('Place')}
                                                    </th>
                                                )}
                                                {showSpecialRemarks && (
                                                    <th className="p-2">
                                                        {t('Remarks')}
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="print:text-[10px]">
                                            {specialAchievementRecords.map(
                                                (record, index) => (
                                                    <tr
                                                        key={record.id}
                                                        className="border-t print:align-top"
                                                    >
                                                        <td className="p-2 text-center text-muted-foreground print:py-1">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-2 print:py-1">
                                                            {humanize(
                                                                record.achievement_type,
                                                            )}
                                                        </td>
                                                        <td className="p-2 font-medium text-foreground print:py-1">
                                                            {record.title}
                                                        </td>
                                                        {showSpecialAwardedOn && (
                                                            <td className="p-2 whitespace-nowrap print:py-1">
                                                                {formatDate(
                                                                    record.awarded_on,
                                                                ) || '—'}
                                                            </td>
                                                        )}
                                                        {showSpecialIssuingAuthority && (
                                                            <td className="p-2 print:py-1">
                                                                {record.issuing_authority ||
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showSpecialOrderReference && (
                                                            <td className="p-2 print:py-1">
                                                                {record.order_reference ||
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showSpecialPlace && (
                                                            <td className="p-2 print:py-1">
                                                                {record.place ||
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showSpecialRemarks && (
                                                            <td className="p-2 print:py-1">
                                                                {record.remarks ||
                                                                    '—'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Section>
                        )}

                    {enabled('playingAchievements') &&
                        playingAchievementRecords.length > 0 && (
                            <Section
                                title={`${t('Playing career achievements')}${
                                    playingAchievements?.source === 'member'
                                        ? ` (${t('Derived from member record')})`
                                        : ` (${t('Legacy')})`
                                }`}
                            >
                                {playingAchievements?.source === 'member' ? (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="w-10 p-2 text-center align-top">
                                                        {t('S. No.')}
                                                    </th>
                                                    <th className="p-2 align-top">
                                                        {t('Tournament')}
                                                    </th>
                                                    <th className="w-[10%] p-2 align-top whitespace-nowrap">
                                                        {t('Session')}
                                                    </th>
                                                    <th className="p-2 align-top">
                                                        {t('Event')}
                                                    </th>
                                                    <th className="w-[9%] p-2 align-top whitespace-nowrap">
                                                        {t('Kind')}
                                                    </th>
                                                    <th className="w-[12%] p-2 align-top whitespace-nowrap">
                                                        {t('Date')}
                                                    </th>
                                                    <th className="w-[14%] p-2 align-top">
                                                        {t('Venue')}
                                                    </th>
                                                    <th className="w-[10%] p-2 align-top">
                                                        {t('Result')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y print:text-[10px]">
                                                {(
                                                    playingAchievementRecords as MemberPlayingAchievementRecord[]
                                                ).map((record, index) => (
                                                    <tr
                                                        key={record.id}
                                                        className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                    >
                                                        <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3 align-top print:p-2">
                                                            <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                {
                                                                    record
                                                                        .tournament
                                                                        .name
                                                                }
                                                            </div>
                                                            {tierLabel(
                                                                record.tournament,
                                                                locale,
                                                                t,
                                                            ) && (
                                                                <div className="mt-0.5 text-xs text-muted-foreground print:text-[9px]">
                                                                    {tierLabel(
                                                                        record.tournament,
                                                                        locale,
                                                                        t,
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                            {
                                                                record.session
                                                                    .name
                                                            }
                                                        </td>
                                                        <td className="p-3 align-top text-xs font-medium text-foreground print:p-2 print:text-[9px]">
                                                            {record.event.name}
                                                        </td>
                                                        <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                            {record.event_kind ===
                                                            'team'
                                                                ? t('Team')
                                                                : t(
                                                                      'Individual',
                                                                  )}
                                                        </td>
                                                        <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                            {formatDate(
                                                                record.achieved_on,
                                                            ) || '—'}
                                                        </td>
                                                        <td className="p-3 align-top text-xs break-words text-foreground print:p-2 print:text-[9px]">
                                                            {record.tournament
                                                                .venue || '—'}
                                                        </td>
                                                        <td className="p-3 align-top print:p-2">
                                                            <div className="text-xs leading-4 font-semibold text-foreground print:text-[9px]">
                                                                {record.medal_type
                                                                    ? humanize(
                                                                          record.medal_type,
                                                                      )
                                                                    : record.position
                                                                      ? `${t('Position')}: ${record.position}`
                                                                      : '—'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    (() => {
                                        const legacyRecords =
                                            playingAchievementRecords as PlayingAchievementRecord[];
                                        const groups = [
                                            {
                                                key: 'POST_RECRUITMENT',
                                                label: t('Post-recruitment'),
                                                rows: legacyRecords.filter(
                                                    (r) =>
                                                        r.period ===
                                                        'POST_RECRUITMENT',
                                                ),
                                            },
                                            {
                                                key: 'PRE_RECRUITMENT',
                                                label: t('Pre-recruitment'),
                                                rows: legacyRecords.filter(
                                                    (r) =>
                                                        r.period ===
                                                        'PRE_RECRUITMENT',
                                                ),
                                            },
                                            {
                                                key: 'OTHER',
                                                label: t('Other'),
                                                rows: legacyRecords.filter(
                                                    (r) =>
                                                        r.period !==
                                                            'POST_RECRUITMENT' &&
                                                        r.period !==
                                                            'PRE_RECRUITMENT',
                                                ),
                                            },
                                        ].filter((g) => g.rows.length > 0);

                                        return (
                                            <div className="space-y-4">
                                                {groups.map((group) => (
                                                    <div key={group.key}>
                                                        <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                            {group.label}
                                                        </div>
                                                        <div className="overflow-hidden rounded-md border print:rounded-sm">
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                                    <tr>
                                                                        <th className="w-10 p-2 text-center align-top">
                                                                            {t(
                                                                                'S. No.',
                                                                            )}
                                                                        </th>
                                                                        <th className="p-2 align-top">
                                                                            {t(
                                                                                'Title',
                                                                            )}
                                                                        </th>
                                                                        <th className="p-2 align-top">
                                                                            {t(
                                                                                'Competition / Event',
                                                                            )}
                                                                        </th>
                                                                        <th className="w-[10%] p-2 align-top whitespace-nowrap">
                                                                            {t(
                                                                                'Level',
                                                                            )}
                                                                        </th>
                                                                        <th className="w-[9%] p-2 align-top whitespace-nowrap">
                                                                            {t(
                                                                                'Kind',
                                                                            )}
                                                                        </th>
                                                                        <th className="w-[12%] p-2 align-top whitespace-nowrap">
                                                                            {t(
                                                                                'Event date',
                                                                            )}
                                                                        </th>
                                                                        <th className="w-[14%] p-2 align-top">
                                                                            {t(
                                                                                'Venue',
                                                                            )}
                                                                        </th>
                                                                        <th className="w-[10%] p-2 align-top">
                                                                            {t(
                                                                                'Result',
                                                                            )}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y print:text-[10px]">
                                                                    {group.rows.map(
                                                                        (
                                                                            record,
                                                                            index,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    record.id
                                                                                }
                                                                                className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                                            >
                                                                                <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                                                    {index +
                                                                                        1}
                                                                                </td>
                                                                                <td className="p-3 align-top font-medium text-foreground print:p-2">
                                                                                    {
                                                                                        record.title
                                                                                    }
                                                                                </td>
                                                                                <td className="p-3 align-top text-xs break-words text-foreground print:p-2 print:text-[9px]">
                                                                                    {[
                                                                                        record.competition_details,
                                                                                        record.event,
                                                                                    ]
                                                                                        .filter(
                                                                                            Boolean,
                                                                                        )
                                                                                        .join(
                                                                                            ' · ',
                                                                                        ) ||
                                                                                        '—'}
                                                                                </td>
                                                                                <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                                                    {tierLabel(
                                                                                        {
                                                                                            tier_code:
                                                                                                record.level,
                                                                                        },
                                                                                        locale,
                                                                                        t,
                                                                                    ) ||
                                                                                        record.level ||
                                                                                        '—'}
                                                                                </td>
                                                                                <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                                                    {record.event_type
                                                                                        ? record.event_type ===
                                                                                          'team'
                                                                                            ? t(
                                                                                                  'Team',
                                                                                              )
                                                                                            : t(
                                                                                                  'Individual',
                                                                                              )
                                                                                        : '—'}
                                                                                </td>
                                                                                <td className="p-3 align-top text-xs whitespace-nowrap text-foreground print:p-2 print:text-[9px]">
                                                                                    {formatDate(
                                                                                        record.event_date,
                                                                                    ) ||
                                                                                        '—'}
                                                                                </td>
                                                                                <td className="p-3 align-top text-xs break-words text-foreground print:p-2 print:text-[9px]">
                                                                                    {record.venue ||
                                                                                        '—'}
                                                                                </td>
                                                                                <td className="p-3 align-top print:p-2">
                                                                                    <div className="text-xs leading-4 font-semibold text-foreground print:text-[9px]">
                                                                                        {record.medal_type
                                                                                            ? humanize(
                                                                                                  record.medal_type,
                                                                                              )
                                                                                            : '—'}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </Section>
                        )}

                    {enabled('certifications') && certifications.length > 0 && (
                        <Section title={t('Certifications')}>
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="w-10 p-2 text-center align-top">
                                                {t('S. No.')}
                                            </th>
                                            <th className="p-2">
                                                {t('Certificate')}
                                            </th>
                                            {showCertType && (
                                                <th className="p-2">
                                                    {t('Type')}
                                                </th>
                                            )}
                                            {showCertIssuer && (
                                                <th className="p-2">
                                                    {t('Issuer')}
                                                </th>
                                            )}
                                            {showCertIssuedAt && (
                                                <th className="p-2 whitespace-nowrap">
                                                    {t('Issued at')}
                                                </th>
                                            )}
                                            {showCertExpiredAt && (
                                                <th className="p-2 whitespace-nowrap">
                                                    {t('Expired at')}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="print:text-[10px]">
                                        {certifications.map((cert, index) => (
                                            <tr
                                                key={cert.id}
                                                className="border-t print:align-top"
                                            >
                                                <td className="p-2 text-center text-muted-foreground print:py-1">
                                                    {index + 1}
                                                </td>
                                                <td className="p-2 font-medium text-foreground print:py-1">
                                                    {cert.name}
                                                </td>
                                                {showCertType && (
                                                    <td className="p-2 print:py-1">
                                                        {cert.certificate_type ||
                                                            '—'}
                                                    </td>
                                                )}
                                                {showCertIssuer && (
                                                    <td className="p-2 print:py-1">
                                                        {cert.issuer || '—'}
                                                    </td>
                                                )}
                                                {showCertIssuedAt && (
                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                        {formatDate(
                                                            cert.issued_at,
                                                        ) || '—'}
                                                    </td>
                                                )}
                                                {showCertExpiredAt && (
                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                        {formatDate(
                                                            cert.expired_at,
                                                        ) || '—'}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {enabled('promotions') && (
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
                                                <table className="w-full text-xs">
                                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                        <tr>
                                                            <th className="w-10 p-2 text-center align-top">
                                                                {t('S. No.')}
                                                            </th>
                                                            <th className="p-2 align-top">
                                                                {t('Promotion')}
                                                            </th>
                                                            {showPromotionDate && (
                                                                <th className="w-[20%] p-2 align-top">
                                                                    {t(
                                                                        'Promotion date',
                                                                    )}
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y print:text-[10px]">
                                                        {promotionRows.map(
                                                            (row, index) => {
                                                                const evidenceRows =
                                                                    promotionEvidenceTableRows(
                                                                        row,
                                                                        locale,
                                                                        t,
                                                                    );
                                                                const detailItems =
                                                                    [
                                                                        {
                                                                            label: t(
                                                                                'Reason',
                                                                            ),
                                                                            value: showPromotionReason
                                                                                ? row.reason
                                                                                : null,
                                                                        },
                                                                        {
                                                                            label: t(
                                                                                'Remarks',
                                                                            ),
                                                                            value: showPromotionRemarks
                                                                                ? row.remarks
                                                                                : null,
                                                                            muted: true,
                                                                        },
                                                                    ];
                                                                const hasEvidence =
                                                                    showPromotionEvidence &&
                                                                    evidenceRows.length >
                                                                        0;
                                                                const hasDetails =
                                                                    detailItems.some(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            hasValue(
                                                                                item.value,
                                                                            ),
                                                                    ) ||
                                                                    hasEvidence;

                                                                return (
                                                                    <Fragment
                                                                        key={`promotion-${row.id}`}
                                                                    >
                                                                        <tr className="align-top odd:bg-muted/10">
                                                                            <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                                                {index +
                                                                                    1}
                                                                            </td>
                                                                            <td className="p-3 align-top print:p-2">
                                                                                <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                                    {resolveRankLabel(
                                                                                        row.to_rank,
                                                                                        ranks,
                                                                                        '',
                                                                                    ) ||
                                                                                        '—'}
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
                                                                                <td className="p-3 align-top text-xs leading-4 break-words text-foreground print:p-2 print:text-[9px]">
                                                                                    {formatDate(
                                                                                        row.promotion_date,
                                                                                    ) ||
                                                                                        '—'}
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                        {hasDetails && (
                                                                            <tr className="bg-muted/5 print:break-inside-avoid">
                                                                                <td
                                                                                    className="px-3 pt-0 pb-3 print:px-2 print:pb-2"
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
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </Fragment>
                                                                );
                                                            },
                                                        )}
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
                                                <table className="w-full text-xs">
                                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                        <tr>
                                                            <th className="w-10 p-2 text-center align-top">
                                                                {t('S. No.')}
                                                            </th>
                                                            {showRewardAmount && (
                                                                <th className="w-[35%] p-2 align-top">
                                                                    {t(
                                                                        'Cash reward amount',
                                                                    )}
                                                                </th>
                                                            )}
                                                            {showRewardDate && (
                                                                <th className="w-[25%] p-2 align-top">
                                                                    {t(
                                                                        'Cash reward date',
                                                                    )}
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y print:text-[10px]">
                                                        {rewardRows.map(
                                                            (row, index) => {
                                                                const evidenceRows =
                                                                    promotionEvidenceTableRows(
                                                                        row,
                                                                        locale,
                                                                        t,
                                                                    );
                                                                const detailItems =
                                                                    [
                                                                        {
                                                                            label: t(
                                                                                'Cash reward reference',
                                                                            ),
                                                                            value: showRewardReference
                                                                                ? row.cash_reward_reference
                                                                                : null,
                                                                        },
                                                                        {
                                                                            label: t(
                                                                                'Remarks',
                                                                            ),
                                                                            value: showRewardRemarks
                                                                                ? row.cash_reward_remarks
                                                                                : null,
                                                                            muted: true,
                                                                        },
                                                                    ];
                                                                const hasEvidence =
                                                                    showRewardEvidence &&
                                                                    evidenceRows.length >
                                                                        0;
                                                                const hasDetails =
                                                                    detailItems.some(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            hasValue(
                                                                                item.value,
                                                                            ),
                                                                    ) ||
                                                                    hasEvidence;

                                                                return (
                                                                    <Fragment
                                                                        key={`reward-${row.id}`}
                                                                    >
                                                                        <tr className="align-top odd:bg-muted/10">
                                                                            <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                                                {index +
                                                                                    1}
                                                                            </td>
                                                                            {showRewardAmount && (
                                                                                <td className="p-3 align-top font-medium text-foreground print:p-2">
                                                                                    {row.cash_reward_amount
                                                                                        ? `₹${row.cash_reward_amount}`
                                                                                        : '—'}
                                                                                </td>
                                                                            )}
                                                                            {showRewardDate && (
                                                                                <td className="p-3 align-top text-xs leading-4 break-words text-foreground print:p-2 print:text-[9px]">
                                                                                    {formatDate(
                                                                                        row.cash_reward_date,
                                                                                    ) ||
                                                                                        '—'}
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                        {hasDetails && (
                                                                            <tr className="bg-muted/5 print:break-inside-avoid">
                                                                                <td
                                                                                    className="px-3 pt-0 pb-3 print:px-2 print:pb-2"
                                                                                    colSpan={
                                                                                        1 +
                                                                                        (showRewardAmount
                                                                                            ? 1
                                                                                            : 0) +
                                                                                        (showRewardDate
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
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </Fragment>
                                                                );
                                                            },
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Section>
                    )}

                    {enabled('status') && statusHistory.length > 0 && (
                        <Section title={t('Status history')}>
                            <div className="overflow-hidden rounded-md border print:rounded-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                        <tr>
                                            <th className="p-2">
                                                {t('Status')}
                                            </th>
                                            <th className="p-2 whitespace-nowrap">
                                                {t('Effective on')}
                                            </th>
                                            {showStatusReason && (
                                                <th className="p-2">
                                                    {t('Reason')}
                                                </th>
                                            )}
                                            {showStatusRecordedBy && (
                                                <th className="p-2">
                                                    {t('Recorded by')}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="print:text-[10px]">
                                        {statusHistory.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="border-t print:align-top"
                                            >
                                                <td className="p-2 font-medium print:py-1">
                                                    {humanize(row.status)}
                                                </td>
                                                <td className="p-2 whitespace-nowrap print:py-1">
                                                    {formatDate(
                                                        row.effective_on,
                                                    ) || '—'}
                                                </td>
                                                {showStatusReason && (
                                                    <td className="p-2 print:py-1">
                                                        {row.reason || '—'}
                                                    </td>
                                                )}
                                                {showStatusRecordedBy && (
                                                    <td className="p-2 print:py-1">
                                                        {row.recorded_by_name ||
                                                            '—'}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}
