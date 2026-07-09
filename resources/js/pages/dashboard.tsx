import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Award,
    Medal,
    Shield,
    ShieldCheck,
    Swords,
    Trophy,
    Users,
    UsersRound,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type StatMetric = {
    label: string;
    value: number;
    href?: string;
    tone?: 'active' | 'bronze' | 'gold' | 'inactive' | 'silver' | 'total';
};

type Stats = {
    members?: {
        total: number;
        active: number;
        inactive: number;
        by_status: Record<string, number>;
        by_level: Record<string, number>;
        by_gender: Record<string, number>;
    };
    coaches?: {
        total: number;
        active: number;
        inactive: number;
    };
    teams?: {
        total: number;
        active: number;
        inactive: number;
        current_session: number;
    };
    tournaments?: {
        total: number;
        current_session: number;
    };
    medals?: {
        gold: number;
        silver: number;
        bronze: number;
        total: number;
    };
};

type DashboardPermissions = {
    viewMembers: boolean;
    viewCoaches: boolean;
    viewTeams: boolean;
    viewTournaments: boolean;
};

type CurrentSession = {
    id: number;
    name: string;
    start_year: number;
    end_year: number;
} | null;

type SessionOption = {
    id: number;
    name: string;
    start_year: number;
    end_year: number;
    is_current: boolean;
};

type Props = {
    stats: Stats;
    permissions: DashboardPermissions;
    currentSession: CurrentSession;
    selectedSession: CurrentSession;
    sessions: SessionOption[];
};

const LEVEL_LABELS: Record<string, string> = {
    ZONAL: 'ज़ोनल',
    NATIONAL: 'राष्ट्रीय',
    INTERNATIONAL: 'अंतरराष्ट्रीय',
    AIPSC: 'AIPSC',
};

const GENDER_LABELS: Record<string, string> = {
    M: 'पुरुष',
    F: 'महिला',
    O: 'अन्य',
};

const LEVEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#10b981'];
const ROSTER_COLORS = { active: '#10b981', inactive: '#94a3b8' };
const MEDAL_COLORS = { gold: '#f59e0b', silver: '#94a3b8', bronze: '#b45309' };

function MetricValue({ metric }: { metric: StatMetric }) {
    const toneClass = {
        active: 'text-emerald-600 dark:text-emerald-400',
        bronze: 'text-orange-700 dark:text-orange-300',
        gold: 'text-amber-600 dark:text-amber-300',
        inactive: 'text-muted-foreground',
        silver: 'text-slate-500 dark:text-slate-300',
        total: 'text-foreground',
    }[metric.tone ?? 'total'];

    const inner = (
        <div className="min-w-0 rounded-md border bg-background px-3 py-2">
            <p className="truncate text-xs text-muted-foreground">
                {metric.label}
            </p>
            <p
                className={`mt-1 text-xl font-semibold tracking-tight ${toneClass}`}
            >
                {metric.value.toLocaleString('hi-IN')}
            </p>
        </div>
    );

    if (metric.href) {
        return (
            <Link
                href={metric.href}
                className="rounded-md outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                {inner}
            </Link>
        );
    }

    return inner;
}

function StatCard({
    title,
    value,
    sub,
    icon: Icon,
    href,
    color,
}: {
    title: string;
    value: number | string;
    sub?: string;
    icon: React.ElementType;
    href?: string;
    color?: string;
}) {
    const inner = (
        <Card className="relative overflow-hidden py-4 transition-shadow hover:shadow-md">
            <CardContent className="px-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">
                            {value}
                        </p>
                        {sub && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {sub}
                            </p>
                        )}
                    </div>
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{
                            backgroundColor: color ? `${color}18` : undefined,
                        }}
                    >
                        <Icon className="h-5 w-5" style={{ color: color }} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }

    return inner;
}

