import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

type Incharge = {
    id: number;
    full_name: string;
    pno: string | null;
    rank: string | null;
    designation: string | null;
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
    team: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
    district: { id: number; name: string } | null;
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

function formatDate(value: string | null): string {
    return value ? value : '';
}

function identityValue(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function hasValue(value: string | null | undefined): boolean {
    return value?.trim() !== undefined && value?.trim() !== '';
}

export default function InchargePrintPreview({
    incharge,
    assignments,
    achievements,
    specialAchievements,
}: {
    incharge: Incharge;
    assignments: Assignment[];
    achievements?: InchargeAchievementPayload;
    specialAchievements?: SpecialAchievementPayload;
}) {
    const { t } = useTranslation();
    const achievementRecords = achievements?.records ?? [];
    const specialAchievementRecords = specialAchievements?.records ?? [];

    return (
        <>
            <Head title={`${incharge.full_name} — ${t('Print preview')}`} />

            <div className="mx-auto max-w-5xl space-y-4 p-4 print:p-0">
                <div className="flex items-center justify-between gap-2 print:hidden">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/incharges/${incharge.id}`}>
                            <span className="inline-flex items-center">
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back')}
                            </span>
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            window.print();
                        }}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                </div>

                <div className="rounded-xl border p-4 print:border-0">
                    <div className="flex items-start gap-4">
                        {incharge.photo_path && (
                            <img
                                src={`/storage/${incharge.photo_path}`}
                                alt={incharge.full_name}
                                className="size-20 rounded-lg border object-cover print:hidden"
                            />
                        )}
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-foreground print:text-black">
                                {incharge.full_name}
                            </h1>
                            {hasValue(incharge.pno) && (
                                <p className="text-sm text-muted-foreground">
                                    {t('PNO')}: {incharge.pno}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {hasValue(incharge.rank) && (
                        <dl className="grid gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('Rank')}
                            </dt>
                            <dd>{identityValue(incharge.rank)}</dd>
                        </dl>
                        )}
                        {hasValue(incharge.designation) && (
                        <dl className="grid gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('Designation')}
                            </dt>
                            <dd>{identityValue(incharge.designation)}</dd>
                        </dl>
                        )}
                        {hasValue(incharge.mobile) && (
                        <dl className="grid gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('Mobile')}
                            </dt>
                            <dd>{identityValue(incharge.mobile)}</dd>
                        </dl>
                        )}
                        {hasValue(incharge.email) && (
                        <dl className="grid gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('Email')}
                            </dt>
                            <dd>{identityValue(incharge.email)}</dd>
                        </dl>
                        )}
                        <dl className="grid gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t('Status')}
                            </dt>
                            <dd>
                                {incharge.is_active ? t('Active') : t('Inactive')}
                            </dd>
                        </dl>
                    </div>

                    {hasValue(incharge.remarks) && (
                        <div className="mt-3">
                            <h2 className="mb-1 text-sm font-semibold">
                                {t('Remarks')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {identityValue(incharge.remarks)}
                            </p>
                        </div>
                    )}
                </div>

                <section className="rounded-xl border p-4 print:border-0">
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
                                        <th className="border p-2">{t('Team')}</th>
                                        <th className="border p-2">
                                            {t('Session')}
                                        </th>
                                        <th className="border p-2">
                                            {t('Sport')}
                                        </th>
                                        <th className="border p-2">
                                            {t('Unit')}
                                        </th>
                                        <th className="border p-2">
                                            {t('District')}
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
                                                {assignment.session?.name}
                                            </td>
                                            <td className="border p-2">
                                                {assignment.sport?.name}
                                            </td>
                                            <td className="border p-2">
                                                {assignment.unit?.name}
                                            </td>
                                            <td className="border p-2">
                                                {assignment.district?.name}
                                            </td>
                                            <td className="border p-2">
                                                {formatDate(assignment.assigned_at)}
                                            </td>
                                            <td className="border p-2">
                                                {formatDate(assignment.removed_at)}
                                            </td>
                                            <td className="border p-2">
                                                {assignment.is_current
                                                    ? t('Current')
                                                    : assignment.removal_reason ??
                                                      assignment.assignment_reason ??
                                                      ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border p-4 print:border-0">
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
                                        <th className="border p-2">{t('Title')}</th>
                                        <th className="border p-2">{t('Level')}</th>
                                        <th className="border p-2">{t('Date')}</th>
                                        <th className="border p-2">
                                            {t('Sport / Event')}
                                        </th>
                                        <th className="border p-2">
                                            {t('Medal')}
                                        </th>
                                        <th className="border p-2">
                                            {t('Position')}
                                        </th>
                                        <th className="border p-2">{t('Venue')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {achievementRecords.map((achievement) => (
                                        <tr key={achievement.id}>
                                            <td className="border p-2">
                                                {achievement.title}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.level ?? ''}
                                            </td>
                                            <td className="border p-2">
                                                {formatDate(
                                                    achievement.event_date ??
                                                        achievement.achieved_on,
                                                )}
                                            </td>
                                            <td className="border p-2">
                                                {[
                                                    achievement.sport_discipline,
                                                    achievement.event,
                                                    achievement.discipline,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ') || ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.medal_type ?? ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.position ?? ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.venue ?? ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border p-4 print:border-0">
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
                                        <th className="border p-2">
                                            {t('Document')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specialAchievementRecords.map((achievement) => (
                                        <tr key={achievement.id}>
                                            <td className="border p-2">
                                                {achievement.achievement_type}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.title}
                                            </td>
                                            <td className="border p-2">
                                                {formatDate(achievement.awarded_on)}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.issuing_authority ??
                                                    ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.place ?? ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.order_reference ??
                                                    ''}
                                            </td>
                                            <td className="border p-2">
                                                {achievement.order_document
                                                    ?.original_name ?? ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
