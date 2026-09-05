import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/use-translation';
import { specialAchievementTypeLabel } from '@/pages/incharges/show';

type Incharge = {
    id: number;
    full_name: string;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    is_active: boolean;
    remarks: string | null;
    photo_path: string | null;
};

type Assignment = {
    id: number;
    assigned_at: string | null;
    removed_at: string | null;
    assignment_reason: string | null;
    removal_reason: string | null;
    remarks: string | null;
    is_current: boolean;
    team: {
        id: number;
        name: string;
        sport: { id: number; name: string } | null;
        session: { id: number; name: string } | null;
    } | null;
    sport?: { id: number; name: string } | null;
    session?: { id: number; name: string } | null;
};

type Achievement = {
    id: number;
    period: string | null;
    level: string | null;
    title: string;
    competition_details: string | null;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    discipline: string | null;
    weight_category: string | null;
    gender_class: string | null;
    medal_type: string | null;
    position: number | null;
    description: string | null;
    achieved_on: string | null;
    remarks: string | null;
};

type InchargeAchievementPayload = {
    records: Achievement[];
};

type SpecialAchievement = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    order_reference: string | null;
    place: string | null;
    remarks: string | null;
    order_document: {
        original_name: string | null;
        preview_url: string | null;
    } | null;
};

type SpecialAchievementPayload = {
    records: SpecialAchievement[];
};

const LETTERHEAD_LOGO_SRC = '/logo.jpg';
type SectionKey = 'overview' | 'teams' | 'achievements' | 'specialAchievements';
const AVAILABLE_SECTIONS: SectionKey[] = [
    'overview',
    'teams',
    'achievements',
    'specialAchievements',
];
const DEFAULT_SECTIONS: SectionKey[] = AVAILABLE_SECTIONS;
const SECTION_LABELS: Record<SectionKey, string> = {
    overview: 'Overview',
    teams: 'Team assignments',
    achievements: 'Achievements',
    specialAchievements: 'Special achievements',
};

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    const dateOnly = trimmed.includes('T')
        ? (trimmed.split('T')[0] ?? '')
        : trimmed.includes(' ')
          ? (trimmed.split(' ')[0] ?? '')
          : trimmed;
    const ymdMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (ymdMatch) {
        return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
    }

    const parsed = new Date(dateOnly);

    if (Number.isNaN(parsed.getTime())) {
        return dateOnly;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
}

function identityValue(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function hasValue(value: string | null | undefined): boolean {
    return value?.trim() !== undefined && value?.trim() !== '';
}

function normalizeEnumValue(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        return '';
    }

    const translated = t(trimmed);

    if (translated !== trimmed) {
        return translated;
    }

    if (!/[A-Za-z]/.test(trimmed)) {
        return trimmed;
    }

    return trimmed
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) => {
            const normalizedWord = word.toUpperCase();

            if (
                normalizedWord === word.toUpperCase() &&
                normalizedWord.length <= 4
            ) {
                return normalizedWord;
            }

            return `${word[0].toUpperCase()}${word.slice(1)}`;
        })
        .join(' ');
}

function slugifyFileName(value: string): string {
    return value
        .toLowerCase()
        .replace(/\\s+/g, '_')
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/_{2,}/g, '_')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '');
}

