import { Head, Link } from '@inertiajs/react';
import {
    Award,
    Medal,
    Shield,
    ShieldCheck,
    Swords,
    Trophy,
    Users,
    UsersRound,
} from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type Stats = {
    members?: {
        total: number;
        active: number;
        by_status: Record<string, number>;
        by_level: Record<string, number>;
        by_gender: Record<string, number>;
    };
    coaches?: {
        total: number;
        linked: number;
    };
    teams?: {
        total: number;
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

type Props = {
    stats: Stats;
    permissions: DashboardPermissions;
    currentSession: CurrentSession;
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'सक्रिय',
    RESIGNED: 'त्यागपत्र',
    DISMISSED: 'बर्खास्त',
    DECEASED: 'मृत',
    RETIRED: 'सेवानिवृत्त',
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

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#22c55e',
    RESIGNED: '#f59e0b',
    DISMISSED: '#ef4444',
    DECEASED: '#6b7280',
    RETIRED: '#3b82f6',
};

const LEVEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#10b981'];
const MEDAL_COLORS = { gold: '#f59e0b', silver: '#94a3b8', bronze: '#b45309' };

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
                        <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
                        {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
                    </div>
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: color ? `${color}18` : undefined }}
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

export default function Dashboard({ stats, permissions, currentSession }: Props) {
    const { t } = useTranslation();

    const sessionLabel = currentSession ? currentSession.name : null;

    // -- Member status chart data
    const memberStatusData = Object.entries(stats.members?.by_status ?? {}).map(([key, cnt]) => ({
        name: STATUS_LABELS[key] ?? key,
        value: cnt,
        color: STATUS_COLORS[key] ?? '#94a3b8',
    }));

    // -- Member level chart data
    const memberLevelData = Object.entries(stats.members?.by_level ?? {}).map(([key, cnt], i) => ({
        name: LEVEL_LABELS[key] ?? key,
        count: cnt,
        fill: LEVEL_COLORS[i % LEVEL_COLORS.length],
    }));

    // -- Gender chart data
    const memberGenderData = Object.entries(stats.members?.by_gender ?? {}).map(([key, cnt], i) => ({
        name: GENDER_LABELS[key] ?? key,
        value: cnt,
        color: GENDER_COLORS[i % GENDER_COLORS.length],
    }));

    // -- Medal bar data
    const medalBarData = stats.medals
        ? [
              { name: t('Gold'), count: stats.medals.gold, fill: MEDAL_COLORS.gold },
              { name: t('Silver'), count: stats.medals.silver, fill: MEDAL_COLORS.silver },
              { name: t('Bronze'), count: stats.medals.bronze, fill: MEDAL_COLORS.bronze },
          ]
        : [];

    const hasAnyData =
        permissions.viewMembers || permissions.viewCoaches || permissions.viewTeams || permissions.viewTournaments;

    return (
        <>
            <Head title={t('Dashboard')} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">{t('Dashboard')}</h1>
                    {sessionLabel && (
                        <p className="text-sm text-muted-foreground">
                            {t('Current Session')}: <span className="font-medium text-foreground">{sessionLabel}</span>
                        </p>
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
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {permissions.viewMembers && stats.members && (
                        <>
                            <StatCard
                                title={t('Active Members')}
                                value={stats.members.active.toLocaleString('hi-IN')}
                                sub={`${stats.members.active.toLocaleString('hi-IN')} ${t('Active')}`}
                                icon={Users}
                                href={MemberController.index.url()}
                                color="#6366f1"
                            />
                        </>
                    )}
                    {permissions.viewCoaches && stats.coaches && (
                        <StatCard
                            title={t('Total Coaches')}
                            value={stats.coaches.total.toLocaleString('hi-IN')}
                            sub={`${stats.coaches.linked.toLocaleString('hi-IN')} ${t('linked to members')}`}
                            icon={UsersRound}
                            href={CoachController.index.url()}
                            color="#8b5cf6"
                        />
                    )}
                    {permissions.viewTeams && stats.teams && (
                        <StatCard
                            title={t('Teams')}
                            value={stats.teams.total.toLocaleString('hi-IN')}
                            sub={sessionLabel ? `${stats.teams.current_session} ${t('this session')}` : undefined}
                            icon={Shield}
                            href={TeamController.index.url()}
                            color="#0ea5e9"
                        />
                    )}
                    {permissions.viewTournaments && stats.tournaments && (
                        <StatCard
                            title={t('Tournaments')}
                            value={stats.tournaments.total.toLocaleString('hi-IN')}
                            sub={
                                sessionLabel
                                    ? `${stats.tournaments.current_session} ${t('this session')}`
                                    : undefined
                            }
                            icon={Trophy}
                            href={TournamentController.index.url()}
                            color="#f59e0b"
                        />
                    )}
                    {permissions.viewTournaments && stats.medals && (
                        <StatCard
                            title={t('Total Medals')}
                            value={stats.medals.total.toLocaleString('hi-IN')}
                            sub={`${stats.medals.gold} ${t('Gold')} · ${stats.medals.silver} ${t('Silver')} · ${stats.medals.bronze} ${t('Bronze')}`}
                            icon={Medal}
                            color="#f59e0b"
                        />
                    )}
                </div>

                {/* Charts row */}
                {(permissions.viewMembers || permissions.viewTournaments) && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Member Status — pie */}


                        {/* Player Level — bar */}
                        {permissions.viewMembers && stats.members && memberLevelData.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                        <Swords className="h-4 w-4 text-violet-500" />
                                        {t('Player Level')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={memberLevelData} barSize={28} margin={{ left: -20 }}>
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
                                                cursor={{ fill: 'hsl(var(--accent))' }}
                                                formatter={(v) => [(v as number).toLocaleString('hi-IN'), t('Members')]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {memberLevelData.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Medals — bar */}
                        {permissions.viewTournaments && medalBarData.length > 0 && stats.medals && stats.medals.total > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                        <Award className="h-4 w-4 text-amber-500" />
                                        {t('Medals Won')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={medalBarData} barSize={40} margin={{ left: -20 }}>
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
                                                cursor={{ fill: 'hsl(var(--accent))' }}
                                                formatter={(v) => [(v as number).toLocaleString('hi-IN'), '']}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    border: '1px solid hsl(var(--border))',
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {medalBarData.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Gender breakdown */}
                        {permissions.viewMembers && stats.members && memberGenderData.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                        {t('Gender Distribution')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <ResponsiveContainer width="100%" height={180}>
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
                                                {memberGenderData.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v) => [(v as number).toLocaleString('hi-IN'), '']}
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
                                            <div key={item.name} className="flex items-center gap-1.5 text-xs">
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-muted-foreground">{item.name}</span>
                                                <span className="font-semibold">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Quick links */}
                <div>
                    <Separator className="mb-4" />
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                                href={CoachController.index.url()}
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
