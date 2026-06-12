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
type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name_hi: string } | null;
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
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    medal_type: string | null;
    sort_order: number | null;
    benefits: AchievementBenefitRow[];
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
    | 'promotions'
    | 'timeline';

type Props = {
    member: Member;
    statusHistory?: StatusEntry[];
    memberTeams?: MemberTeamRow[];
    legacyAchievements?: LegacyAchievement[];
    promotions?: PromotionRow[];
    auditLog?: AuditEntry[];
};

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
    'Story timeline': { en: 'Story timeline', hi: 'कथा समयरेखा' },
    'Compact timeline': { en: 'Compact timeline', hi: 'संक्षिप्त समयरेखा' },
    'Identity and personal details': {
        en: 'Identity and personal details',
        hi: 'पहचान और व्यक्तिगत विवरण',
    },
    'Contact and address': {
        en: 'Contact and address',
        hi: 'संपर्क और पता',
    },
    'Service and posting': { en: 'Service and posting', hi: 'सेवा और तैनाती' },
    'Sports and eligibility': {
        en: 'Sports and eligibility',
        hi: 'खेल और पात्रता',
    },
    'Status history': { en: 'Status history', hi: 'स्थिति इतिहास' },
    'Team memberships': { en: 'Team memberships', hi: 'टीम सदस्यता' },
    'Legacy achievements': {
        en: 'Legacy achievements',
        hi: 'पूर्व उपलब्धियां',
    },
    'Promotions and rewards': {
        en: 'Promotions and rewards',
        hi: 'पदोन्नति और पुरस्कार',
    },
    'Record timeline': { en: 'Record timeline', hi: 'रिकॉर्ड समयरेखा' },
    PNO: { en: 'PNO', hi: 'पीएनओ' },
    'Current status': { en: 'Current status', hi: 'वर्तमान स्थिति' },
    'Name (Hindi)': { en: 'Name (Hindi)', hi: 'नाम (हिंदी)' },
    'Name (English)': { en: 'Name (English)', hi: 'नाम (अंग्रेजी)' },
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
    'Posting district': { en: 'Posting district', hi: 'तैनाती जनपद' },
    'Team since': { en: 'Team since', hi: 'टीम से जुड़ने की तिथि' },
    Appointment: { en: 'Appointment', hi: 'नियुक्ति' },
    Category: { en: 'Category', hi: 'श्रेणी' },
    Level: { en: 'Level', hi: 'स्तर' },
    'Primary sport': { en: 'Primary sport', hi: 'मुख्य खेल' },
    'Other playable sports': {
        en: 'Other playable sports',
        hi: 'अन्य खेलने योग्य खेल',
    },
    'Sport event': { en: 'Sport event', hi: 'खेल इवेंट' },
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
]);

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="break-inside-avoid rounded-lg border bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase print:text-black">
                {title}
            </h2>
            {children}
        </section>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid gap-1">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase print:text-neutral-600">
                {label}
            </div>
            <div className="text-sm text-foreground">
                {value ?? <span className="text-muted-foreground">—</span>}
            </div>
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
    dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
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
        en: 'promotion and reward',
        hi: 'पदोन्नति और पुरस्कार',
        introEn:
            'This part follows promotions, rewards, references, and related remarks.',
        introHi:
            'यह भाग पदोन्नति, पुरस्कार, संदर्भ और संबंधित टिप्पणियों को दिखाता है।',
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
    'Name (Hindi)': { en: 'the Hindi name', hi: 'हिंदी नाम' },
    'Name (English)': { en: 'the English name', hi: 'अंग्रेजी नाम' },
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
    'Posting district': { en: 'the posting district', hi: 'तैनाती जनपद' },
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

function storyValue(
    field: string,
    value: string | null,
    locale: string,
): string {
    if (!value) {
        return locale === 'en' ? 'not recorded' : 'दर्ज नहीं';
    }

    if (field.toLowerCase().includes('amount') && !value.includes('₹')) {
        return `₹${value}`;
    }

    if (DATE_FIELD_LABELS.has(field)) {
        return formatDateValue(value, locale, 'long') ?? value;
    }

    if (field === 'Photo' && value === '✓') {
        return locale === 'en' ? 'attached' : 'संलग्न';
    }

    return value;
}

