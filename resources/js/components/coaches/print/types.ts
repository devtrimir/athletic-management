import type { RankOption } from '@/lib/ranks';

export type TournamentTierInfo = {
    tier_code?: string | null;
    tier_label_en?: string | null;
    tier_label_hi?: string | null;
    tier_label?: string | null;
};

export type Coach = {
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

export type CoachSport = {
    id: number;
    name: string;
    is_primary: boolean;
    sport_event: string | null;
    level: string | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
};

export type CoachCertification = {
    id: number;
    name: string;
    certificate_type: string | null;
    issuer: string | null;
    issued_at: string | null;
    expired_at: string | null;
};

export type CoachAssignment = {
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

export type CoachStatusHistory = {
    id: number;
    status: string;
    effective_on: string;
    reason: string | null;
    recorded_by_name: string | null;
};

export type AchievementBenefit = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

export type CoachAchievementPlayer = {
    achievement_id: number;
    member: {
        id: number;
        full_name: string;
        pno: string | null;
        is_coach?: boolean;
        coach_id?: number | null;
    };
    medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT';
    position: number | null;
    participation_position: number | null;
    remarks: string | null;
    benefits: AchievementBenefit[];
};

export type CoachAchievementGroup = {
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
        event_type?: string | null;
        sport: { id: number; name: string } | null;
    };
    medal_counts: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number>;
    players: CoachAchievementPlayer[];
};

export type CoachAchievementsData = {
    summary: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number> & {
        total_events: number;
        medal_winning_players: number;
    };
    groups: CoachAchievementGroup[];
};

export type SpecialAchievementRecord = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    place: string | null;
    remarks: string | null;
};

export type SpecialAchievementsData = {
    records: SpecialAchievementRecord[];
    summary: {
        total: number;
        commendation_discs: number;
    };
};

export type PlayingAchievementRecord = {
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

export type MemberPlayingAchievementRecord = {
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

export type PlayingAchievementsData = {
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

export type CoachPromotion = {
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
        medal_counts?: Record<string, number>;
        players?: {
            member: {
                id: number;
                full_name: string;
                pno: string | null;
                is_coach?: boolean;
            };
            medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | null;
        }[];
    }[];
};

export type PromotionEvidenceTablePlayer = {
    member: {
        id: number;
        full_name: string;
        pno: string | null;
        is_coach?: boolean;
    };
    medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | null;
};

export type PromotionEvidenceTableRow = {
    key: string;
    session?: string | null;
    tournament?: string | null;
    venue?: string | null;
    date?: string | null;
    tier?: string | number | null;
    event?: string | null;
    eventType?: string | null;
    gender?: string | null;
    result?: string | null;
    players?: PromotionEvidenceTablePlayer[];
};

export type SectionKey =
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

export type CoachPrintPreviewProps = {
    coach: Coach;
    coachTeams?: CoachAssignment[];
    statusHistory?: CoachStatusHistory[];
    coachAchievements?: CoachAchievementsData;
    specialAchievements?: SpecialAchievementsData;
    playingAchievements?: PlayingAchievementsData;
    ranks?: RankOption[];
};

export const LETTERHEAD_LOGO_SRC = '/logo.jpg';

export const SECTION_LABELS: Record<SectionKey, string> = {
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

export const DEFAULT_SECTIONS: SectionKey[] = [
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
