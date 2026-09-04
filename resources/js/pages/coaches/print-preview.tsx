import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/use-translation';

type Coach = {
    id: number;
    full_name: string;
    display_name: string | null;
    designation: string | null;
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
        coach.rank_master?.short_name ??
        coach.rank_master?.name ??
        coach.rank_master?.code ??
        ''
    );
}

function DetailTable({
    rows,
}: {
    rows: { label: string; value: React.ReactNode }[];
}) {
    const visibleRows = rows.filter((row) => hasValue(row.value));

    if (visibleRows.length === 0) {
        return null;
    }

    return (
        <table className="w-full border-collapse text-sm print:text-[10px]">
            <tbody>
                {visibleRows.map((row) => (
                    <tr key={row.label}>
                        <th className="w-1/3 border bg-muted/30 px-2 py-1.5 text-left align-top text-xs font-semibold text-muted-foreground uppercase print:px-1 print:py-0.5 print:text-[8px]">
                            {row.label}
                        </th>
                        <td className="border px-2 py-1.5 align-top print:px-1 print:py-0.5">
                            {row.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
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
        <section className="break-inside-avoid space-y-2 rounded-lg border bg-white p-3 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="border-b pb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase print:text-[10px] print:text-black">
                {title}
            </h2>
            {children}
        </section>
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
        <table className="w-full border-collapse text-xs print:text-[9px]">
            <thead className="bg-muted/40">
                <tr>
                    <th className="w-10 border px-2 py-1 text-center">
                        S. No.
                    </th>
                    {columns.map((column) => (
                        <th
                            key={column}
                            className="border px-2 py-1 text-left font-semibold"
                        >
                            {column}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => (
                    <tr key={index}>
                        <td className="border px-2 py-1 text-center text-muted-foreground">
                            {index + 1}
                        </td>
                        {row.map((cell, cellIndex) => (
                            <td
                                key={cellIndex}
                                className="border px-2 py-1 align-top"
                            >
                                {cell}
                            </td>
                        ))}
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
}: Props) {
    const { t } = useTranslation();
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

    function toggleSection(section: SectionKey): void {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    }

    function printPage(): void {
        document.title = filename;
        window.print();
    }

    const sports = coach.sports ?? [];
    const certifications = coach.certifications ?? [];
    const promotions = coach.promotions ?? [];
    const achievements = coachAchievements?.groups ?? [];

    return (
        <>
            <Head title={t('Coach print preview')} />

            <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
                <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_1fr] print:block print:max-w-none">
                    <aside className="space-y-3 rounded-lg border bg-card p-4 shadow-sm print:hidden">
                        <div>
                            <h1 className="font-semibold">
                                {t('Print options')}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('Choose sections to include in print.')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            {DEFAULT_SECTIONS.map((section) => (
                                <label
                                    key={section}
                                    className="flex cursor-pointer items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={selectedSections.includes(
                                            section,
                                        )}
                                        onCheckedChange={() =>
                                            toggleSection(section)
                                        }
                                    />
                                    {t(SECTION_LABELS[section])}
                                </label>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <Button type="button" onClick={printPage}>
                                <Printer className="mr-2 size-4" />
                                {t('Print')}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={`/coaches/${coach.id}`}>
                                    <ArrowLeft className="mr-2 size-4" />
                                    {t('Back to profile')}
                                </Link>
                            </Button>
                        </div>
                    </aside>

                    <main className="mx-auto w-full max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
                        <div className="mb-4 flex items-center justify-between gap-4 border-b pb-3 print:mb-2 print:pb-2">
                            <img
                                src={LETTERHEAD_LOGO_SRC}
                                alt=""
                                className="h-16 w-16 object-contain print:h-12 print:w-12"
                            />
                            <div className="text-center">
                                <h2 className="text-xl font-bold uppercase print:text-sm">
                                    UP Police Sports Control Board (UPPSCB)
                                </h2>
                                <p className="text-sm font-semibold text-muted-foreground print:text-[10px] print:text-black">
                                    {t('Coach profile record')}
                                </p>
                            </div>
                            <div className="h-16 w-16 print:h-12 print:w-12">
                                {coach.photo_path ? (
                                    <img
                                        src={`/storage/${coach.photo_path}`}
                                        alt={coach.full_name}
                                        className="h-full w-full rounded border object-cover"
                                    />
                                ) : null}
                            </div>
                        </div>

                        <div className="mb-4 text-center print:mb-2">
                            <h1 className="text-lg font-bold print:text-xs">
                                {coach.full_name}
                            </h1>
                            <p className="text-sm text-muted-foreground print:text-[10px] print:text-black">
                                {[coach.designation, coach.pno]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        </div>

                        <div className="space-y-4 print:space-y-2">
                            {enabled('profile') && (
                                <Section title={t('Profile details')}>
                                    <DetailTable
                                        rows={[
                                            {
                                                label: t('Name'),
                                                value: coach.full_name,
                                            },
                                            {
                                                label: t('Display name'),
                                                value: coach.display_name,
                                            },
                                            {
                                                label: t('PNO'),
                                                value: coach.pno,
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
                                </Section>
                            )}

                            {enabled('service') && (
                                <Section title={t('Service and contact')}>
                                    <DetailTable
                                        rows={[
                                            {
                                                label: t('Designation'),
                                                value: coach.designation,
                                            },
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
                                        columns={[
                                            t('Sport'),
                                            t('Event / Weight'),
                                            t('Primary'),
                                            t('Effective from'),
                                            t('Effective to'),
                                            t('Notes'),
                                        ]}
                                        rows={sports.map((sport) => [
                                            sport.name,
                                            sport.sport_event,
                                            sport.is_primary ? t('Yes') : '',
                                            formatDate(sport.effective_from),
                                            formatDate(sport.effective_to),
                                            sport.notes,
                                        ])}
                                    />
                                </Section>
                            )}

                            {enabled('assignments') &&
                                coachTeams.length > 0 && (
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
                                            rows={coachTeams.map(
                                                (assignment) => [
                                                    assignment.team?.name,
                                                    assignment.sport?.name,
                                                    assignment.session?.name,
                                                    humanize(assignment.role),
                                                    formatDate(
                                                        assignment.assigned_at,
                                                    ),
                                                    formatDate(
                                                        assignment.removed_at,
                                                    ),
                                                    assignment.is_current
                                                        ? t('Current')
                                                        : t('Removed'),
                                                ],
                                            )}
                                        />
                                    </Section>
                                )}

                            {enabled('achievements') &&
                                achievements.length > 0 && (
                                    <Section title={t('Achievements')}>
                                        <div className="mb-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-6 print:grid-cols-6 print:text-[9px]">
                                            {[
                                                'GOLD',
                                                'SILVER',
                                                'BRONZE',
                                                'MERIT',
                                            ].map((medal) => (
                                                <div
                                                    key={medal}
                                                    className="rounded border px-2 py-1 text-center"
                                                >
                                                    <div className="font-semibold">
                                                        {humanize(medal)}
                                                    </div>
                                                    <div>
                                                        {
                                                            coachAchievements
                                                                ?.summary[
                                                                medal as keyof Pick<
                                                                    CoachAchievementsData['summary'],
                                                                    | 'GOLD'
                                                                    | 'SILVER'
                                                                    | 'BRONZE'
                                                                    | 'MERIT'
                                                                >
                                                            ]
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="rounded border px-2 py-1 text-center">
                                                <div className="font-semibold">
                                                    {t('Events')}
                                                </div>
                                                <div>
                                                    {
                                                        coachAchievements
                                                            ?.summary
                                                            .total_events
                                                    }
                                                </div>
                                            </div>
                                            <div className="rounded border px-2 py-1 text-center">
                                                <div className="font-semibold">
                                                    {t('Players')}
                                                </div>
                                                <div>
                                                    {
                                                        coachAchievements
                                                            ?.summary
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
                                                    formatDate(
                                                        group.tournament
                                                            .date_from,
                                                    ),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · '),
                                                [
                                                    group.event.name,
                                                    group.event.weight_category,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' / '),
                                                medalSummary(
                                                    group.medal_counts,
                                                ),
                                                group.players
                                                    .map((player) =>
                                                        [
                                                            player.member
                                                                .full_name,
                                                            player.member.pno,
                                                            humanize(
                                                                player.medal_type,
                                                            ),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' - '),
                                                    )
                                                    .join('; '),
                                            ])}
                                        />
                                    </Section>
                                )}

                            {enabled('certifications') &&
                                certifications.length > 0 && (
                                    <Section title={t('Certifications')}>
                                        <DataTable
                                            columns={[
                                                t('Name'),
                                                t('Type'),
                                                t('Issuer'),
                                                t('Issued at'),
                                                t('Expired at'),
                                            ]}
                                            rows={certifications.map(
                                                (certification) => [
                                                    certification.name,
                                                    certification.certificate_type,
                                                    certification.issuer,
                                                    formatDate(
                                                        certification.issued_at,
                                                    ),
                                                    formatDate(
                                                        certification.expired_at,
                                                    ),
                                                ],
                                            )}
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
                                            formatDate(
                                                promotion.promotion_date,
                                            ),
                                            promotion.from_rank,
                                            promotion.to_rank,
                                            promotion.cash_reward_amount,
                                            formatDate(
                                                promotion.cash_reward_date,
                                            ),
                                            promotion.cash_reward_reference,
                                            promotion.evidences
                                                .map(
                                                    (evidence) =>
                                                        evidence.summary,
                                                )
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
                    </main>
                </div>
            </div>
        </>
    );
}