function timelineChangeValue(
    field: string,
    value: string | null,
    locale: string,
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

    return value;
}

function storyChangeSentence(
    change: AuditChange,
    locale: string,
    t: (key: string) => string,
): string | null {
    if (change.field === 'Evidence type') {
        return null;
    }

    if (change.field === 'Evidence') {
        if (change.old && change.new) {
            return locale === 'en'
                ? `Supporting evidence changed from ${change.old} to ${change.new}.`
                : `सहायक प्रमाण ${change.old} से ${change.new} में बदला।`;
        }

        if (change.new) {
            return locale === 'en'
                ? `Supporting evidence was attached: ${change.new}.`
                : `सहायक प्रमाण संलग्न किया गया: ${change.new}।`;
        }

        if (change.old) {
            return locale === 'en'
                ? `Supporting evidence was removed: ${change.old}.`
                : `सहायक प्रमाण हटाया गया: ${change.old}।`;
        }

        return null;
    }

    const label = storyField(change.field, locale, t);
    const oldValue = storyValue(change.field, change.old, locale);
    const newValue = storyValue(change.field, change.new, locale);

    if (change.old && change.new) {
        return locale === 'en'
            ? `${label} changed from ${oldValue} to ${newValue}.`
            : `${label} ${oldValue} से ${newValue} में बदला।`;
    }

    if (change.new) {
        if (change.field === 'Photo') {
            return locale === 'en'
                ? 'A member photo was attached to the record.'
                : 'रिकॉर्ड में सदस्य फोटो संलग्न किया गया।';
        }

        return locale === 'en'
            ? `${label} was recorded as ${newValue}.`
            : `${label} ${newValue} दर्ज किया गया।`;
    }

    if (change.old) {
        return locale === 'en'
            ? `${label} was cleared from the record; earlier it was ${oldValue}.`
            : `${label} रिकॉर्ड से हटाया गया; पहले ${oldValue} दर्ज था।`;
    }

    return locale === 'en'
        ? `${label} was reviewed without a visible value change.`
        : `${label} की समीक्षा हुई, लेकिन कोई दिखने वाला मान परिवर्तन नहीं था।`;
}

function storyOpening(
    entry: AuditEntry,
    subject: string,
    locale: string,
    t: (key: string) => string,
): string {
    const when = formatTimelineDate(entry.at, locale);
    const label = storySubject(subject, locale).label;

    if (entry.action === 'created') {
        return locale === 'en'
            ? `On ${when}, a ${label} entry was added to the member record.`
            : `${when} को सदस्य रिकॉर्ड में ${label} प्रविष्टि जोड़ी गई।`;
    }

    if (entry.action === 'updated') {
        return locale === 'en'
            ? `On ${when}, the ${label} details were updated.`
            : `${when} को ${label} विवरण अद्यतन किए गए।`;
    }

    if (entry.action === 'deleted') {
        return locale === 'en'
            ? `On ${when}, a ${label} entry was removed from the member record.`
            : `${when} को सदस्य रिकॉर्ड से ${label} प्रविष्टि हटाई गई।`;
    }

    return locale === 'en'
        ? `On ${when}, ${t(entry.action)} was recorded for ${label}.`
        : `${when} को ${label} के लिए ${t(entry.action)} दर्ज किया गया।`;
}

function formatStoryList(items: string[], locale: string): string {
    try {
        return new Intl.ListFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
            style: 'long',
            type: 'conjunction',
        }).format(items);
    } catch {
        return items.join(', ');
    }
}