function StatusSummaryCard({
    title,
    metrics,
    sub,
    icon: Icon,
    href,
    color,
    columns = 3,
}: {
    title: string;
    metrics: StatMetric[];
    sub?: string;
    icon: React.ElementType;
    href?: string;
    color?: string;
    columns?: 3 | 4;
}) {
    const metricGridClass =
        columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';

    const inner = (
        <Card className="relative overflow-hidden py-4 transition-shadow hover:shadow-md">
            <CardContent className="px-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                            {title}
                        </p>
                        {sub && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {sub}
                            </p>
                        )}
                    </div>
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{
                            backgroundColor: color ? `${color}18` : undefined,
                        }}
                    >
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                </div>
                <div className={`grid gap-2 ${metricGridClass}`}>
                    {metrics.map((metric) => (
                        <MetricValue key={metric.label} metric={metric} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }

    return inner;
}

function ChartPanel({
    title,
    description,
    icon: Icon,
    iconClassName,
    empty,
    emptyText,
    children,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    iconClassName: string;
    empty: boolean;
    emptyText: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className={`h-4 w-4 ${iconClassName}`} />
                    {title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent className="pb-4">
                {empty ? (
                    <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                        {emptyText}
                    </div>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    stats,
    permissions,
    currentSession,
    selectedSession,
    sessions,
}: Props) {
    const { t } = useTranslation();

    const sessionLabel = selectedSession ? selectedSession.name : null;
    const selectedSessionId = selectedSession ? String(selectedSession.id) : '';
    const isCurrentSession =
        selectedSession && currentSession
            ? selectedSession.id === currentSession.id
            : false;

    function updateSession(sessionId: string): void {
        router.get(
            dashboard.url(),
            { session_id: sessionId },
            { preserveScroll: true, preserveState: true },
        );
    }

    // -- Member level chart data
    const memberLevelData = Object.entries(stats.members?.by_level ?? {}).map(
        ([key, cnt], i) => ({
            name: LEVEL_LABELS[key] ?? key,
            count: cnt,
            fill: LEVEL_COLORS[i % LEVEL_COLORS.length],
        }),
    );

    // -- Gender chart data
    const memberGenderData = Object.entries(stats.members?.by_gender ?? {}).map(
        ([key, cnt], i) => ({
            name: GENDER_LABELS[key] ?? key,
            value: cnt,
            color: GENDER_COLORS[i % GENDER_COLORS.length],
        }),
    );

    // -- Medal bar data
    const medalBarData = stats.medals
        ? [
              {
                  name: t('Gold'),
                  count: stats.medals.gold,
                  fill: MEDAL_COLORS.gold,
              },
              {
                  name: t('Silver'),
                  count: stats.medals.silver,
                  fill: MEDAL_COLORS.silver,
              },
              {
                  name: t('Bronze'),
                  count: stats.medals.bronze,
                  fill: MEDAL_COLORS.bronze,
              },
          ]
        : [];

    const rosterHealthData = stats.members
        ? [
              {
                  name: t('Active roster'),
                  value: stats.members.active,
                  color: ROSTER_COLORS.active,
              },
              {
                  name: t('Inactive / not current'),
                  value: stats.members.inactive,
                  color: ROSTER_COLORS.inactive,
              },
          ]
        : [];
    const hasRosterHealthData = rosterHealthData.some((item) => item.value > 0);
    const hasMemberLevelData = memberLevelData.some((item) => item.count > 0);
    const hasMemberGenderData = memberGenderData.some((item) => item.value > 0);
    const hasMedalData = medalBarData.some((item) => item.count > 0);

    const hasAnyData =
        permissions.viewMembers ||
        permissions.viewCoaches ||
        permissions.viewTeams ||
        permissions.viewTournaments;

    const teamSessionFilter = selectedSession
        ? { query: { filter: { session_id: selectedSession.id } } }
        : undefined;
    const coachStatusLinks = {
        active: {
            query: {
                filter: {
                    status_scope: 'active',
                    has_active_assignment: 'true',
                },
            },
        },
        inactive: {
            query: {
                filter: {
                    status_scope: 'inactive',
                    has_active_assignment: 'false',
                },
            },
        },
    };

    return (
        <>
            <Head title={t('Dashboard')} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('Dashboard')}
                        </h1>
                        {sessionLabel && (
                            <p className="text-sm text-muted-foreground">
                                {isCurrentSession
                                    ? t('Current Session')
                                    : t('Selected Session')}
                                :{' '}
                                <span className="font-medium text-foreground">
                                    {sessionLabel}
                                </span>
                            </p>
                        )}
                    </div>

                    {sessions.length > 0 && (
                        <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
                            <label
                                htmlFor="dashboard-session"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                {t('Session')}
                            </label>
                            <Select
                                value={selectedSessionId}
                                onValueChange={updateSession}
                            >
                                <SelectTrigger
                                    id="dashboard-session"
                                    className="h-9 w-full sm:w-56"
                                >
                                    <SelectValue
                                        placeholder={t('Select session')}
                                    />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {sessions.map((session) => (
                                        <SelectItem
                                            key={session.id}
                                            value={String(session.id)}
                                        >
                                            {session.name}
                                            {session.is_current
                                                ? ` (${t('Current')})`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {!hasAnyData && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            {t('No data available')}
                        </CardContent>
                    </Card>
                )}

                {/* Summary stat cards */}
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {permissions.viewMembers && stats.members && (
                        <StatusSummaryCard
                            title={t('Members')}
                            metrics={[
                                {
                                    label: t('Total'),
                                    value: stats.members.total,
                                    href: MemberController.index.url(),
                                    tone: 'total',
                                },
                                {
                                    label: t('Active'),
                                    value: stats.members.active,
                                    href: MemberController.index.url({
                                        query: {
                                            filter: {
                                                status_scope: 'active',
                                                current_status: 'ACTIVE',
                                            },
                                        },
                                    }),
                                    tone: 'active',
                                },
                                {
                                    label: t('Inactive'),
                                    value: stats.members.inactive,
                                    href: MemberController.index.url({
                                        query: {
                                            filter: {
                                                status_scope: 'inactive',
                                            },
                                        },
                                    }),
                                    tone: 'inactive',
                                },
                            ]}
                            icon={Users}
                            color="#6366f1"
                        />
                    )}
                    {permissions.viewCoaches && stats.coaches && (
                        <StatusSummaryCard
                            title={t('Coaches')}
                            metrics={[
                                {
                                    label: t('Total'),
                                    value: stats.coaches.total,
                                    href: CoachController.index.url(),
                                    tone: 'total',
                                },
                                {
                                    label: t('Active'),
                                    value: stats.coaches.active,
                                    href: CoachController.index.url(
                                        coachStatusLinks.active,
                                    ),
                                    tone: 'active',
                                },
                                {
                                    label: t('Inactive'),
                                    value: stats.coaches.inactive,
                                    href: CoachController.index.url(
                                        coachStatusLinks.inactive,
                                    ),
                                    tone: 'inactive',
                                },
                            ]}
                            sub={
                                sessionLabel
                                    ? t(
                                          'Active means assigned in selected session',
                                      )
                                    : undefined
                            }
                            icon={UsersRound}
                            color="#8b5cf6"
                        />
                    )}
                    {permissions.viewTeams && stats.teams && (
                        <StatusSummaryCard
                            title={t('Teams')}
                            metrics={[
                                {
                                    label: t('Total'),
                                    value: stats.teams.total,
                                    href: TeamController.index.url(teamSessionFilter),
                                    tone: 'total',
                                },
                                {
                                    label: t('Active'),
                                    value: stats.teams.active,
                                    href: TeamController.index.url({
                                        query: {
                                            filter: {
                                                ...teamSessionFilter?.query.filter,
                                                is_active: true,
                                            },
                                        },
                                    }),
                                    tone: 'active',
                                },
                                {
                                    label: t('Inactive'),
                                    value: stats.teams.inactive,
                                    href: TeamController.index.url({
                                        query: {
                                            filter: {
                                                ...teamSessionFilter?.query.filter,
                                                is_active: false,
                                            },
                                        },
                                    }),
                                    tone: 'inactive',
                                },
                            ]}
                            sub={
                                sessionLabel
                                    ? `${stats.teams.current_session} ${t('selected session')}`
                                    : undefined
                            }
                            icon={Shield}
                            color="#0ea5e9"
                        />
                    )}
                    {permissions.viewTournaments && stats.tournaments && (
                        <StatCard
                            title={t('Tournaments')}
                            value={stats.tournaments.total.toLocaleString(
                                'hi-IN',
                            )}
                            sub={
                                sessionLabel
                                    ? `${stats.tournaments.current_session} ${t('selected session')}`
                                    : undefined
                            }
                            icon={Trophy}
                            href={TournamentController.index.url()}
                            color="#f59e0b"
                        />
                    )}
                    {permissions.viewTournaments && stats.medals && (
                        <StatusSummaryCard
                            title={t('Medals')}
                            metrics={[
                                {
                                    label: t('Total'),
                                    value: stats.medals.total,
                                    tone: 'total',
                                },
                                {
                                    label: t('Gold'),
                                    value: stats.medals.gold,
                                    tone: 'gold',
                                },
                                {
                                    label: t('Silver'),
                                    value: stats.medals.silver,
                                    tone: 'silver',
                                },
                                {
                                    label: t('Bronze'),
                                    value: stats.medals.bronze,
                                    tone: 'bronze',
                                },
                            ]}
                            icon={Medal}
                            color="#f59e0b"
                            columns={4}
                        />
                    )}
                </div>

                {/* Current session insights */}
                {(permissions.viewMembers || permissions.viewTournaments) && (
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-base font-semibold">
                                {isCurrentSession
                                    ? t('Current Session Insights')
                                    : selectedSession
                                      ? t('Selected Session Insights')
                                      : t('Dashboard Insights')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {selectedSession
                                    ? t(
                                          'Operational view for the selected sports session.',
                                      )
                                    : t(
                                          'No current session is configured; charts use available totals.',
                                      )}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                            {permissions.viewMembers && stats.members && (
                                <ChartPanel
                                    title={t('Roster Health')}
                                    description={t(
                                        'Selected session active roster',
                                    )}
                                    icon={Activity}
                                    iconClassName="text-emerald-500"
                                    empty={!hasRosterHealthData}
                                    emptyText={t('No member roster data yet')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={180}
                                    >
                                        <PieChart>
                                            <Pie
                                                data={rosterHealthData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={44}
                                                outerRadius={72}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {rosterHealthData.map(
                                                    (entry) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.color}
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v) => [
                                                    (
                                                        v as number
                                                    ).toLocaleString('hi-IN'),
                                                    '',
                                                ]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {rosterHealthData.map((item) => (
                                            <div
                                                key={item.name}
                                                className="flex items-center gap-1.5 text-xs"
                                            >
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            item.color,
                                                    }}
                                                />
                                                <span className="truncate text-muted-foreground">
                                                    {item.name}
                                                </span>
                                                <span className="font-semibold">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </ChartPanel>
                            )}

                            {permissions.viewMembers && stats.members && (
                                <ChartPanel
                                    title={t('Active Members by Level')}
                                    description={t(
                                        'Selected session active roster',
                                    )}
                                    icon={Swords}
                                    iconClassName="text-violet-500"
                                    empty={!hasMemberLevelData}
                                    emptyText={t(
                                        'No active member level data yet',
                                    )}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
                                        <BarChart
                                            data={memberLevelData}
                                            barSize={28}
                                            margin={{ left: -20 }}
                                        >
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                cursor={{
                                                    fill: 'hsl(var(--accent))',
                                                }}
                                                formatter={(v) => [
                                                    (
                                                        v as number
                                                    ).toLocaleString('hi-IN'),
                                                    t('Members'),
                                                ]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                            <Bar
                                                dataKey="count"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {memberLevelData.map(
                                                    (entry) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.fill}
                                                        />
                                                    ),
                                                )}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                            )}

                            {permissions.viewMembers && stats.members && (
                                <ChartPanel
                                    title={t('Active Members by Gender')}
                                    description={t(
                                        'Selected session active roster',
                                    )}
                                    icon={ShieldCheck}
                                    iconClassName="text-blue-500"
                                    empty={!hasMemberGenderData}
                                    emptyText={t(
                                        'No active member gender data yet',
                                    )}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={180}
                                    >
                                        <PieChart>
                                            <Pie
                                                data={memberGenderData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={68}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {memberGenderData.map(
                                                    (entry) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.color}
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v) => [
                                                    (
                                                        v as number
                                                    ).toLocaleString('hi-IN'),
                                                    '',
                                                ]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-2 flex flex-wrap justify-center gap-4">
                                        {memberGenderData.map((item) => (
                                            <div
                                                key={item.name}
                                                className="flex items-center gap-1.5 text-xs"
                                            >
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            item.color,
                                                    }}
                                                />
                                                <span className="text-muted-foreground">
                                                    {item.name}
                                                </span>
                                                <span className="font-semibold">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </ChartPanel>
                            )}

                            {permissions.viewTournaments && stats.medals && (
                                <ChartPanel
                                    title={
                                        isCurrentSession
                                            ? t('Current Session Medals')
                                            : selectedSession
                                              ? t('Selected Session Medals')
                                              : t('Medal Summary')
                                    }
                                    description={
                                        selectedSession
                                            ? t(
                                                  'Medals recorded in the selected session',
                                              )
                                            : t('All recorded medals')
                                    }
                                    icon={Award}
                                    iconClassName="text-amber-500"
                                    empty={!hasMedalData}
                                    emptyText={t('No medal data yet')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
                                        <BarChart
                                            data={medalBarData}
                                            barSize={40}
                                            margin={{ left: -20 }}
                                        >
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                cursor={{
                                                    fill: 'hsl(var(--accent))',
                                                }}
                                                formatter={(v) => [
                                                    (
                                                        v as number
                                                    ).toLocaleString('hi-IN'),
                                                    '',
                                                ]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                            <Bar
                                                dataKey="count"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {medalBarData.map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.fill}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                            )}
                        </div>
                    </section>
                )}

                {/* Quick links */}
                <div>
                    <Separator className="mb-4" />
                    <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {t('Quick Links')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {permissions.viewMembers && (
                            <Link
                                href={MemberController.index.url()}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <Users className="h-3.5 w-3.5" />
                                {t('Members')}
                            </Link>
                        )}
                        {permissions.viewCoaches && (
                            <Link
                                href={CoachController.index.url(
                                    coachStatusLinks.active,
                                )}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <UsersRound className="h-3.5 w-3.5" />
                                {t('Coaches')}
                            </Link>
                        )}
                        {permissions.viewTeams && (
                            <Link
                                href={TeamController.index.url()}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <Shield className="h-3.5 w-3.5" />
                                {t('Teams')}
                            </Link>
                        )}
                        {permissions.viewTournaments && (
                            <Link
                                href={TournamentController.index.url()}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <Trophy className="h-3.5 w-3.5" />
                                {t('Tournaments')}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
