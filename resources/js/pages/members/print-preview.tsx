import { Deferred, Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import type { BreadcrumbItem } from '@/types';

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name: string;
    father_name: string | null;
    rank: string | null;
    designation: string | null;
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
    appointment: string | null;
    home_address: string | null;
    recruitment_type: string | null;
    sport: { id: number; name: string } | null;
    playable_sports: {
        id: number;
        name: string;
        role?: string | null;
        position?: string | null;
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
type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
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
type LegacyAchievement = {
    id: number;
    period: string;
    session: { id: number; name: string } | null;
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport: { id: number; name: string } | null;
    sport_discipline: string | null;
    event: string | null;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string | null;
    medal_type: string | null;
    position: string | number | null;
    sort_order: number | null;
    remarks: string | null;
    benefits: AchievementBenefitRow[];
};
type AchievementRow = {
    id: number;
    medal_type: string;
    position: string | number | null;
    participation_position?: string | number | null;
    remarks: string | null;
    session: { id: number; name: string };
    tournament: {
        id: number;
        name: string;
        tier_code: string | null;
        tier_weight: number | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
    };
    event: { id: number; name: string };
    benefits: AchievementBenefitRow[];
};
type AchievementTierGroup = {
    key: string;
    label: string;
    weight: number;
    rows: AchievementRow[];
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
    evidences: PromotionEvidenceRow[];
};
type PromotionEvidenceRow = {
    id: number;
    type: string;
    evidence_id: number;
    summary: string | null;
    session?: { id: number; name: string } | null;
    tournament?: {
        id: number;
        name: string;
        tier_code: string | null;
        date_from: string | null;
        date_to: string | null;
        venue: string | null;
    } | null;
    event?: { id: number; name: string; gender_class: string | null } | null;
    achievement?: {
        id: number;
        medal_type: string | null;
        position: string | number | null;
        benefits: AchievementBenefitRow[];
    } | null;
    legacy_achievement?: {
        id: number;
        period: string;
        level: string;
        competition_details: string;
        event: string | null;
        event_date: string | null;
        venue: string | null;
        sport_discipline: string | null;
        medal_type: string | null;
        benefits: AchievementBenefitRow[];
    } | null;
};
type SpecialAchievementRow = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    order_document: { original_name: string | null } | null;
    place: string | null;
    remarks: string | null;
};
type SpecialAchievementsData = {
    records: SpecialAchievementRow[];
    summary: {
        total: number;
        commendation_discs: number;
    };
};
type ExternalCoachingAssignmentRow = {
    id: number;
    start_date: string | null;
    end_date: string | null;
    status: string | null;
    attendance_mode: string | null;
    external_coach: { id: number; name: string } | null;
    training_venue: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
};
type ExternalTrainingAttendanceRow = {
    id: number;
    attendance_date: string | null;
    attendance_status: string | null;
    geo_status: string | null;
    review_status: string | null;
    distance_from_venue_meters: number | null;
    flag_reason: string | null;
    external_coach: { name: string } | null;
    training_venue: { name: string } | null;
    sport: { name: string } | null;
};
type ExternalPerformanceUpdateRow = {
    id: number;
    update_date: string | null;
    performance_level: string | null;
    performance_score: number | null;
    training_summary: string | null;
    review_status: string | null;
    external_coach: { name: string } | null;
    sport: { name: string } | null;
};
type ExternalCoachingData = {
    assignments: ExternalCoachingAssignmentRow[];
    attendances: ExternalTrainingAttendanceRow[];
    performanceUpdates: ExternalPerformanceUpdateRow[];
};
type AuditChange = { field: string; old: string | null; new: string | null };
type AuditEntry = {
    id: number;
    action: string;
    subject: string;
    at: string;
    by: string | null;
    changes: AuditChange[];
};
type TimelineMode = 'story' | 'compact';
type SectionKey =
    | 'identity'
    | 'contact'
    | 'service'
    | 'sports'
    | 'status'
    | 'teams'
    | 'legacy'
    | 'achievements'
    | 'specialAchievements'
    | 'externalCoaching'
    | 'promotions'
    | 'timeline';

type Props = {
    member: Member;
    statusHistory?: StatusEntry[];
    memberTeams?: MemberTeamRow[];
    legacyAchievements?: LegacyAchievement[];
    achievements?: AchievementRow[];
    specialAchievements?: SpecialAchievementsData;
    externalCoaching?: ExternalCoachingData;
    promotions?: PromotionRow[];
    auditLog?: AuditEntry[];
};

const LETTERHEAD_LOGO_SRC = '/logo.jpg';

const UI_LABELS: Record<
    string,
    {
        en: string;
        hi: string;
    }
> = {
    Members: { en: 'Members', hi: 'सदस्य' },
    Back: { en: 'Back', hi: 'वापस' },
    Print: { en: 'Print', hi: 'प्रिंट' },
    'Print preview': { en: 'Print preview', hi: 'प्रिंट पूर्वावलोकन' },
    'Print options': { en: 'Print options', hi: 'प्रिंट विकल्प' },
    'UP Police Sports Unit': {
        en: 'UP Police Sports Unit',
        hi: 'उत्तर प्रदेश पुलिस खेल इकाई',
    },
    'Member profile record': {
        en: 'Member profile record',
        hi: 'सदस्य प्रोफाइल रिकॉर्ड',
    },
    'Official print preview': {
        en: 'Official print preview',
        hi: 'आधिकारिक प्रिंट पूर्वावलोकन',
    },
    'Story timeline': { en: 'Story timeline', hi: 'कथा समयरेखा' },
    'Compact timeline': { en: 'Compact timeline', hi: 'संक्षिप्त समयरेखा' },
    'Identity and personal details': {
        en: 'Identity and personal details',
        hi: 'पहचान और व्यक्तिगत विवरण',
    },
    identity: {
        en: 'Identity and personal details',
        hi: 'पहचान और व्यक्तिगत विवरण',
    },
    'Contact and address': {
        en: 'Contact and address',
        hi: 'संपर्क और पता',
    },
    contact: { en: 'Contact and address', hi: 'संपर्क और पता' },
    'Service and posting': { en: 'Service and posting', hi: 'सेवा और तैनाती' },
    service: { en: 'Service and posting', hi: 'सेवा और तैनाती' },
    'Sports and eligibility': {
        en: 'Sports and eligibility',
        hi: 'खेल और पात्रता',
    },
    sports: { en: 'Sports and eligibility', hi: 'खेल और पात्रता' },
    'Status history': { en: 'Status history', hi: 'स्थिति इतिहास' },
    status: { en: 'Status history', hi: 'स्थिति इतिहास' },
    'Team memberships': { en: 'Team memberships', hi: 'टीम सदस्यता' },
    teams: { en: 'Team memberships', hi: 'टीम सदस्यता' },
    'Legacy achievements': {
        en: 'Legacy achievements',
        hi: 'पूर्व उपलब्धियां',
    },
    legacy: { en: 'Legacy achievements', hi: 'पूर्व उपलब्धियां' },
    Achievements: { en: 'Achievements', hi: 'उपलब्धियां' },
    achievements: { en: 'Achievements', hi: 'उपलब्धियां' },
    'Special achievements': {
        en: 'Special achievements',
        hi: 'विशेष उपलब्धियां',
    },
    specialAchievements: {
        en: 'Special achievements',
        hi: 'विशेष उपलब्धियां',
    },
    'External coaching': {
        en: 'External coaching',
        hi: 'बाहरी कोचिंग',
    },
    externalCoaching: {
        en: 'External coaching',
        hi: 'बाहरी कोचिंग',
    },
    'Promotions / rewards': {
        en: 'Promotions / rewards',
        hi: 'पदोन्नति / पुरस्कार',
    },
    Promotions: { en: 'Promotions', hi: 'पदोन्नति' },
    Rewards: { en: 'Rewards', hi: 'पुरस्कार' },
    promotions: { en: 'Promotions / rewards', hi: 'पदोन्नति / पुरस्कार' },
    'Record timeline': { en: 'Record timeline', hi: 'रिकॉर्ड समयरेखा' },
    timeline: { en: 'Record timeline', hi: 'रिकॉर्ड समयरेखा' },
    PNO: { en: 'PNO', hi: 'पीएनओ' },
    'Current status': { en: 'Current status', hi: 'वर्तमान स्थिति' },
    Name: { en: 'Name', hi: 'नाम' },
    "Father's name": { en: "Father's name", hi: 'पिता का नाम' },
    Gender: { en: 'Gender', hi: 'लिंग' },
    'Date of birth': { en: 'Date of birth', hi: 'जन्म तिथि' },
    Mobile: { en: 'Mobile', hi: 'मोबाइल' },
    'Home address': { en: 'Home address', hi: 'गृह पता' },
    'Blood group': { en: 'Blood group', hi: 'ब्लड ग्रुप' },
    Caste: { en: 'Caste', hi: 'जाति' },
    'Recruitment type': { en: 'Recruitment type', hi: 'भर्ती प्रकार' },
    'Other notes': { en: 'Other notes', hi: 'अन्य नोट्स' },
    'Joining date': { en: 'Joining date', hi: 'जॉइनिंग तिथि' },
    'Promotion date': { en: 'Promotion date', hi: 'पदोन्नति तिथि' },
    Rank: { en: 'Rank', hi: 'रैंक' },
    Designation: { en: 'Designation', hi: 'पदनाम' },
    'Current unit': { en: 'Current unit', hi: 'वर्तमान इकाई' },
    'Home district': { en: 'Home district', hi: 'गृह जनपद' },
    Posting: { en: 'Posting', hi: 'तैनाती' },
    'Posting unit / district': {
        en: 'Posting unit / district',
        hi: 'तैनाती इकाई / जनपद',
    },
    'Team since': { en: 'Team since', hi: 'टीम से जुड़ने की तिथि' },
    Appointment: { en: 'Appointment', hi: 'नियुक्ति' },
    Category: { en: 'Category', hi: 'श्रेणी' },
    Level: { en: 'Level', hi: 'स्तर' },
    'Playable sports': { en: 'Playable sports', hi: 'खेल' },
    'Role / position': {
        en: 'Role / position',
        hi: 'भूमिका / स्थान',
    },
    'Sport event': { en: 'Sport event', hi: 'खेल इवेंट' },
    Notes: { en: 'Notes', hi: 'नोट्स' },
    Team: { en: 'Team', hi: 'टीम' },
    Sport: { en: 'Sport', hi: 'खेल' },
    Session: { en: 'Session', hi: 'सत्र' },
    Role: { en: 'Role', hi: 'भूमिका' },
    'Joined on': { en: 'Joined on', hi: 'जुड़ने की तिथि' },
    'Left on': { en: 'Left on', hi: 'छोड़ने की तिथि' },
    Period: { en: 'Period', hi: 'अवधि' },
    Competition: { en: 'Competition', hi: 'प्रतियोगिता' },
    Event: { en: 'Event', hi: 'इवेंट' },
    Medal: { en: 'Medal', hi: 'पदक' },
    'Event date': { en: 'Event date', hi: 'इवेंट तिथि' },
    Venue: { en: 'Venue', hi: 'स्थान' },
    'Cash reward amount': {
        en: 'Cash reward amount',
        hi: 'नकद पुरस्कार राशि',
    },
    'Cash reward date': { en: 'Cash reward date', hi: 'नकद पुरस्कार तिथि' },
    'Cash reward reference': {
        en: 'Cash reward reference',
        hi: 'नकद पुरस्कार संदर्भ',
    },
    Tier: { en: 'Tier', hi: 'स्तर' },
    Tournament: { en: 'Tournament', hi: 'प्रतियोगिता' },
    Position: { en: 'Position', hi: 'स्थान' },
    Reason: { en: 'Reason', hi: 'कारण' },
    Remarks: { en: 'Remarks', hi: 'टिप्पणी' },
    'From rank': { en: 'From rank', hi: 'पूर्व रैंक' },
    'To rank': { en: 'To rank', hi: 'नई रैंक' },
    Evidence: { en: 'Evidence', hi: 'प्रमाण' },
    Benefits: { en: 'Benefits', hi: 'लाभ' },
    'No rewards yet.': { en: 'No rewards yet.', hi: 'अभी कोई पुरस्कार नहीं।' },
    'Achievement type': { en: 'Achievement type', hi: 'उपलब्धि प्रकार' },
    Title: { en: 'Title', hi: 'शीर्षक' },
    'Awarded on': { en: 'Awarded on', hi: 'सम्मान तिथि' },
    'Issuing authority': { en: 'Issuing authority', hi: 'जारीकर्ता प्राधिकरण' },
    'Order reference': { en: 'Order reference', hi: 'आदेश संदर्भ' },
    Place: { en: 'Place', hi: 'स्थान' },
    Document: { en: 'Document', hi: 'दस्तावेज' },
    Assignments: { en: 'Assignments', hi: 'असाइनमेंट' },
    Attendance: { en: 'Attendance', hi: 'उपस्थिति' },
    'Performance updates': {
        en: 'Performance updates',
        hi: 'प्रदर्शन अपडेट',
    },
    Coach: { en: 'Coach', hi: 'कोच' },
    'Training venue': { en: 'Training venue', hi: 'प्रशिक्षण स्थल' },
    'Start date': { en: 'Start date', hi: 'प्रारंभ तिथि' },
    'End date': { en: 'End date', hi: 'समाप्ति तिथि' },
    Status: { en: 'Status', hi: 'स्थिति' },
    Subject: { en: 'Subject', hi: 'विषय' },
    Action: { en: 'Action', hi: 'कार्रवाई' },
    Date: { en: 'Date', hi: 'तिथि' },
    Field: { en: 'Field', hi: 'फील्ड' },
    'Old value': { en: 'Old value', hi: 'पुराना मान' },
    'New value': { en: 'New value', hi: 'नया मान' },
    'Effective on': { en: 'Effective on', hi: 'प्रभावी तिथि' },
    'Recorded by': { en: 'Recorded by', hi: 'दर्जकर्ता' },
    Mode: { en: 'Mode', hi: 'मोड' },
    'Attendance date': { en: 'Attendance date', hi: 'उपस्थिति तिथि' },
    'Attendance status': { en: 'Attendance status', hi: 'उपस्थिति स्थिति' },
    'Geo status': { en: 'Geo status', hi: 'जियो स्थिति' },
    'Review status': { en: 'Review status', hi: 'समीक्षा स्थिति' },
    Distance: { en: 'Distance', hi: 'दूरी' },
    'Flag reason': { en: 'Flag reason', hi: 'फ्लैग कारण' },
    'Update date': { en: 'Update date', hi: 'अपडेट तिथि' },
    'Performance level': { en: 'Performance level', hi: 'प्रदर्शन स्तर' },
    'Performance score': { en: 'Performance score', hi: 'प्रदर्शन स्कोर' },
    'Training summary': { en: 'Training summary', hi: 'प्रशिक्षण सारांश' },
};

const DATE_FIELD_LABELS = new Set([
    'Date of birth',
    'Joining date',
    'Promotion date',
    'Team since',
    'Effective on',
    'Joined on',
    'Left on',
    'Event date',
    'Cash reward date',
    'Awarded on',
    'Start date',
    'End date',
    'Attendance date',
    'Update date',
]);

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
    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full text-sm">
                <tbody className="print:text-[10px]">
                    {rows.map((row) => (
                        <tr
                            key={row.label}
                            className="border-t first:border-t-0"
                        >
                            <th className="w-1/3 bg-muted/30 p-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase print:py-1 print:text-[9px]">
                                {row.label}
                            </th>
                            <td className="p-2 text-foreground print:py-1">
                                {row.value ?? (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function uiText(label: string, locale: string): string {
    const entry = UI_LABELS[label];

    if (!entry) {
        return label;
    }

    return locale === 'en' ? entry.en : entry.hi;
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

function formatDateValue(
    value: string | null | undefined,
    locale: string,
    dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'long',
): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle,
    }).format(date);
}

function formatTimelineTime(value: string, locale: string): string {
    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    const hasTime = !/^\d{4}-\d{2}-\d{2}$/.test(value);

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
        ...(hasTime ? { timeStyle: 'short' as const } : {}),
    }).format(date);
}

function formatTimelineDate(value: string, locale: string): string {
    return formatDateValue(value, locale, 'long') ?? value;
}

const STORY_SUBJECTS: Record<
    string,
    { en: string; hi: string; introEn: string; introHi: string }
> = {
    Member: {
        en: 'member profile',
        hi: 'सदस्य प्रोफाइल',
        introEn:
            'This part follows the core identity, service, posting, and sports details kept for the member.',
        introHi:
            'यह भाग सदस्य की पहचान, सेवा, पोस्टिंग और खेल विवरण की यात्रा दिखाता है।',
    },
    Status: {
        en: 'status',
        hi: 'स्थिति',
        introEn:
            'This part explains how the member status changed across the service record.',
        introHi:
            'यह भाग सेवा रिकॉर्ड में सदस्य की स्थिति के बदलाव को समझाता है।',
    },
    'Team membership': {
        en: 'team membership',
        hi: 'टीम सदस्यता',
        introEn:
            'This part records when the member was attached to a team and what role was kept there.',
        introHi:
            'यह भाग बताता है कि सदस्य कब टीम से जुड़ा और वहां कौन सी भूमिका दर्ज रही।',
    },
    'Tournament participation': {
        en: 'tournament participation',
        hi: 'प्रतियोगिता सहभागिता',
        introEn:
            'This part captures the member participation record for tournaments and events.',
        introHi:
            'यह भाग प्रतियोगिताओं और इवेंट में सदस्य की सहभागिता को दर्ज करता है।',
    },
    Achievement: {
        en: 'achievement',
        hi: 'उपलब्धि',
        introEn:
            'This part describes achievements linked with the member sporting record.',
        introHi: 'यह भाग सदस्य के खेल रिकॉर्ड से जुड़ी उपलब्धियों को बताता है।',
    },
    'Legacy achievement': {
        en: 'legacy achievement',
        hi: 'पूर्व उपलब्धि',
        introEn:
            'This part preserves older achievement information brought into the system.',
        introHi:
            'यह भाग सिस्टम में जोड़ी गई पुरानी उपलब्धियों की जानकारी संभालता है।',
    },
    Promotion: {
        en: 'promotion',
        hi: 'पदोन्नति',
        introEn:
            'This part follows promotion records, references, and related remarks.',
        introHi:
            'यह भाग पदोन्नति रिकॉर्ड, संदर्भ और संबंधित टिप्पणियों को दिखाता है।',
    },
    'Promotion evidence': {
        en: 'promotion evidence',
        hi: 'पदोन्नति प्रमाण',
        introEn:
            'This part notes the evidence attached to promotion and reward decisions.',
        introHi:
            'यह भाग पदोन्नति और पुरस्कार निर्णयों से जुड़े प्रमाणों को दर्ज करता है।',
    },
    MemberSport: {
        en: 'playable sport',
        hi: 'खेल योग्यता',
        introEn:
            'This part records additional sports attached to the member profile.',
        introHi:
            'यह भाग सदस्य प्रोफाइल से जुड़े अतिरिक्त खेलों को दर्ज करता है।',
    },
};

const STORY_FIELDS: Record<string, { en: string; hi: string }> = {
    Name: { en: 'the name', hi: 'नाम' },
    "Father's name": { en: "the father's name", hi: 'पिता का नाम' },
    PNO: { en: 'the PNO', hi: 'पीएनओ' },
    Rank: { en: 'the rank', hi: 'रैंक' },
    Designation: { en: 'the designation', hi: 'पदनाम' },
    Gender: { en: 'the gender', hi: 'लिंग' },
    'Date of birth': { en: 'the date of birth', hi: 'जन्म तिथि' },
    Mobile: { en: 'the mobile number', hi: 'मोबाइल नंबर' },
    Status: { en: 'the status', hi: 'स्थिति' },
    Category: { en: 'the player category', hi: 'खिलाड़ी श्रेणी' },
    Level: { en: 'the player level', hi: 'खिलाड़ी स्तर' },
    Sport: { en: 'the sport', hi: 'खेल' },
    'Sport event': { en: 'the sport event', hi: 'खेल इवेंट' },
    Unit: { en: 'the unit', hi: 'यूनिट' },
    'Home district': { en: 'the home district', hi: 'गृह जनपद' },
    'Posting unit / district': {
        en: 'the posting unit / district',
        hi: 'तैनाती इकाई / जनपद',
    },
    'Joining date': { en: 'the joining date', hi: 'जॉइनिंग तिथि' },
    'Blood group': { en: 'the blood group', hi: 'ब्लड ग्रुप' },
    Caste: { en: 'the caste', hi: 'जाति' },
    'Recruitment type': { en: 'the recruitment type', hi: 'भर्ती प्रकार' },
    Appointment: { en: 'the appointment', hi: 'नियुक्ति' },
    'Promotion date': { en: 'the promotion date', hi: 'पदोन्नति तिथि' },
    'Team since': { en: 'the team-since date', hi: 'टीम से जुड़ने की तिथि' },
    'Home address': { en: 'the home address', hi: 'गृह पता' },
    'Other notes': { en: 'the notes', hi: 'टिप्पणी' },
    Photo: { en: 'the member photo', hi: 'सदस्य फोटो' },
    'Effective on': { en: 'the effective date', hi: 'प्रभावी तिथि' },
    Reason: { en: 'the reason', hi: 'कारण' },
    Team: { en: 'the team', hi: 'टीम' },
    Session: { en: 'the session', hi: 'सत्र' },
    Role: { en: 'the role', hi: 'भूमिका' },
    'Joined on': { en: 'the joining date', hi: 'जुड़ने की तिथि' },
    'Left on': { en: 'the leaving date', hi: 'छोड़ने की तिथि' },
    Event: { en: 'the event', hi: 'इवेंट' },
    Position: { en: 'the position', hi: 'स्थान' },
    Medal: { en: 'the medal', hi: 'पदक' },
    Remarks: { en: 'the remarks', hi: 'टिप्पणी' },
    Period: { en: 'the period', hi: 'अवधि' },
    Competition: { en: 'the competition', hi: 'प्रतियोगिता' },
    'Event date': { en: 'the event date', hi: 'इवेंट तिथि' },
    Venue: { en: 'the venue', hi: 'स्थान' },
    'Sport discipline': { en: 'the sport discipline', hi: 'खेल अनुशासन' },
    'Sort order': { en: 'the display order', hi: 'क्रम' },
    'From rank': { en: 'the previous rank', hi: 'पूर्व रैंक' },
    'To rank': { en: 'the promoted rank', hi: 'नई रैंक' },
    'Cash reward amount': {
        en: 'the cash reward amount',
        hi: 'नकद पुरस्कार राशि',
    },
    'Cash reward date': { en: 'the cash reward date', hi: 'नकद पुरस्कार तिथि' },
    'Cash reward reference': {
        en: 'the cash reward reference',
        hi: 'नकद पुरस्कार संदर्भ',
    },
    'Cash reward remarks': {
        en: 'the cash reward remarks',
        hi: 'नकद पुरस्कार टिप्पणी',
    },
    'Evidence type': { en: 'the evidence type', hi: 'प्रमाण प्रकार' },
    Evidence: { en: 'the evidence', hi: 'प्रमाण' },
};

function storySubject(
    subject: string,
    locale: string,
): { label: string; intro: string } {
    const configured = STORY_SUBJECTS[subject];

    if (configured) {
        return {
            label: locale === 'en' ? configured.en : configured.hi,
            intro: locale === 'en' ? configured.introEn : configured.introHi,
        };
    }

    return {
        label: locale === 'en' ? subject.toLowerCase() : subject,
        intro:
            locale === 'en'
                ? 'This part records related changes kept in the member file.'
                : 'यह भाग सदस्य फाइल में दर्ज संबंधित बदलावों को दिखाता है।',
    };
}

function storyField(
    field: string,
    locale: string,
    t: (key: string) => string,
): string {
    const configured = STORY_FIELDS[field];

    if (configured) {
        return locale === 'en' ? configured.en : configured.hi;
    }

    const translated = t(field);

    return locale === 'en' ? translated.toLowerCase() : translated;
}

function humanizeCode(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function printValue(
    value: string | number | null | undefined,
    t: (key: string) => string,
): string | number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    const translated = t(value);

    return translated === value ? humanizeCode(value) : translated;
}

function postingLocation(member: Member): string | null {
    return member.posting_district?.name ?? member.current_unit?.name ?? null;
}

function groupAchievementsByTier(
    rows: AchievementRow[],
    locale: string,
): AchievementTierGroup[] {
    const groups = new Map<
        string,
        { label: string; weight: number; rows: AchievementRow[] }
    >();

    for (const row of rows) {
        const tierKey = row.tournament.tier_code ?? 'UNTIERED';
        const label = row.tournament.tier_code ?? '—';
        const weight = row.tournament.tier_weight ?? 0;
        const current = groups.get(tierKey) ?? {
            label,
            weight,
            rows: [],
        };

        current.rows.push(row);
        groups.set(tierKey, current);
    }

    return Array.from(groups.entries())
        .map(([key, group]) => ({
            key,
            label: group.label,
            weight: group.weight,
            rows: group.rows.sort((a, b) => {
                const aDate = a.tournament.date_from ?? '';
                const bDate = b.tournament.date_from ?? '';

                return bDate.localeCompare(aDate);
            }),
        }))
        .sort(
            (a, b) =>
                b.weight - a.weight ||
                a.label.localeCompare(b.label, locale === 'en' ? 'en' : 'hi'),
        );
}

function benefitSummary(
    benefits: AchievementBenefitRow[] | undefined,
    locale: string,
    t: (key: string) => string,
): string | null {
    if (!benefits || benefits.length === 0) {
        return null;
    }

    return benefits
        .map((benefit) =>
            [
                printValue(benefit.benefit_type, t),
                benefit.cash_amount ? `₹${benefit.cash_amount}` : null,
                benefit.benefit_date
                    ? formatDateValue(benefit.benefit_date, locale)
                    : null,
                benefit.order_reference,
            ]
                .filter(Boolean)
                .join(' · '),
        )
        .join('; ');
}

function promotionEvidenceLines(
    evidence: PromotionEvidenceRow,
    locale: string,
    t: (key: string) => string,
): string[] {
    const lines: string[] = [];

    if (evidence.legacy_achievement) {
        const legacy = evidence.legacy_achievement;
        lines.push(
            [
                printValue(legacy.period, t),
                printValue(legacy.level, t),
                legacy.competition_details,
                legacy.event,
                legacy.event_date
                    ? formatDateValue(legacy.event_date, locale)
                    : null,
                legacy.venue,
                legacy.medal_type ? printValue(legacy.medal_type, t) : null,
            ]
                .filter(Boolean)
                .join(' · '),
        );

        const benefits = benefitSummary(legacy.benefits, locale, t);

        if (benefits) {
            lines.push(`${uiText('Benefits', locale)}: ${benefits}`);
        }

        return lines;
    }

    lines.push(
        [
            evidence.session?.name,
            evidence.tournament?.name,
            evidence.event?.name,
            evidence.tournament?.tier_code,
            evidence.tournament?.date_from
                ? formatDateValue(evidence.tournament.date_from, locale)
                : null,
            evidence.event?.gender_class
                ? printValue(evidence.event.gender_class, t)
                : null,
        ]
            .filter(Boolean)
            .join(' · ') ||
            evidence.summary ||
            `${uiText('Evidence', locale)} #${evidence.evidence_id}`,
    );

    if (evidence.achievement) {
        lines.push(
            [
                evidence.achievement.medal_type
                    ? printValue(evidence.achievement.medal_type, t)
                    : null,
                evidence.achievement.position != null
                    ? `${uiText('Position', locale)}: ${evidence.achievement.position}`
                    : null,
            ]
                .filter(Boolean)
                .join(' · '),
        );

        const benefits = benefitSummary(
            evidence.achievement.benefits,
            locale,
            t,
        );

        if (benefits) {
            lines.push(`${uiText('Benefits', locale)}: ${benefits}`);
        }
    }

    return lines.filter(Boolean);
}

function countMedals(
    rows: AchievementRow[],
): Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT' | 'NONE', number> {
    return rows.reduce(
        (counts, row) => {
            if (!row.medal_type) {
                counts.NONE += 1;

                return counts;
            }

            counts[row.medal_type as 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT'] +=
                1;

            return counts;
        },
        {
            GOLD: 0,
            SILVER: 0,
            BRONZE: 0,
            MERIT: 0,
            NONE: 0,
        },
    );
}

function hasPrintableValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
}

function hasAnyPrintableValue<T>(
    rows: T[],
    getter: (row: T) => unknown,
): boolean {
    return rows.some((row) => hasPrintableValue(getter(row)));
}

function timelineChangeValue(
    field: string,
    value: string | null,
    locale: string,
    t: (key: string) => string,
): string {
    if (!value) {
        return '—';
    }

    if (DATE_FIELD_LABELS.has(field)) {
        return formatDateValue(value, locale) ?? value;
    }

    if (field.toLowerCase().includes('amount') && !value.includes('₹')) {
        return `₹${value}`;
    }

    return String(printValue(value, t) ?? value);
}

function Timeline({
    entries,
    locale,
    t,
    mode,
}: {
    entries: AuditEntry[];
    locale: string;
    t: (key: string) => string;
    mode: TimelineMode;
}) {
    const visibleEntries = entries.filter((entry) => entry.subject !== 'Alias');
    void mode;

    if (visibleEntries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {locale === 'en'
                    ? 'No timeline entries.'
                    : 'कोई इतिहास प्रविष्टि नहीं है।'}
            </p>
        );
    }

    const rows = visibleEntries.flatMap((entry) => {
        if (entry.changes.length === 0) {
            return [
                {
                    id: `${entry.id}-entry`,
                    subject: storySubject(entry.subject || 'Other', locale)
                        .label,
                    action: printValue(entry.action, t),
                    at: formatTimelineTime(entry.at, locale),
                    field: '—',
                    old: '—',
                    next: '—',
                },
            ];
        }

        return entry.changes.map((change) => ({
            id: `${entry.id}-${change.field}`,
            subject: storySubject(entry.subject || 'Other', locale).label,
            action: printValue(entry.action, t),
            at: formatTimelineTime(entry.at, locale),
            field: storyField(change.field, locale, t),
            old: timelineChangeValue(change.field, change.old, locale, t),
            next: timelineChangeValue(change.field, change.new, locale, t),
        }));
    });

    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                    <tr>
                        <th className="p-2">{uiText('Subject', locale)}</th>
                        <th className="p-2">{uiText('Action', locale)}</th>
                        <th className="p-2">{uiText('Date', locale)}</th>
                        <th className="p-2">{uiText('Field', locale)}</th>
                        <th className="p-2">{uiText('Old value', locale)}</th>
                        <th className="p-2">{uiText('New value', locale)}</th>
                    </tr>
                </thead>
                <tbody className="print:text-[10px]">
                    {rows.map((row) => (
                        <tr key={row.id} className="border-t print:align-top">
                            <td className="p-2 print:py-1">{row.subject}</td>
                            <td className="p-2 print:py-1">{row.action}</td>
                            <td className="p-2 print:py-1">{row.at}</td>
                            <td className="p-2 print:py-1">{row.field}</td>
                            <td className="p-2 print:py-1">{row.old}</td>
                            <td className="p-2 print:py-1">{row.next}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const AVAILABLE_SECTIONS: SectionKey[] = [
    'identity',
    'contact',
    'service',
    'sports',
    'teams',
    'legacy',
    'achievements',
    'specialAchievements',
    'externalCoaching',
    'promotions',
    'status',
    'timeline',
];

const DEFAULT_SECTIONS: SectionKey[] = [
    'identity',
    'contact',
    'service',
    'sports',
    'teams',
    'legacy',
    'achievements',
    'specialAchievements',
    'externalCoaching',
    'promotions',
    'status',
];

export default function PrintPreview({
    member,
    statusHistory,
    memberTeams,
    legacyAchievements,
    achievements,
    specialAchievements,
    externalCoaching,
    promotions,
    auditLog,
}: Props) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale: string };
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const [selectedSections, setSelectedSections] =
        useState<SectionKey[]>(DEFAULT_SECTIONS);
    const [timelineMode, setTimelineMode] = useState<TimelineMode>('story');
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Members'), href: MemberController.index.url() },
        { title: member.full_name, href: MemberController.show.url(member) },
    ];

    const toggleSection = (section: SectionKey) => {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    };

    const sectionEnabled = (section: SectionKey): boolean =>
        selectedSections.includes(section);

    const preferredName = member.full_name;
    const achievementGroups = groupAchievementsByTier(
        achievements ?? [],
        locale,
    );
    const achievementSummary = countMedals(achievements ?? []);
    const teamRows = memberTeams ?? [];
    const achievementRows = achievements ?? [];
    const specialAchievementRows = specialAchievements?.records ?? [];
    const externalAssignments = externalCoaching?.assignments ?? [];
    const externalAttendances = externalCoaching?.attendances ?? [];
    const externalPerformanceUpdates =
        externalCoaching?.performanceUpdates ?? [];
    const promotionRows = (promotions ?? []).filter(
        (row) => row.promotion_date || row.from_rank || row.to_rank,
    );
    const rewardRows = (promotions ?? []).filter(
        (row) =>
            row.cash_reward_amount ||
            row.cash_reward_date ||
            row.cash_reward_reference ||
            row.cash_reward_remarks,
    );
    const showTeamSport = hasAnyPrintableValue(
        teamRows,
        (row) => row.sport?.name,
    );
    const showTeamSession = hasAnyPrintableValue(
        teamRows,
        (row) => row.session?.name,
    );
    const showTeamRole = hasAnyPrintableValue(teamRows, (row) => row.role);
    const showTeamJoinedOn = hasAnyPrintableValue(
        teamRows,
        (row) => row.joined_on,
    );
    const showTeamLeftOn = hasAnyPrintableValue(teamRows, (row) => row.left_on);
    const showAchievementRemarks = hasAnyPrintableValue(
        achievementRows,
        (row) => row.remarks,
    );
    const showSpecialAwardedOn = hasAnyPrintableValue(
        specialAchievementRows,
        (row) => row.awarded_on,
    );
    const showSpecialIssuingAuthority = hasAnyPrintableValue(
        specialAchievementRows,
        (row) => row.issuing_authority,
    );
    const showSpecialOrderReference = hasAnyPrintableValue(
        specialAchievementRows,
        (row) => row.order_reference,
    );
    const showSpecialPlace = hasAnyPrintableValue(
        specialAchievementRows,
        (row) => row.place,
    );
    const showSpecialRemarks = hasAnyPrintableValue(
        specialAchievementRows,
        (row) => row.remarks,
    );
    const showAssignmentSport = hasAnyPrintableValue(
        externalAssignments,
        (row) => row.sport?.name,
    );
    const showAssignmentVenue = hasAnyPrintableValue(
        externalAssignments,
        (row) => row.training_venue?.name,
    );
    const showAssignmentEndDate = hasAnyPrintableValue(
        externalAssignments,
        (row) => row.end_date,
    );
    const showAssignmentMode = hasAnyPrintableValue(
        externalAssignments,
        (row) => row.attendance_mode,
    );
    const showAttendanceSport = hasAnyPrintableValue(
        externalAttendances,
        (row) => row.sport?.name,
    );
    const showAttendanceVenue = hasAnyPrintableValue(
        externalAttendances,
        (row) => row.training_venue?.name,
    );
    const showAttendanceGeoStatus = hasAnyPrintableValue(
        externalAttendances,
        (row) => row.geo_status,
    );
    const showAttendanceReviewStatus = hasAnyPrintableValue(
        externalAttendances,
        (row) => row.review_status,
    );
    const showAttendanceFlagReason = hasAnyPrintableValue(
        externalAttendances,
        (row) => row.flag_reason,
    );
    const showPerformanceSport = hasAnyPrintableValue(
        externalPerformanceUpdates,
        (row) => row.sport?.name,
    );
    const showPerformanceScore = hasAnyPrintableValue(
        externalPerformanceUpdates,
        (row) => row.performance_score,
    );
    const showPerformanceReviewStatus = hasAnyPrintableValue(
        externalPerformanceUpdates,
        (row) => row.review_status,
    );
    const showPerformanceSummary = hasAnyPrintableValue(
        externalPerformanceUpdates,
        (row) => row.training_summary,
    );

    useEffect(() => {
        const style = document.createElement('style');
        style.dataset.printPreviewOverride = 'true';
        style.textContent = `
            @media print {
                body > * { display: none !important; }
                body #app { display: block !important; }
                body #app > * { display: none !important; }
                body #app #quick-view-print-target { display: block !important; }
                body #app #quick-view-print-target * { color: black !important; background: transparent !important; box-shadow: none !important; border-color: #ccc !important; }
                body #app #quick-view-print-target [data-print-hide] { display: none !important; }
            }
        `;
        document.head.appendChild(style);

        return () => {
            style.remove();
        };
    }, []);

    const handlePrint = (): void => {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=900');

        if (!printWindow) {
            return;
        }

        const styles = Array.from(
            document.head.querySelectorAll(
                'meta, link[rel="stylesheet"], style',
            ),
        )
            .map((node) => node.outerHTML)
            .join('');

        printWindow.document.open();
        printWindow.document.write(`<!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    ${styles}
                    <style>
                        @page { margin: 0.6cm; }
                        body { margin: 0; background: white; }
                        img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    </style>
                </head>
                <body>
                    ${target.outerHTML}
                </body>
            </html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    };

    return (
        <>
            <Head
                title={`${member.full_name} - ${uiText('Print preview', locale)}`}
            />
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
                        <div className="size-24 overflow-hidden rounded-xl border bg-muted">
                            {member.photo_path ? (
                                <img
                                    src={`/storage/${member.photo_path}`}
                                    alt={member.full_name}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                    {t('No photo')}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                                {breadcrumbs
                                    .map((item) => item.title)
                                    .join(' / ')}
                            </div>
                            <h1 className="text-2xl font-bold">
                                {preferredName}
                            </h1>
                            <div className="pt-1">
                                <LocaleSwitcher />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={MemberController.show.url(member)}>
                                <ArrowLeft className="mr-1.5 size-4" />
                                {uiText('Back', locale)}
                            </Link>
                        </Button>
                        <Button type="button" onClick={handlePrint}>
                            <Printer className="mr-1.5 size-4" />
                            {uiText('Print', locale)}
                        </Button>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-4 border-b-2 border-neutral-900 pb-3 print:gap-3 print:pb-2">
                    <img
                        src={LETTERHEAD_LOGO_SRC}
                        alt={uiText('UP Police Sports Unit', locale)}
                        className="size-20 shrink-0 object-contain print:size-16"
                    />
                    <div className="min-w-0 flex-1 text-center">
                        <div className="text-lg font-bold tracking-wide uppercase print:text-[16px]">
                            {uiText('UP Police Sports Unit', locale)}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-700 uppercase print:text-[11px] print:text-black">
                            {uiText('Member profile record', locale)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground print:text-[9px] print:text-neutral-700">
                            {uiText('Official print preview', locale)}
                        </div>
                    </div>
                    <div
                        className="hidden w-20 print:block"
                        aria-hidden="true"
                    />
                </div>

                <div className="grid gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 print:hidden">
                    <div className="text-sm font-semibold text-foreground">
                        {uiText('Print options', locale)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={
                                timelineMode === 'story' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setTimelineMode('story')}
                        >
                            {uiText('Story timeline', locale)}
                        </Button>
                        <Button
                            type="button"
                            variant={
                                timelineMode === 'compact'
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => setTimelineMode('compact')}
                        >
                            {uiText('Compact timeline', locale)}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_SECTIONS.map((section) => (
                            <label
                                key={section}
                                className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"
                            >
                                <Checkbox
                                    checked={sectionEnabled(section)}
                                    onCheckedChange={() =>
                                        toggleSection(section)
                                    }
                                />
                                <span>{uiText(section, locale)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 grid gap-3 print:gap-2">
                    {sectionEnabled('identity') && (
                        <Section
                            title={uiText(
                                'Identity and personal details',
                                locale,
                            )}
                        >
                            <DetailsTable
                                rows={[
                                    {
                                        label: uiText('PNO', locale),
                                        value: member.pno ? (
                                            <span className="font-mono">
                                                {member.pno}
                                            </span>
                                        ) : null,
                                    },
                                    {
                                        label: uiText('Current status', locale),
                                        value: (
                                            <Badge variant="outline">
                                                {printValue(
                                                    member.current_status,
                                                    t,
                                                )}
                                            </Badge>
                                        ),
                                    },
                                    {
                                        label: uiText('Name', locale),
                                        value: preferredName,
                                    },
                                    {
                                        label: uiText("Father's name", locale),
                                        value: member.father_name,
                                    },
                                    {
                                        label: uiText('Gender', locale),
                                        value: t(
                                            member.gender === 'M'
                                                ? 'Male'
                                                : member.gender === 'F'
                                                  ? 'Female'
                                                  : 'Other gender',
                                        ),
                                    },
                                    {
                                        label: uiText('Date of birth', locale),
                                        value: formatDateValue(
                                            member.dob,
                                            locale,
                                            'long',
                                        ),
                                    },
                                ]}
                            />
                        </Section>
                    )}

                    {sectionEnabled('contact') && (
                        <Section title={uiText('Contact and address', locale)}>
                            <DetailsTable
                                rows={[
                                    {
                                        label: uiText('Mobile', locale),
                                        value: member.mobile,
                                    },
                                    {
                                        label: uiText('Home address', locale),
                                        value: member.home_address,
                                    },
                                    {
                                        label: uiText('Blood group', locale),
                                        value: member.blood_group,
                                    },
                                    {
                                        label: uiText('Caste', locale),
                                        value: member.caste,
                                    },
                                    {
                                        label: uiText(
                                            'Recruitment type',
                                            locale,
                                        ),
                                        value: printValue(
                                            member.recruitment_type,
                                            t,
                                        ),
                                    },
                                    {
                                        label: uiText('Other notes', locale),
                                        value: member.other_notes,
                                    },
                                ]}
                            />
                        </Section>
                    )}

                    {sectionEnabled('service') && (
                        <Section title={uiText('Service and posting', locale)}>
                            <DetailsTable
                                rows={[
                                    {
                                        label: uiText('Joining date', locale),
                                        value: formatDateValue(
                                            member.joining_date,
                                            locale,
                                        ),
                                    },
                                    {
                                        label: uiText('Promotion date', locale),
                                        value: formatDateValue(
                                            member.promotion_date,
                                            locale,
                                        ),
                                    },
                                    {
                                        label: uiText('Rank', locale),
                                        value: member.rank,
                                    },
                                    {
                                        label: uiText('Designation', locale),
                                        value: member.designation,
                                    },
                                    {
                                        label: uiText('Home district', locale),
                                        value: member.home_district?.name,
                                    },
                                    {
                                        label: uiText('Posting', locale),
                                        value: postingLocation(member),
                                    },
                                    {
                                        label: uiText('Team since', locale),
                                        value: formatDateValue(
                                            member.team_since,
                                            locale,
                                        ),
                                    },
                                    {
                                        label: uiText('Appointment', locale),
                                        value: member.appointment,
                                    },
                                ]}
                            />
                        </Section>
                    )}

                    {sectionEnabled('sports') && (
                        <Section
                            title={uiText('Sports and eligibility', locale)}
                        >
                            <div className="space-y-3">
                                <DetailsTable
                                    rows={[
                                        {
                                            label: uiText('Category', locale),
                                            value: printValue(
                                                member.player_category,
                                                t,
                                            ),
                                        },
                                        {
                                            label: uiText('Level', locale),
                                            value: printValue(
                                                member.player_level,
                                                t,
                                            ),
                                        },
                                    ]}
                                />
                                {member.playable_sports.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        —
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Sport',
                                                            locale,
                                                        )}
                                                    </th>
                                                    {hasAnyPrintableValue(
                                                        member.playable_sports,
                                                        (sport) => sport.role,
                                                    ) && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Role / position',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {hasAnyPrintableValue(
                                                        member.playable_sports,
                                                        (sport) =>
                                                            sport.position,
                                                    ) && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Position',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {hasAnyPrintableValue(
                                                        member.playable_sports,
                                                        (sport) => sport.notes,
                                                    ) && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Notes',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="print:text-[10px]">
                                                {member.playable_sports.map(
                                                    (sport) => (
                                                        <tr
                                                            key={sport.id}
                                                            className="border-t print:align-top"
                                                        >
                                                            <td className="p-2 print:py-1">
                                                                {sport.name}
                                                            </td>
                                                            {hasAnyPrintableValue(
                                                                member.playable_sports,
                                                                (item) =>
                                                                    item.role,
                                                            ) && (
                                                                <td className="p-2 print:py-1">
                                                                    {printValue(
                                                                        sport.role,
                                                                        t,
                                                                    ) ?? '—'}
                                                                </td>
                                                            )}
                                                            {hasAnyPrintableValue(
                                                                member.playable_sports,
                                                                (item) =>
                                                                    item.position,
                                                            ) && (
                                                                <td className="p-2 print:py-1">
                                                                    {sport.position ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                            {hasAnyPrintableValue(
                                                                member.playable_sports,
                                                                (item) =>
                                                                    item.notes,
                                                            ) && (
                                                                <td className="p-2 print:py-1">
                                                                    {sport.notes ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {sectionEnabled('teams') && (
                        <Section title={uiText('Team memberships', locale)}>
                            <Deferred
                                data="memberTeams"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {teamRows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No team memberships.', locale)}
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText('Team', locale)}
                                                    </th>
                                                    {showTeamSport && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Sport',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showTeamSession && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Session',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showTeamRole && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Role',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showTeamJoinedOn && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Joined on',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showTeamLeftOn && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Left on',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="print:text-[10px]">
                                                {teamRows.map((row) => (
                                                    <tr
                                                        key={row.id}
                                                        className="border-t print:align-top"
                                                    >
                                                        <td className="p-2 print:py-1">
                                                            {row.team?.name ??
                                                                '—'}
                                                        </td>
                                                        {showTeamSport && (
                                                            <td className="p-2 print:py-1">
                                                                {row.sport
                                                                    ?.name ??
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showTeamSession && (
                                                            <td className="p-2">
                                                                {row.session
                                                                    ?.name ??
                                                                    '—'}
                                                            </td>
                                                        )}
                                                        {showTeamRole && (
                                                            <td className="p-2">
                                                                {printValue(
                                                                    row.role,
                                                                    t,
                                                                ) ?? '—'}
                                                            </td>
                                                        )}
                                                        {showTeamJoinedOn && (
                                                            <td className="p-2">
                                                                {formatDateValue(
                                                                    row.joined_on,
                                                                    locale,
                                                                ) ?? '—'}
                                                            </td>
                                                        )}
                                                        {showTeamLeftOn && (
                                                            <td className="p-2">
                                                                {formatDateValue(
                                                                    row.left_on,
                                                                    locale,
                                                                ) ?? '—'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('legacy') && (
                        <Section title={uiText('Legacy achievements', locale)}>
                            <Deferred
                                data="legacyAchievements"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {(legacyAchievements ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText(
                                            'No legacy achievements.',
                                            locale,
                                        )}
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Period',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Level',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Competition',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Sport',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Event',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Event date',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Venue',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Position',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Medal',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Remarks',
                                                            locale,
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="print:text-[10px]">
                                                {(legacyAchievements ?? []).map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="border-t print:align-top"
                                                        >
                                                            <td className="p-2 print:py-1">
                                                                {printValue(
                                                                    row.period,
                                                                    t,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {printValue(
                                                                    row.level,
                                                                    t,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {
                                                                    row.competition_details
                                                                }
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {[
                                                                    row.sport
                                                                        ?.name,
                                                                    row.sport_discipline,
                                                                    row.discipline,
                                                                    row.weight_category,
                                                                    printValue(
                                                                        row.gender_class,
                                                                        t,
                                                                    ),
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    ) || '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.event ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {formatDateValue(
                                                                    row.event_date,
                                                                    locale,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.venue ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.position ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {printValue(
                                                                    row.medal_type,
                                                                    t,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.remarks ??
                                                                    '—'}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('achievements') && (
                        <Section title={uiText('Achievements', locale)}>
                            <Deferred
                                data="achievements"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {(achievements ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No achievements yet.', locale)}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-5">
                                            <div className="font-medium">
                                                {uiText('Achievements', locale)}
                                                : {achievements?.length ?? 0}
                                            </div>
                                            <div>
                                                {printValue('GOLD', t)}:{' '}
                                                {achievementSummary.GOLD}
                                            </div>
                                            <div>
                                                {printValue('SILVER', t)}:{' '}
                                                {achievementSummary.SILVER}
                                            </div>
                                            <div>
                                                {printValue('BRONZE', t)}:{' '}
                                                {achievementSummary.BRONZE}
                                            </div>
                                            <div>
                                                {printValue('MERIT', t)}:{' '}
                                                {achievementSummary.MERIT}
                                            </div>
                                        </div>
                                        {achievementGroups.map((group) => (
                                            <div
                                                key={group.key}
                                                className="overflow-hidden rounded-md border print:rounded-sm"
                                            >
                                                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    <span>
                                                        {uiText('Tier', locale)}
                                                        : {group.label}
                                                    </span>
                                                    <span>
                                                        {group.rows.length}
                                                    </span>
                                                </div>
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                        <tr>
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Medal',
                                                                    locale,
                                                                )}
                                                            </th>
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Session',
                                                                    locale,
                                                                )}
                                                            </th>
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Tournament',
                                                                    locale,
                                                                )}
                                                            </th>
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Event',
                                                                    locale,
                                                                )}
                                                            </th>
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Position',
                                                                    locale,
                                                                )}
                                                            </th>
                                                            {showAchievementRemarks && (
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Remarks',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="print:text-[10px]">
                                                        {group.rows.map(
                                                            (row) => (
                                                                <tr
                                                                    key={row.id}
                                                                    className="border-t print:align-top"
                                                                >
                                                                    <td className="p-2 print:py-1">
                                                                        {row.medal_type ? (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className={`text-[10px] ${
                                                                                    row.medal_type ===
                                                                                    'GOLD'
                                                                                        ? 'border-amber-300 bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-50 text-amber-900 print:border-slate-400 print:bg-slate-100'
                                                                                        : row.medal_type ===
                                                                                            'SILVER'
                                                                                          ? 'border-slate-300 bg-slate-100 text-slate-800 print:border-slate-400 print:bg-slate-100'
                                                                                          : row.medal_type ===
                                                                                              'BRONZE'
                                                                                            ? 'border-orange-300 bg-orange-100 text-orange-900 print:border-slate-400 print:bg-slate-100'
                                                                                            : 'border-emerald-300 bg-emerald-100 text-emerald-900 print:border-slate-400 print:bg-slate-100'
                                                                                }`}
                                                                            >
                                                                                {printValue(
                                                                                    row.medal_type,
                                                                                    t,
                                                                                )}
                                                                            </Badge>
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2 print:py-1">
                                                                        {
                                                                            row
                                                                                .session
                                                                                .name
                                                                        }
                                                                    </td>
                                                                    <td className="p-2 print:py-1">
                                                                        {
                                                                            row
                                                                                .tournament
                                                                                .name
                                                                        }
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {[
                                                                                formatDateValue(
                                                                                    row
                                                                                        .tournament
                                                                                        .date_from,
                                                                                    locale,
                                                                                ),
                                                                                formatDateValue(
                                                                                    row
                                                                                        .tournament
                                                                                        .date_to,
                                                                                    locale,
                                                                                ),
                                                                                row
                                                                                    .tournament
                                                                                    .venue,
                                                                            ]
                                                                                .filter(
                                                                                    Boolean,
                                                                                )
                                                                                .join(
                                                                                    ' · ',
                                                                                )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-2 whitespace-nowrap print:py-1">
                                                                        {
                                                                            row
                                                                                .event
                                                                                .name
                                                                        }
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {row.position !=
                                                                            null
                                                                                ? `${uiText('Position', locale)}: ${row.position}`
                                                                                : '—'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-2 font-medium whitespace-nowrap print:py-1">
                                                                        {row.position ??
                                                                            row.participation_position ??
                                                                            '—'}
                                                                    </td>
                                                                    {showAchievementRemarks && (
                                                                        <td className="p-2 print:py-1">
                                                                            {row.remarks ??
                                                                                '—'}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('specialAchievements') && (
                        <Section title={uiText('Special achievements', locale)}>
                            <Deferred
                                data="specialAchievements"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {specialAchievementRows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        —
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Achievement type',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Title',
                                                            locale,
                                                        )}
                                                    </th>
                                                    {showSpecialAwardedOn && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Awarded on',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showSpecialIssuingAuthority && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Issuing authority',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showSpecialOrderReference && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Order reference',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showSpecialPlace && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Place',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                    {showSpecialRemarks && (
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Remarks',
                                                                locale,
                                                            )}
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="print:text-[10px]">
                                                {specialAchievementRows.map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="border-t print:align-top"
                                                        >
                                                            <td className="p-2 print:py-1">
                                                                {printValue(
                                                                    row.achievement_type,
                                                                    t,
                                                                )}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.title}
                                                                {row
                                                                    .order_document
                                                                    ?.original_name && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {uiText(
                                                                            'Document',
                                                                            locale,
                                                                        )}
                                                                        :{' '}
                                                                        {
                                                                            row
                                                                                .order_document
                                                                                .original_name
                                                                        }
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {showSpecialAwardedOn && (
                                                                <td className="p-2 print:py-1">
                                                                    {formatDateValue(
                                                                        row.awarded_on,
                                                                        locale,
                                                                    ) ?? '—'}
                                                                </td>
                                                            )}
                                                            {showSpecialIssuingAuthority && (
                                                                <td className="p-2 print:py-1">
                                                                    {row.issuing_authority ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                            {showSpecialOrderReference && (
                                                                <td className="p-2 print:py-1">
                                                                    {row.order_reference ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                            {showSpecialPlace && (
                                                                <td className="p-2 print:py-1">
                                                                    {row.place ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                            {showSpecialRemarks && (
                                                                <td className="p-2 print:py-1">
                                                                    {row.remarks ??
                                                                        '—'}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('externalCoaching') && (
                        <Section title={uiText('External coaching', locale)}>
                            <Deferred
                                data="externalCoaching"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                <div className="space-y-3">
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {uiText('Assignments', locale)}
                                        </div>
                                        {externalAssignments.length === 0 ? (
                                            <p className="p-2 text-sm text-muted-foreground">
                                                —
                                            </p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                    <tr>
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Coach',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showAssignmentSport && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Sport',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showAssignmentVenue && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Training venue',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Start date',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showAssignmentEndDate && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'End date',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Status',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showAssignmentMode && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Mode',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="print:text-[10px]">
                                                    {externalAssignments.map(
                                                        (row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="border-t print:align-top"
                                                            >
                                                                <td className="p-2 print:py-1">
                                                                    {row
                                                                        .external_coach
                                                                        ?.name ??
                                                                        '—'}
                                                                </td>
                                                                {showAssignmentSport && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row
                                                                            .sport
                                                                            ?.name ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showAssignmentVenue && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row
                                                                            .training_venue
                                                                            ?.name ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                <td className="p-2 print:py-1">
                                                                    {formatDateValue(
                                                                        row.start_date,
                                                                        locale,
                                                                    ) ?? '—'}
                                                                </td>
                                                                {showAssignmentEndDate && (
                                                                    <td className="p-2 print:py-1">
                                                                        {formatDateValue(
                                                                            row.end_date,
                                                                            locale,
                                                                        ) ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                <td className="p-2 print:py-1">
                                                                    {printValue(
                                                                        row.status,
                                                                        t,
                                                                    ) ?? '—'}
                                                                </td>
                                                                {showAssignmentMode && (
                                                                    <td className="p-2 print:py-1">
                                                                        {printValue(
                                                                            row.attendance_mode,
                                                                            t,
                                                                        ) ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {uiText('Attendance', locale)}
                                        </div>
                                        {externalAttendances.length === 0 ? (
                                            <p className="p-2 text-sm text-muted-foreground">
                                                —
                                            </p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                    <tr>
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Attendance date',
                                                                locale,
                                                            )}
                                                        </th>
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Coach',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showAttendanceSport && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Sport',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showAttendanceVenue && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Training venue',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Attendance status',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showAttendanceGeoStatus && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Geo status',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showAttendanceReviewStatus && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Review status',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showAttendanceFlagReason && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Flag reason',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="print:text-[10px]">
                                                    {externalAttendances.map(
                                                        (row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="border-t print:align-top"
                                                            >
                                                                <td className="p-2 print:py-1">
                                                                    {formatDateValue(
                                                                        row.attendance_date,
                                                                        locale,
                                                                    ) ?? '—'}
                                                                </td>
                                                                <td className="p-2 print:py-1">
                                                                    {row
                                                                        .external_coach
                                                                        ?.name ??
                                                                        '—'}
                                                                </td>
                                                                {showAttendanceSport && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row
                                                                            .sport
                                                                            ?.name ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showAttendanceVenue && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row
                                                                            .training_venue
                                                                            ?.name ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                <td className="p-2 print:py-1">
                                                                    {printValue(
                                                                        row.attendance_status,
                                                                        t,
                                                                    ) ?? '—'}
                                                                </td>
                                                                {showAttendanceGeoStatus && (
                                                                    <td className="p-2 print:py-1">
                                                                        {printValue(
                                                                            row.geo_status,
                                                                            t,
                                                                        ) ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showAttendanceReviewStatus && (
                                                                    <td className="p-2 print:py-1">
                                                                        {printValue(
                                                                            row.review_status,
                                                                            t,
                                                                        ) ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showAttendanceFlagReason && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row.flag_reason ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {uiText(
                                                'Performance updates',
                                                locale,
                                            )}
                                        </div>
                                        {externalPerformanceUpdates.length ===
                                        0 ? (
                                            <p className="p-2 text-sm text-muted-foreground">
                                                —
                                            </p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                    <tr>
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Update date',
                                                                locale,
                                                            )}
                                                        </th>
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Coach',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showPerformanceSport && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Sport',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        <th className="p-2">
                                                            {uiText(
                                                                'Performance level',
                                                                locale,
                                                            )}
                                                        </th>
                                                        {showPerformanceScore && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Performance score',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showPerformanceReviewStatus && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Review status',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                        {showPerformanceSummary && (
                                                            <th className="p-2">
                                                                {uiText(
                                                                    'Training summary',
                                                                    locale,
                                                                )}
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="print:text-[10px]">
                                                    {externalPerformanceUpdates.map(
                                                        (row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="border-t print:align-top"
                                                            >
                                                                <td className="p-2 print:py-1">
                                                                    {formatDateValue(
                                                                        row.update_date,
                                                                        locale,
                                                                    ) ?? '—'}
                                                                </td>
                                                                <td className="p-2 print:py-1">
                                                                    {row
                                                                        .external_coach
                                                                        ?.name ??
                                                                        '—'}
                                                                </td>
                                                                {showPerformanceSport && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row
                                                                            .sport
                                                                            ?.name ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                <td className="p-2 print:py-1">
                                                                    {printValue(
                                                                        row.performance_level,
                                                                        t,
                                                                    ) ?? '—'}
                                                                </td>
                                                                {showPerformanceScore && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row.performance_score ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showPerformanceReviewStatus && (
                                                                    <td className="p-2 print:py-1">
                                                                        {printValue(
                                                                            row.review_status,
                                                                            t,
                                                                        ) ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                                {showPerformanceSummary && (
                                                                    <td className="p-2 print:py-1">
                                                                        {row.training_summary ??
                                                                            '—'}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('promotions') && (
                        <Section title={uiText('Promotions / rewards', locale)}>
                            <Deferred
                                data="promotions"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {(promotions ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No promotions yet.', locale)}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {uiText('Promotions', locale)}
                                            </h3>
                                            {promotionRows.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    {uiText(
                                                        'No promotions yet.',
                                                        locale,
                                                    )}
                                                </p>
                                            ) : (
                                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                            <tr>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'From rank',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'To rank',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Promotion date',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Reason',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Remarks',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Evidence',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="print:text-[10px]">
                                                            {promotionRows.map(
                                                                (row) => (
                                                                    <tr
                                                                        key={`promotion-${row.id}`}
                                                                        className="border-t print:align-top"
                                                                    >
                                                                        <td className="p-2 print:py-1">
                                                                            {row.from_rank ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {
                                                                                row.to_rank
                                                                            }
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {formatDateValue(
                                                                                row.promotion_date,
                                                                                locale,
                                                                            ) ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {row.reason ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {row.remarks ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {row
                                                                                .evidences
                                                                                .length >
                                                                            0
                                                                                ? row.evidences
                                                                                      .flatMap(
                                                                                          (
                                                                                              evidence,
                                                                                          ) =>
                                                                                              promotionEvidenceLines(
                                                                                                  evidence,
                                                                                                  locale,
                                                                                                  t,
                                                                                              ),
                                                                                      )
                                                                                      .join(
                                                                                          ' · ',
                                                                                      )
                                                                                : '—'}
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {uiText('Rewards', locale)}
                                            </h3>
                                            {rewardRows.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    {uiText(
                                                        'No rewards yet.',
                                                        locale,
                                                    )}
                                                </p>
                                            ) : (
                                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                            <tr>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Cash reward amount',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Cash reward date',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Cash reward reference',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                                <th className="p-2">
                                                                    {uiText(
                                                                        'Remarks',
                                                                        locale,
                                                                    )}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="print:text-[10px]">
                                                            {rewardRows.map(
                                                                (row) => (
                                                                    <tr
                                                                        key={`reward-${row.id}`}
                                                                        className="border-t print:align-top"
                                                                    >
                                                                        <td className="p-2 print:py-1">
                                                                            {row.cash_reward_amount
                                                                                ? `₹${row.cash_reward_amount}`
                                                                                : '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {formatDateValue(
                                                                                row.cash_reward_date,
                                                                                locale,
                                                                            ) ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {row.cash_reward_reference ??
                                                                                '—'}
                                                                        </td>
                                                                        <td className="p-2 print:py-1">
                                                                            {row.cash_reward_remarks ??
                                                                                '—'}
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('timeline') && (
                        <Section title={uiText('Record timeline', locale)}>
                            <Deferred
                                data="auditLog"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                <Timeline
                                    entries={auditLog ?? []}
                                    locale={locale}
                                    t={t}
                                    mode={timelineMode}
                                />
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('status') && (
                        <Section title={uiText('Status history', locale)}>
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
                                {(statusHistory ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No status records.', locale)}
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border print:rounded-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Status',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Effective on',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Reason',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Recorded by',
                                                            locale,
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="print:text-[10px]">
                                                {(statusHistory ?? []).map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="border-t print:align-top"
                                                        >
                                                            <td className="p-2 print:py-1">
                                                                {printValue(
                                                                    row.status,
                                                                    t,
                                                                )}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {formatDateValue(
                                                                    row.effective_on,
                                                                    locale,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.reason ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2 print:py-1">
                                                                {row.recorded_by_name ??
                                                                    '—'}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}