function buildPromotionEvidenceParagraphs(
    entries: AuditEntry[],
    locale: string,
    t: (key: string) => string,
): string[] {
    const grouped = new Map<
        string,
        { action: string; when: string; labels: string[] }
    >();
    const fallback: string[] = [];

    for (const entry of entries) {
        const evidenceChange = entry.changes.find(
            (change) => change.field === 'Evidence',
        );
        const evidenceLabel =
            entry.action === 'deleted'
                ? evidenceChange?.old
                : evidenceChange?.new;

        if (!evidenceLabel) {
            const opening = storyOpening(
                entry,
                'Promotion evidence',
                locale,
                t,
            );
            const sentences = entry.changes
                .map((change) => storyChangeSentence(change, locale, t))
                .filter((sentence): sentence is string => Boolean(sentence));

            fallback.push(
                `${opening} ${
                    sentences.length > 0
                        ? sentences.join(' ')
                        : locale === 'en'
                          ? 'No detailed field values were changed in this entry.'
                          : 'इस प्रविष्टि में कोई विस्तृत फील्ड मान नहीं बदला।'
                }`,
            );

            continue;
        }

        const when = formatTimelineDate(entry.at, locale);
        const key = `${entry.action}-${when}`;
        const current = grouped.get(key) ?? {
            action: entry.action,
            when,
            labels: [],
        };

        if (!current.labels.includes(evidenceLabel)) {
            current.labels.push(evidenceLabel);
        }

        grouped.set(key, current);
    }

    const paragraphs = Array.from(grouped.values()).map((group) => {
        const labels = formatStoryList(group.labels, locale);

        if (group.action === 'deleted') {
            return locale === 'en'
                ? `On ${group.when}, supporting evidence was removed from the promotion record: ${labels}.`
                : `${group.when} को पदोन्नति रिकॉर्ड से सहायक प्रमाण हटाया गया: ${labels}।`;
        }

        if (group.action === 'updated') {
            return locale === 'en'
                ? `On ${group.when}, supporting evidence for the promotion record was revised: ${labels}.`
                : `${group.when} को पदोन्नति रिकॉर्ड के सहायक प्रमाण में बदलाव किया गया: ${labels}।`;
        }

        return locale === 'en'
            ? `On ${group.when}, supporting evidence was attached to the promotion record: ${labels}.`
            : `${group.when} को पदोन्नति रिकॉर्ड में सहायक प्रमाण संलग्न किया गया: ${labels}।`;
    });

    return [...paragraphs, ...fallback];
}

