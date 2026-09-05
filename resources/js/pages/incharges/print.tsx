import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';

import { useRef, useState } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Badge } from '@/components/ui/badge';
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

const UI_LABELS: Record<
    string,
    {
        en: string;
        hi: string;
    }
> = {
    'Team prabhari profile record': {
        en: 'Team prabhari profile record',
        hi: 'टीम प्रभारी प्रोफाइल रिकॉर्ड',
    },
    'S. No.': { en: 'S. No.', hi: 'क्र.सं.' },
    'Sport / Event': { en: 'Sport / Event', hi: 'खेल / स्पर्धा' },
    Result: { en: 'Result', hi: 'परिणाम' },
};

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

function hasPrintableValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
}

function hasAnyPrintableValue<T>(
    rows: T[],
    getter: (row: T) => unknown,
): boolean {
    return rows.some((row) => hasPrintableValue(getter(row)));
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

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section
            data-section
            className="break-inside-avoid rounded-lg border bg-white p-3 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
        >
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
    const visibleRows = rows.filter((row) => hasPrintableValue(row.value));

    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full text-sm">
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
    const { locale } = usePage().props as { locale: string };
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const inchargeRecord = incharge ?? {
        id: 0,
        full_name: 'Team Prabhari',
        pno: null,
        rank: null,
        mobile: null,
        email: null,
        is_active: false,
        remarks: null,
        photo_path: null,
    };
    const assignmentRows = assignments;
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

    const sectionEnabled = (section: SectionKey): boolean =>
        selectedSections.includes(section);

    const showTeamSession = hasAnyPrintableValue(
        assignmentRows,
        (row) => row.team?.session?.name ?? row.session?.name,
    );
    const showAssignedAt = hasAnyPrintableValue(
        assignmentRows,
        (row) => row.assigned_at,
    );
    const showRemovedAt = hasAnyPrintableValue(
        assignmentRows,
        (row) => row.removed_at,
    );
    const showReason = hasAnyPrintableValue(
        assignmentRows,
        (row) => row.removal_reason ?? row.assignment_reason,
    );

    const showAchievementLevel = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.level,
    );
    const showAchievementDate = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.event_date ?? row.achieved_on,
    );
    const showAchievementSportEvent = hasAnyPrintableValue(
        achievementRecords,
        (row) =>
            row.sport_discipline ?? row.event ?? row.discipline ?? row.event,
    );
    const showAchievementMedal = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.medal_type,
    );
    const showAchievementPosition = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.position,
    );
    const showAchievementVenue = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.venue,
    );
    const showAchievementRemarks = hasAnyPrintableValue(
        achievementRecords,
        (row) => row.remarks,
    );

    const showSpecialAwardedOn = hasAnyPrintableValue(
        specialAchievementRecords,
        (row) => row.awarded_on,
    );
    const showSpecialIssuingAuthority = hasAnyPrintableValue(
        specialAchievementRecords,
        (row) => row.issuing_authority,
    );
    const showSpecialOrderReference = hasAnyPrintableValue(
        specialAchievementRecords,
        (row) => row.order_reference,
    );
    const showSpecialPlace = hasAnyPrintableValue(
        specialAchievementRecords,
        (row) => row.place,
    );
    const showSpecialRemarks = hasAnyPrintableValue(
        specialAchievementRecords,
        (row) => row.remarks,
    );

    const handlePrint = (): void => {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

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
    };

    const breadcrumbs = [
        { title: t('Team Prabhari'), href: InchargeController.index.url() },
        {
            title: inchargeRecord.full_name,
            href: InchargeController.show.url(inchargeRecord),
        },
    ];

    return (
        <>
            <Head
                title={`${inchargeRecord.full_name} - ${t('Print preview')}`}
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
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                            {breadcrumbs.map((item) => item.title).join(' / ')}
                        </div>
                        <h1 className="text-2xl font-bold">{t('Print preview')}</h1>
                        <div className="pt-1">
                            <LocaleSwitcher />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={InchargeController.show.url(
                                    inchargeRecord,
                                )}
                            >
                                <ArrowLeft className="mr-1.5 size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button type="button" size="sm" onClick={handlePrint}>
                            <Printer className="mr-1.5 size-4" />
                            {t('Print')}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 print:hidden">
                    <div className="text-sm font-semibold text-foreground">
                        {t('Print options')}
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
                                <span>{t(SECTION_LABELS[section])}</span>
                            </label>
                        ))}
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
                            {uiText(
                                'Team prabhari profile record',
                                locale,
                            )}
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

                <div className="relative z-10 grid gap-3 print:gap-2">
                    {sectionEnabled('overview') && (
                        <Section title={t('Overview')}>
                            <div className="flex items-start gap-4 print:gap-3">
                                <div className="min-w-0 flex-1 space-y-3 print:space-y-2">
                                    <div>
                                        <div className="text-2xl leading-tight font-bold text-foreground print:text-[16px]">
                                            {inchargeRecord.full_name}
                                        </div>
                                        <div className="mt-2 border-b border-neutral-200 print:mt-1.5" />
                                    </div>
                                    <DetailsTable
                                        rows={[
                                            {
                                                label: t('PNO'),
                                                value: inchargeRecord.pno ? (
                                                    <span className="font-mono">
                                                        {inchargeRecord.pno}
                                                    </span>
                                                ) : null,
                                            },
                                            {
                                                label: t('Current status'),
                                                value: (
                                                    <Badge variant="outline">
                                                        {inchargeRecord.is_active
                                                            ? t('Active')
                                                            : t('Inactive')}
                                                    </Badge>
                                                ),
                                            },
                                            {
                                                label: t('Rank'),
                                                value: inchargeRecord.rank,
                                            },
                                            {
                                                label: t('Mobile'),
                                                value: inchargeRecord.mobile,
                                            },
                                            {
                                                label: t('Email'),
                                                value: inchargeRecord.email,
                                            },
                                            {
                                                label: t('Remarks'),
                                                value: inchargeRecord.remarks,
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="size-28 shrink-0 overflow-hidden rounded-md border bg-muted print:size-24">
                                    {inchargeRecord.photo_path ? (
                                        <img
                                            src={`/storage/${inchargeRecord.photo_path}`}
                                            alt={inchargeRecord.full_name}
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

                    {sectionEnabled('teams') && (
                        <Section title={t('Team assignments')}>
                            {assignmentRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('No teams assigned yet.')}
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                            <tr>
                                                <th className="w-10 p-2 align-top">
                                                    {uiText('S. No.', locale)}
                                                </th>
                                                <th className="p-2 align-top">
                                                    {t('Team')}
                                                </th>
                                                {showTeamSession && (
                                                    <th className="p-2 align-top">
                                                        {t('Session')}
                                                    </th>
                                                )}
                                                {showAssignedAt && (
                                                    <th className="p-2 align-top">
                                                        {t('Assigned at')}
                                                    </th>
                                                )}
                                                {showRemovedAt && (
                                                    <th className="p-2 align-top">
                                                        {t('Removed at')}
                                                    </th>
                                                )}
                                                {showReason && (
                                                    <th className="p-2 align-top">
                                                        {t('Reason')}
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y print:text-[10px]">
                                            {assignmentRows.map(
                                                (row, index) => (
                                                    <tr
                                                        key={row.id}
                                                        className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                    >
                                                        <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3 align-top print:p-2">
                                                            {row.team?.name}
                                                        </td>
                                                        {showTeamSession && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {row.team
                                                                    ?.session
                                                                    ?.name ??
                                                                    row.session
                                                                        ?.name}
                                                            </td>
                                                        )}
                                                        {showAssignedAt && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {formatDateValue(
                                                                    row.assigned_at,
                                                                    locale,
                                                                )}
                                                            </td>
                                                        )}
                                                        {showRemovedAt && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {formatDateValue(
                                                                    row.removed_at,
                                                                    locale,
                                                                )}
                                                            </td>
                                                        )}
                                                        {showReason && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {row.is_current
                                                                    ? t(
                                                                          'Current',
                                                                      )
                                                                    : (row.removal_reason ??
                                                                      row.assignment_reason ??
                                                                      '')}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Section>
                    )}

                    {sectionEnabled('achievements') && (
                        <Section title={t('Achievements')}>
                            {achievementRecords.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('No achievement records yet.')}
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                            <tr>
                                                <th className="w-10 p-2 align-top">
                                                    {uiText('S. No.', locale)}
                                                </th>
                                                <th className="p-2 align-top">
                                                    {t('Title')}
                                                </th>
                                                {showAchievementLevel && (
                                                    <th className="p-2 align-top">
                                                        {t('Level')}
                                                    </th>
                                                )}
                                                {showAchievementDate && (
                                                    <th className="p-2 align-top">
                                                        {t('Date')}
                                                    </th>
                                                )}
                                                {showAchievementSportEvent && (
                                                    <th className="p-2 align-top">
                                                        {uiText(
                                                            'Sport / Event',
                                                            locale,
                                                        )}
                                                    </th>
                                                )}
                                                {showAchievementMedal && (
                                                    <th className="p-2 align-top">
                                                        {uiText(
                                                            'Result',
                                                            locale,
                                                        )}
                                                    </th>
                                                )}
                                                {showAchievementPosition && (
                                                    <th className="p-2 align-top">
                                                        {t('Position')}
                                                    </th>
                                                )}
                                                {showAchievementVenue && (
                                                    <th className="p-2 align-top">
                                                        {t('Venue')}
                                                    </th>
                                                )}
                                                {showAchievementRemarks && (
                                                    <th className="p-2 align-top">
                                                        {t('Remarks')}
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y print:text-[10px]">
                                            {achievementRecords.map(
                                                (row, index) => {
                                                    const sportEventLine = [
                                                        printValue(
                                                            row.sport_discipline,
                                                            t,
                                                        ),
                                                        row.event,
                                                        row.discipline,
                                                    ]
                                                        .filter(
                                                            hasPrintableValue,
                                                        )
                                                        .join(' · ');

                                                    const resultLine = [
                                                        printValue(
                                                            row.medal_type,
                                                            t,
                                                        ),
                                                        row.position != null
                                                            ? `${t('Position')}: ${row.position}`
                                                            : null,
                                                    ]
                                                        .filter(
                                                            hasPrintableValue,
                                                        )
                                                        .join(' · ');

                                                    return (
                                                        <tr
                                                            key={row.id}
                                                            className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                        >
                                                            <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                                {index + 1}
                                                            </td>
                                                            <td className="p-3 align-top print:p-2">
                                                                <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                    {row.title}
                                                                </div>
                                                                {row.competition_details && (
                                                                    <div className="mt-1 text-xs leading-4 break-words text-muted-foreground print:text-[9px]">
                                                                        {
                                                                            row.competition_details
                                                                        }
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {showAchievementLevel && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {printValue(
                                                                        row.level,
                                                                        t,
                                                                    )}
                                                                </td>
                                                            )}
                                                            {showAchievementDate && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {formatDateValue(
                                                                        row.event_date ??
                                                                            row.achieved_on,
                                                                        locale,
                                                                    )}
                                                                </td>
                                                            )}
                                                            {showAchievementSportEvent && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {sportEventLine}
                                                                </td>
                                                            )}
                                                            {showAchievementMedal && (
                                                                <td className="p-3 align-top print:p-2">
                                                                    {resultLine && (
                                                                        <div className="text-xs leading-4 font-semibold text-foreground print:text-[9px]">
                                                                            {
                                                                                resultLine
                                                                            }
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {showAchievementPosition && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {row.position ??
                                                                        ''}
                                                                </td>
                                                            )}
                                                            {showAchievementVenue && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {row.venue}
                                                                </td>
                                                            )}
                                                            {showAchievementRemarks && (
                                                                <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                    {row.remarks}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Section>
                    )}

                    {sectionEnabled('specialAchievements') && (
                        <Section title={t('Special achievements')}>
                            {specialAchievementRecords.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('No special achievements yet.')}
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-md border print:rounded-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                                            <tr>
                                                <th className="w-10 p-2 align-top">
                                                    {uiText('S. No.', locale)}
                                                </th>
                                                <th className="p-2 align-top">
                                                    {t('Type')}
                                                </th>
                                                <th className="p-2 align-top">
                                                    {t('Title')}
                                                </th>
                                                {showSpecialAwardedOn && (
                                                    <th className="p-2 align-top">
                                                        {t('Awarded on')}
                                                    </th>
                                                )}
                                                {showSpecialIssuingAuthority && (
                                                    <th className="p-2 align-top">
                                                        {t('Issuing authority')}
                                                    </th>
                                                )}
                                                {showSpecialOrderReference && (
                                                    <th className="p-2 align-top">
                                                        {t('Order reference')}
                                                    </th>
                                                )}
                                                {showSpecialPlace && (
                                                    <th className="p-2 align-top">
                                                        {t('Place')}
                                                    </th>
                                                )}
                                                {showSpecialRemarks && (
                                                    <th className="p-2 align-top">
                                                        {t('Remarks')}
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y print:text-[10px]">
                                            {specialAchievementRecords.map(
                                                (row, index) => (
                                                    <tr
                                                        key={row.id}
                                                        className="align-top odd:bg-muted/10 print:break-inside-avoid"
                                                    >
                                                        <td className="p-3 text-center text-xs font-medium text-muted-foreground print:p-2">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                            {specialAchievementTypeLabel(
                                                                row.achievement_type,
                                                                t,
                                                            )}
                                                        </td>
                                                        <td className="p-3 align-top print:p-2">
                                                            <div className="leading-5 font-medium break-words text-foreground print:leading-4">
                                                                {row.title}
                                                            </div>
                                                        </td>
                                                        {showSpecialAwardedOn && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {formatDateValue(
                                                                    row.awarded_on,
                                                                    locale,
                                                                )}
                                                            </td>
                                                        )}
                                                        {showSpecialIssuingAuthority && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {
                                                                    row.issuing_authority
                                                                }
                                                            </td>
                                                        )}
                                                        {showSpecialOrderReference && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {
                                                                    row.order_reference
                                                                }
                                                            </td>
                                                        )}
                                                        {showSpecialPlace && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {row.place}
                                                            </td>
                                                        )}
                                                        {showSpecialRemarks && (
                                                            <td className="p-3 align-top text-xs leading-4 text-foreground print:p-2 print:text-[9px]">
                                                                {row.remarks}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}
