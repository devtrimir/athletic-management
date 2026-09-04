import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/use-translation';

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
        } | null;
        event: {
            id: number;
            name: string;
            weight_category: string | null;
        } | null;
        team: { id: number; name: string } | null;
    }[];
};

type SectionKey =
    | 'profile'
    | 'service'
    | 'sports'
    | 'assignments'
    | 'achievements'
    | 'certifications'
    | 'promotions'
    | 'status';

type Props = {
    coach: Coach;
    coachTeams?: CoachAssignment[];
    statusHistory?: CoachStatusHistory[];
    coachAchievements?: CoachAchievementsData;
};

const LETTERHEAD_LOGO_SRC = '/logo.jpg';

const SECTION_LABELS: Record<SectionKey, string> = {
    profile: 'Profile details',
    service: 'Service and contact',
    sports: 'Playable sports',
    assignments: 'Team assignments',
    achievements: 'Achievements',
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

function medalSummary(
    counts: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT', number>,
): string {
    return (['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const)
        .filter((medal) => counts[medal] > 0)
        .map((medal) => `${humanize(medal)}: ${counts[medal]}`)
        .join(', ');
}

function rankLabel(coach: Coach): string {
    return (
        coach.rank_master?.name ??
        coach.rank_master?.short_name ??
        coach.rank_master?.code ??
        ''
    );
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

function DataTable({
    columns,
    rows,
}: {
    columns: string[];
    rows: React.ReactNode[][];
}) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                    <tr>
                        <th className="w-10 p-2 text-center">S. No.</th>
                        {columns.map((column) => (
                            <th key={column} className="p-2 font-semibold">
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="print:text-[10px]">
                    {rows.map((row, index) => (
                        <tr key={index} className="border-t print:align-top">
                            <td className="p-2 text-center text-muted-foreground print:py-1">
                                {index + 1}
                            </td>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="p-2 align-top print:py-1"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function CoachPrintPreview({
    coach,
    coachTeams = [],
    statusHistory = [],
    coachAchievements,
}: Props) {
    const { t } = useTranslation();
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

    function toggleSection(section: SectionKey): void {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    }

    function handlePrint(): void {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

        document.title = filename;

        const printWindow = window.open('', '_blank', 'width=1200,height=900');

        if (!printWindow) {
            return;
        }

        const styles = Array.from(
            document.head.querySelectorAll(
                'meta, link[rel="stylesheet"], style:not([data-print-preview-override])',
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
                        @media print {
                            html body #quick-view-print-target {
                                display: block !important;
                                position: static !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                height: auto !important;
                                overflow: visible !important;
                                padding: 1rem !important;
                                background: white !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${target.outerHTML}
                </body>
            </html>`);
        printWindow.document.close();
        printWindow.focus();

        const triggerPrint = (): void => {
            printWindow.print();
            printWindow.close();
        };

        if (printWindow.document.readyState === 'complete') {
            triggerPrint();
        } else {
            printWindow.addEventListener('load', triggerPrint, { once: true });
        }
    }

    const sports = coach.sports ?? [];
    const certifications = coach.certifications ?? [];
    const promotions = coach.promotions ?? [];
    const achievements = coachAchievements?.groups ?? [];

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
                                        <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase print:text-[8px]">
                                            {t('Name')}
                                        </div>
                                        <div className="mt-1 text-2xl leading-tight font-bold text-foreground print:text-[16px]">
                                            {coach.full_name}
                                        </div>
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
                            <DataTable
                                columns={[t('Sport'), t('Event / Weight')]}
                                rows={sports.map((sport) => [
                                    sport.name,
                                    sport.sport_event,
                                ])}
                            />
                        </Section>
                    )}

                    {enabled('assignments') && coachTeams.length > 0 && (
                        <Section title={t('Team assignments')}>
                            <DataTable
                                columns={[
                                    t('Team'),
                                    t('Sport'),
                                    t('Session'),
                                    t('Role'),
                                    t('Assigned at'),
                                    t('Removed at'),
                                    t('Status'),
                                ]}
                                rows={coachTeams.map((assignment) => [
                                    assignment.team?.name,
                                    assignment.sport?.name,
                                    assignment.session?.name,
                                    humanize(assignment.role),
                                    formatDate(assignment.assigned_at),
                                    formatDate(assignment.removed_at),
                                    assignment.is_current
                                        ? t('Current')
                                        : t('Removed'),
                                ])}
                            />
                        </Section>
                    )}

                    {enabled('achievements') && achievements.length > 0 && (
                        <Section title={t('Achievements')}>
                            <div className="mb-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-6 print:grid-cols-6 print:text-[9px]">
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
                                        className="rounded-md border px-2 py-1.5 text-center print:py-1"
                                    >
                                        <div className="font-semibold">
                                            {humanize(medal)}
                                        </div>
                                        <div>
                                            {coachAchievements?.summary[medal]}
                                        </div>
                                    </div>
                                ))}
                                <div className="rounded-md border px-2 py-1.5 text-center print:py-1">
                                    <div className="font-semibold">
                                        {t('Events')}
                                    </div>
                                    <div>
                                        {
                                            coachAchievements?.summary
                                                .total_events
                                        }
                                    </div>
                                </div>
                                <div className="rounded-md border px-2 py-1.5 text-center print:py-1">
                                    <div className="font-semibold">
                                        {t('Players')}
                                    </div>
                                    <div>
                                        {
                                            coachAchievements?.summary
                                                .medal_winning_players
                                        }
                                    </div>
                                </div>
                            </div>
                            <DataTable
                                columns={[
                                    t('Session'),
                                    t('Team'),
                                    t('Tournament'),
                                    t('Event / Weight'),
                                    t('Medals'),
                                    t('Players'),
                                ]}
                                rows={achievements.map((group) => [
                                    group.session.name,
                                    group.team.name,
                                    [
                                        group.tournament.name,
                                        group.tournament.tier_code,
                                        formatDate(group.tournament.date_from),
                                    ]
                                        .filter(Boolean)
                                        .join(' · '),
                                    [
                                        group.event.name,
                                        group.event.weight_category,
                                    ]
                                        .filter(Boolean)
                                        .join(' / '),
                                    medalSummary(group.medal_counts),
                                    group.players
                                        .map((player) =>
                                            [
                                                player.member.full_name,
                                                player.member.pno,
                                                humanize(player.medal_type),
                                            ]
                                                .filter(Boolean)
                                                .join(' - '),
                                        )
                                        .join('; '),
                                ])}
                            />
                        </Section>
                    )}

                    {enabled('certifications') && certifications.length > 0 && (
                        <Section title={t('Certifications')}>
                            <DataTable
                                columns={[t('Name'), t('Type'), t('Issuer')]}
                                rows={certifications.map((certification) => [
                                    certification.name,
                                    certification.certificate_type,
                                    certification.issuer,
                                ])}
                            />
                        </Section>
                    )}

                    {enabled('promotions') && promotions.length > 0 && (
                        <Section title={t('Promotions / rewards')}>
                            <DataTable
                                columns={[
                                    t('Promotion date'),
                                    t('From rank'),
                                    t('To rank'),
                                    t('Cash reward amount'),
                                    t('Cash reward date'),
                                    t('Reference'),
                                    t('Evidence'),
                                ]}
                                rows={promotions.map((promotion) => [
                                    formatDate(promotion.promotion_date),
                                    promotion.from_rank,
                                    promotion.to_rank,
                                    promotion.cash_reward_amount,
                                    formatDate(promotion.cash_reward_date),
                                    promotion.cash_reward_reference,
                                    promotion.evidences
                                        .map((evidence) => evidence.summary)
                                        .filter(Boolean)
                                        .join('; '),
                                ])}
                            />
                        </Section>
                    )}

                    {enabled('status') && statusHistory.length > 0 && (
                        <Section title={t('Status history')}>
                            <DataTable
                                columns={[
                                    t('Status'),
                                    t('Effective on'),
                                    t('Reason'),
                                    t('Recorded by'),
                                ]}
                                rows={statusHistory.map((row) => [
                                    humanize(row.status),
                                    formatDate(row.effective_on),
                                    row.reason,
                                    row.recorded_by_name,
                                ])}
                            />
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}