export default function InchargePrintPreview({
    incharge,
    assignments = [],
    achievements,
    specialAchievements,
}: {
    incharge?: Incharge;
    assignments?: Assignment[];
    achievements?: InchargeAchievementPayload;
    specialAchievements?: SpecialAchievementPayload;
}) {
    const { t } = useTranslation();
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const inchargeRecord = incharge ?? {
        id: 0,
        full_name: 'Incharge',
        pno: null,
        rank: null,
        mobile: null,
        email: null,
        is_active: false,
        remarks: null,
        photo_path: null,
    };
    const achievementRecords = achievements?.records ?? [];
    const specialAchievementRecords = specialAchievements?.records ?? [];
    const [selectedSections, setSelectedSections] =
        useState<SectionKey[]>(DEFAULT_SECTIONS);

    const toggleSection = (section: SectionKey): void => {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    };

    const handlePrint = (): void => {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=900');

        if (!printWindow) {
            return;
        }

        const safeDate = new Date().toLocaleDateString('en-CA');
        const safeName = slugifyFileName(
            `uppscb-incharge-${inchargeRecord.full_name}-${inchargeRecord.pno ?? ''}-${safeDate}`,
        );

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
                    <title>${safeName}</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    ${styles}
                    <style>
                        @page {
                            size: A4;
                            margin: 6mm;
                        }
                        html,
                        body {
                            margin: 0;
                            background: white;
                        }
                        @media print {
                            #quick-view-print-target {
                                margin: 0 !important;
                                padding: 0 !important;
                                font-size: 9px !important;
                                line-height: 1.25 !important;
                            }
                            body > * {
                                display: block !important;
                            }
                            body #app {
                                display: block !important;
                            }
                            body #app > * {
                                display: none !important;
                            }
                            body #app #quick-view-print-target {
                                display: block !important;
                            }
                            #quick-view-print-target * {
                                color: black !important;
                                background: transparent !important;
                                box-shadow: none !important;
                                border-color: #ccc !important;
                            }
                            #quick-view-print-target [data-print-hide] {
                                display: none !important;
                            }
                            .print\\:hidden {
                                display: none !important;
                            }
                            th,
                            td {
                                font-size: 8px !important;
                                padding: 0.25rem !important;
                            }
                            h1 {
                                font-size: 14px !important;
                            }
                            h2 {
                                font-size: 11px !important;
                            }
                            .text-sm,
                            .text-xs {
                                font-size: 8px !important;
                            }
                            .text-lg {
                                font-size: 12px !important;
                            }
                            .text-2xl {
                                font-size: 16px !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div id="app">${target.outerHTML}</div>
                </body>
            </html>`);
        printWindow.document.close();
        printWindow.document.title = safeName;

        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    };

    const sectionEnabled = (section: SectionKey): boolean =>
        selectedSections.includes(section);

    return (
        <>
            <Head
                title={`${inchargeRecord.full_name} — ${t('Print preview')}`}
            />

            <div
                ref={printTargetRef}
                id="quick-view-print-target"
                className="relative mx-auto max-w-5xl space-y-4 overflow-hidden rounded-2xl border border-neutral-300 bg-white p-4 text-black shadow-sm print:w-full print:max-w-none print:space-y-1 print:rounded-none print:border-0 print:p-0 print:text-[10px] print:leading-4 print:shadow-none"
            >
                <div
                    className="flex items-center justify-between gap-2 print:hidden"
                    data-print-hide
                >
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/incharges/${inchargeRecord.id}`}>
                            <span className="inline-flex items-center">
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back')}
                            </span>
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handlePrint}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                </div>

                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 print:hidden">
                    <div className="text-sm font-semibold text-foreground">
                        {t('Print options')}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
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
                                <span>{t(SECTION_LABELS[section])}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-4 border-b-2 border-neutral-900 pb-3">
                    <img
                        src={LETTERHEAD_LOGO_SRC}
                        alt={t('UP Police Sports Control Board (UPPSCB)')}
                        className="size-20 shrink-0 object-contain"
                    />
                    <div className="min-w-0 flex-1 text-center">
                        <div className="text-lg font-bold tracking-wide uppercase">
                            {t('UP Police Sports Control Board (UPPSCB)')}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-700 uppercase">
                            {t('Incharge profile record')}
                        </div>
                        <div className="mt-1 text-xs text-neutral-700">
                            {t('Official print preview')}
                        </div>
                    </div>
                </div>

                {sectionEnabled('overview') && (
                    <section className="rounded-xl border p-4 print:space-y-2 print:rounded-md print:border-b print:border-neutral-300 print:p-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-foreground print:text-[16px] print:leading-tight">
                                    {inchargeRecord.full_name}
                                </h1>
                                {hasValue(inchargeRecord.pno) && (
                                    <p className="text-sm text-muted-foreground">
                                        {t('PNO')}: {inchargeRecord.pno}
                                    </p>
                                )}
                            </div>
                            {inchargeRecord.photo_path && (
                                <img
                                    src={`/storage/${inchargeRecord.photo_path}`}
                                    alt={inchargeRecord.full_name}
                                    className="size-20 shrink-0 rounded-lg border object-cover"
                                />
                            )}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {hasValue(inchargeRecord.rank) && (
                                <dl className="grid gap-1">
                                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Rank')}
                                    </dt>
                                    <dd>
                                        {identityValue(inchargeRecord.rank)}
                                    </dd>
                                </dl>
                            )}
                            {hasValue(inchargeRecord.mobile) && (
                                <dl className="grid gap-1">
                                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Mobile')}
                                    </dt>
                                    <dd>
                                        {identityValue(inchargeRecord.mobile)}
                                    </dd>
                                </dl>
                            )}
                            {hasValue(inchargeRecord.email) && (
                                <dl className="grid gap-1">
                                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Email')}
                                    </dt>
                                    <dd>
                                        {identityValue(inchargeRecord.email)}
                                    </dd>
                                </dl>
                            )}
                            <dl className="grid gap-1">
                                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {t('Status')}
                                </dt>
                                <dd>
                                    {inchargeRecord.is_active
                                        ? t('Active')
                                        : t('Inactive')}
                                </dd>
                            </dl>
                        </div>

                        {hasValue(inchargeRecord.remarks) && (
                            <div className="mt-3">
                                <h2 className="mb-1 text-sm font-semibold">
                                    {t('Remarks')}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {identityValue(inchargeRecord.remarks)}
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {sectionEnabled('teams') && (
                    <section className="rounded-xl border p-4 print:rounded-md print:border-b print:border-neutral-300 print:p-2">
                        <h2 className="mb-2 text-lg font-semibold">
                            {t('Team assignments')}
                        </h2>
                        {assignments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No teams assigned yet.')}
                            </p>
                        ) : (
                            <div className="overflow-auto">
                                <table className="w-full table-auto border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-left">
                                            <th className="border p-2">
                                                {t('Team')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Session')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Assigned at')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Removed at')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Reason')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignments.map((assignment) => (
                                            <tr key={assignment.id}>
                                                <td className="border p-2">
                                                    {assignment.team?.name}
                                                </td>
                                                <td className="border p-2">
                                                    {assignment.team?.session
                                                        ?.name ??
                                                        assignment.session
                                                            ?.name ??
                                                        ''}
                                                </td>
                                                <td className="border p-2">
                                                    {formatDate(
                                                        assignment.assigned_at,
                                                    )}
                                                </td>
                                                <td className="border p-2">
                                                    {formatDate(
                                                        assignment.removed_at,
                                                    )}
                                                </td>
                                                <td className="border p-2">
                                                    {assignment.is_current
                                                        ? t('Current')
                                                        : (assignment.removal_reason ??
                                                          assignment.assignment_reason ??
                                                          '')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {sectionEnabled('achievements') && (
                    <section className="rounded-xl border p-4 print:rounded-md print:border-b print:border-neutral-300 print:p-2">
                        <h2 className="mb-2 text-lg font-semibold">
                            {t('Achievements')}
                        </h2>
                        {achievementRecords.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No achievement records yet.')}
                            </p>
                        ) : (
                            <div className="overflow-auto">
                                <table className="w-full table-auto border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-left">
                                            <th className="border p-2">
                                                {t('Title')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Level')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Date')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Sport / Event')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Medal')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Position')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Venue')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {achievementRecords.map(
                                            (achievement) => (
                                                <tr key={achievement.id}>
                                                    <td className="border p-2">
                                                        {achievement.title}
                                                    </td>
                                                    <td className="border p-2">
                                                        {normalizeEnumValue(
                                                            achievement.level,
                                                            t,
                                                        )}
                                                    </td>
                                                    <td className="border p-2">
                                                        {formatDate(
                                                            achievement.event_date ??
                                                                achievement.achieved_on,
                                                        )}
                                                    </td>
                                                    <td className="border p-2">
                                                        {[
                                                            normalizeEnumValue(
                                                                achievement.sport_discipline,
                                                                t,
                                                            ),
                                                            achievement.event,
                                                            achievement.discipline,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ') || ''}
                                                    </td>
                                                    <td className="border p-2">
                                                        {normalizeEnumValue(
                                                            achievement.medal_type,
                                                            t,
                                                        )}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.position ??
                                                            ''}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.venue ??
                                                            ''}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {sectionEnabled('specialAchievements') && (
                    <section className="rounded-xl border p-4 print:rounded-md print:border-b print:border-neutral-300 print:p-2">
                        <h2 className="mb-2 text-lg font-semibold">
                            {t('Special achievements')}
                        </h2>
                        {specialAchievementRecords.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No special achievements yet.')}
                            </p>
                        ) : (
                            <div className="overflow-auto">
                                <table className="w-full table-auto border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-left">
                                            <th className="border p-2">
                                                {t('Type')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Title')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Awarded on')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Authority')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Place')}
                                            </th>
                                            <th className="border p-2">
                                                {t('Reference')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {specialAchievementRecords.map(
                                            (achievement) => (
                                                <tr key={achievement.id}>
                                                    <td className="border p-2">
                                                        {specialAchievementTypeLabel(
                                                            achievement.achievement_type,
                                                            t,
                                                        )}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.title}
                                                    </td>
                                                    <td className="border p-2">
                                                        {formatDate(
                                                            achievement.awarded_on,
                                                        )}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.issuing_authority ??
                                                            ''}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.place ??
                                                            ''}
                                                    </td>
                                                    <td className="border p-2">
                                                        {achievement.order_reference ??
                                                            ''}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </>
    );
}