function buildTimelineParagraphs(
    entries: AuditEntry[],
    locale: string,
    t: (key: string) => string,
): { subject: string; intro: string; paragraphs: string[] }[] {
    const grouped = entries.reduce<Record<string, AuditEntry[]>>(
        (acc, entry) => {
            const key = entry.subject || 'Other';
            acc[key] = acc[key] ?? [];
            acc[key].push(entry);

            return acc;
        },
        {},
    );

    return Object.entries(grouped).map(([subject, subjectEntries]) => {
        const sortedEntries = [...subjectEntries].sort(
            (first, second) =>
                new Date(first.at).getTime() - new Date(second.at).getTime(),
        );

        return {
            subject: t(subject),
            intro: storySubject(subject, locale).intro,
            paragraphs:
                subject === 'Promotion evidence'
                    ? buildPromotionEvidenceParagraphs(sortedEntries, locale, t)
                    : sortedEntries.map((entry) => {
                          const opening = storyOpening(
                              entry,
                              subject,
                              locale,
                              t,
                          );
                          const sentences = entry.changes
                              .map((change) =>
                                  storyChangeSentence(change, locale, t),
                              )
                              .filter((sentence): sentence is string =>
                                  Boolean(sentence),
                              );
                          const details =
                              sentences.length > 0
                                  ? sentences.join(' ')
                                  : locale === 'en'
                                    ? 'No detailed field values were changed in this entry.'
                                    : 'इस प्रविष्टि में कोई विस्तृत फील्ड मान नहीं बदला।';

                          return `${opening} ${details}`;
                      }),
        };
    });
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

    if (visibleEntries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {locale === 'en'
                    ? 'No timeline entries.'
                    : 'कोई इतिहास प्रविष्टि नहीं है।'}
            </p>
        );
    }

    const sections = entries.reduce<Record<string, AuditEntry[]>>(
        (acc, entry) => {
            if (entry.subject === 'Alias') {
                return acc;
            }

            const group = entry.subject || 'Other';
            acc[group] = acc[group] ?? [];
            acc[group].push(entry);

            return acc;
        },
        {},
    );

    if (mode === 'story') {
        const storySections = buildTimelineParagraphs(
            visibleEntries,
            locale,
            t,
        );

        return (
            <div className="space-y-5">
                {storySections.map((section) => (
                    <div key={section.subject} className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">
                            {section.subject}
                        </h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {section.intro}
                        </p>
                        <div className="space-y-3 border-l border-muted-foreground/20 pl-4">
                            {section.paragraphs.map((paragraph, index) => (
                                <p
                                    key={`${section.subject}-${index}`}
                                    className="relative text-sm leading-7 text-foreground"
                                >
                                    <span className="absolute top-2 -left-[21px] size-2 rounded-full bg-primary" />
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(sections).map(([subject, subjectEntries]) => (
                <div key={subject} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                        {t(subject)}
                    </h3>
                    <div className="space-y-2 border-l border-muted-foreground/20 pl-4">
                        {subjectEntries.map((entry) => (
                            <div key={entry.id} className="relative">
                                <div className="absolute top-2 -left-[21px] size-2 rounded-full bg-primary" />
                                <div className="rounded-md border p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-sm font-medium">
                                            {t(entry.action)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatTimelineTime(
                                                entry.at,
                                                locale,
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {entry.changes.map((change) => (
                                            <div
                                                key={`${entry.id}-${change.field}`}
                                                className="grid gap-1 text-sm sm:grid-cols-3"
                                            >
                                                <div className="font-medium">
                                                    {change.field}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {timelineChangeValue(
                                                        change.field,
                                                        change.old,
                                                        locale,
                                                    )}
                                                </div>
                                                <div className="text-foreground">
                                                    {timelineChangeValue(
                                                        change.field,
                                                        change.new,
                                                        locale,
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

const DEFAULT_SECTIONS: SectionKey[] = [
    'identity',
    'contact',
    'service',
    'sports',
    'status',
    'teams',
    'legacy',
    'promotions',
    'timeline',
];

export default function PrintPreview({
    member,
    statusHistory,
    memberTeams,
    legacyAchievements,
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
        { title: member.full_name_hi, href: MemberController.show.url(member) },
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
                        @page { margin: 1cm; }
                        body { margin: 0; background: white; }
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
                title={`${member.full_name_hi} - ${uiText('Print preview', locale)}`}
            />
            <div
                ref={printTargetRef}
                id="quick-view-print-target"
                className="relative mx-auto max-w-5xl space-y-6 overflow-hidden rounded-2xl border border-neutral-300 bg-white p-4 text-black shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
            >
                <div className="pointer-events-none absolute inset-0 hidden print:block">
                    <div className="absolute inset-0 border border-neutral-300/70" />
                    <div className="absolute inset-6 border border-dashed border-neutral-300/60" />
                </div>

                <div className="flex items-start justify-between gap-4 print:hidden">
                    <div className="flex items-start gap-4">
                        <div className="size-24 overflow-hidden rounded-xl border bg-muted">
                            {member.photo_path ? (
                                <img
                                    src={`/storage/${member.photo_path}`}
                                    alt={member.full_name_hi}
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
                                {member.full_name_hi}
                            </h1>
                            {member.full_name_en && (
                                <p className="text-sm text-muted-foreground">
                                    {member.full_name_en}
                                </p>
                            )}
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
                        {DEFAULT_SECTIONS.map((section) => (
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

                <div className="grid gap-4">
                    {sectionEnabled('identity') && (
                        <Section
                            title={uiText(
                                'Identity and personal details',
                                locale,
                            )}
                        >
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label={uiText('PNO', locale)}
                                    value={
                                        member.pno ? (
                                            <span className="font-mono">
                                                {member.pno}
                                            </span>
                                        ) : null
                                    }
                                />
                                <Field
                                    label={uiText('Current status', locale)}
                                    value={
                                        <Badge variant="outline">
                                            {t(member.current_status)}
                                        </Badge>
                                    }
                                />
                                <Field
                                    label={uiText('Name (Hindi)', locale)}
                                    value={member.full_name_hi}
                                />
                                <Field
                                    label={uiText('Name (English)', locale)}
                                    value={member.full_name_en}
                                />
                                <Field
                                    label={uiText("Father's name", locale)}
                                    value={member.father_name_hi}
                                />
                                <Field
                                    label={uiText('Gender', locale)}
                                    value={t(
                                        member.gender === 'M'
                                            ? 'Male'
                                            : member.gender === 'F'
                                              ? 'Female'
                                              : 'Other gender',
                                    )}
                                />
                                <Field
                                    label={uiText('Date of birth', locale)}
                                    value={formatDateValue(
                                        member.dob,
                                        locale,
                                        'long',
                                    )}
                                />
                            </div>
                        </Section>
                    )}

                    {sectionEnabled('contact') && (
                        <Section title={uiText('Contact and address', locale)}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label={uiText('Mobile', locale)}
                                    value={member.mobile}
                                />
                                <Field
                                    label={uiText('Home address', locale)}
                                    value={member.home_address}
                                />
                                <Field
                                    label={uiText('Blood group', locale)}
                                    value={member.blood_group}
                                />
                                <Field
                                    label={uiText('Caste', locale)}
                                    value={member.caste}
                                />
                                <Field
                                    label={uiText('Recruitment type', locale)}
                                    value={member.recruitment_type}
                                />
                                <Field
                                    label={uiText('Other notes', locale)}
                                    value={member.other_notes}
                                />
                            </div>
                        </Section>
                    )}

                    {sectionEnabled('service') && (
                        <Section title={uiText('Service and posting', locale)}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label={uiText('Joining date', locale)}
                                    value={formatDateValue(
                                        member.joining_date,
                                        locale,
                                    )}
                                />
                                <Field
                                    label={uiText('Promotion date', locale)}
                                    value={formatDateValue(
                                        member.promotion_date,
                                        locale,
                                    )}
                                />
                                <Field
                                    label={uiText('Rank', locale)}
                                    value={member.rank}
                                />
                                <Field
                                    label={uiText('Designation', locale)}
                                    value={member.designation}
                                />
                                <Field
                                    label={uiText('Current unit', locale)}
                                    value={member.current_unit?.name_hi}
                                />
                                <Field
                                    label={uiText('Home district', locale)}
                                    value={member.home_district?.name_hi}
                                />
                                <Field
                                    label={uiText('Posting district', locale)}
                                    value={member.posting_district?.name_hi}
                                />
                                <Field
                                    label={uiText('Team since', locale)}
                                    value={formatDateValue(
                                        member.team_since,
                                        locale,
                                    )}
                                />
                                <Field
                                    label={uiText('Appointment', locale)}
                                    value={member.appointment}
                                />
                            </div>
                        </Section>
                    )}

                    {sectionEnabled('sports') && (
                        <Section
                            title={uiText('Sports and eligibility', locale)}
                        >
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label={uiText('Category', locale)}
                                    value={member.player_category}
                                />
                                <Field
                                    label={uiText('Level', locale)}
                                    value={member.player_level}
                                />
                                <Field
                                    label={uiText('Primary sport', locale)}
                                    value={
                                        member.sport
                                            ? locale === 'en'
                                                ? member.sport.name_en
                                                : member.sport.name_hi
                                            : null
                                    }
                                />
                                <Field
                                    label={uiText(
                                        'Other playable sports',
                                        locale,
                                    )}
                                    value={
                                        member.playable_sports.length > 0
                                            ? member.playable_sports
                                                  .map((sport) =>
                                                      locale === 'en'
                                                          ? sport.name_en
                                                          : sport.name_hi,
                                                  )
                                                  .join(', ')
                                            : null
                                    }
                                />
                                <Field
                                    label={uiText('Sport event', locale)}
                                    value={member.sport_event}
                                />
                            </div>
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
                                <div className="space-y-2">
                                    {(statusHistory ?? []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            {uiText(
                                                'No status records.',
                                                locale,
                                            )}
                                        </p>
                                    ) : (
                                        (statusHistory ?? []).map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                                            >
                                                <div>
                                                    <div className="font-medium">
                                                        {t(row.status)}
                                                    </div>
                                                    {row.reason_hi && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {row.reason_hi}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div>
                                                        {formatDateValue(
                                                            row.effective_on,
                                                            locale,
                                                            'long',
                                                        )}
                                                    </div>
                                                    {row.recorded_by_name && (
                                                        <div>
                                                            {
                                                                row.recorded_by_name
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('teams') && (
                        <Section title={uiText('Team memberships', locale)}>
                            <Deferred
                                data="memberTeams"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {(memberTeams ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No team memberships.', locale)}
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                                <tr>
                                                    <th className="p-2">
                                                        {uiText('Team', locale)}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Sport',
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
                                                        {uiText('Role', locale)}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Joined on',
                                                            locale,
                                                        )}
                                                    </th>
                                                    <th className="p-2">
                                                        {uiText(
                                                            'Left on',
                                                            locale,
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(memberTeams ?? []).map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="border-t"
                                                        >
                                                            <td className="p-2">
                                                                {row.team
                                                                    ?.name_hi ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2">
                                                                {row.sport
                                                                    ?.name ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2">
                                                                {row.session
                                                                    ?.name ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2">
                                                                {row.role ??
                                                                    '—'}
                                                            </td>
                                                            <td className="p-2">
                                                                {formatDateValue(
                                                                    row.joined_on,
                                                                    locale,
                                                                ) ?? '—'}
                                                            </td>
                                                            <td className="p-2">
                                                                {formatDateValue(
                                                                    row.left_on,
                                                                    locale,
                                                                ) ?? '—'}
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
                                    <div className="space-y-3">
                                        {(legacyAchievements ?? []).map(
                                            (row) => (
                                                <div
                                                    key={row.id}
                                                    className="rounded-md border p-3"
                                                >
                                                    <div className="font-medium">
                                                        {row.period}{' '}
                                                        {row.level
                                                            ? `· ${row.level}`
                                                            : ''}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {
                                                            row.competition_details
                                                        }
                                                    </div>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        {[
                                                            formatDateValue(
                                                                row.event_date,
                                                                locale,
                                                            ),
                                                            row.venue,
                                                            row.event,
                                                            row.medal_type
                                                                ? t(
                                                                      row.medal_type,
                                                                  )
                                                                : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </Deferred>
                        </Section>
                    )}

                    {sectionEnabled('promotions') && (
                        <Section
                            title={uiText('Promotions and rewards', locale)}
                        >
                            <Deferred
                                data="promotions"
                                fallback={<Skeleton className="h-10 w-full" />}
                            >
                                {(promotions ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {uiText('No promotions yet.', locale)}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {(promotions ?? []).map((row) => (
                                            <div
                                                key={row.id}
                                                className="rounded-md border p-3"
                                            >
                                                <div className="font-medium">
                                                    {row.from_rank ??
                                                        t('Unknown')}{' '}
                                                    → {row.to_rank}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {[
                                                        row.promotion_date
                                                            ? `${t('Promotion date')}: ${formatDateValue(row.promotion_date, locale)}`
                                                            : null,
                                                        row.cash_reward_amount
                                                            ? `₹${row.cash_reward_amount}`
                                                            : null,
                                                        row.cash_reward_date
                                                            ? `${t('Cash reward date')}: ${formatDateValue(row.cash_reward_date, locale)}`
                                                            : null,
                                                        row.cash_reward_reference,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </div>
                                            </div>
                                        ))}
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
                </div>
            </div>
        </>
    );
}
