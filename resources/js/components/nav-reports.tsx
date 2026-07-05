import { Link, usePage } from '@inertiajs/react';
import {
    Award,
    BarChart2,
    ClipboardList,
    Hash,
    Medal,
    Star,
    TrendingUp,
    UserMinus,
    UserPlus,
} from 'lucide-react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import ReportsMedalsController from '@/actions/App/Http/Controllers/ReportsMedalsController';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTranslation } from '@/hooks/use-translation';
import type { Auth } from '@/types';

// Paths: medals uses the dedicated controller; all others use ReportController.show.
const REPORT_PATHS = {
    medals: ReportsMedalsController.definition.url,
    medalsByMember: ReportController.show('medals-by-member').url,
    playerPerformanceRanking: ReportController.show(
        'player-performance-ranking',
    ).url,
    achievementHistory: ReportController.show('achievement-history').url,
    teamRoster: ReportController.show('team-roster').url,
    resignationDismissal: ReportController.show('resignation-dismissal-log')
        .url,
    unitHeadcount: ReportController.show('unit-headcount').url,
    playerLevelSummary: ReportController.show('player-level-summary').url,
    newJoiners: ReportController.show('new-joiners').url,
} as const;

export function NavReports() {
    const { t } = useTranslation();
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: Partial<Auth> };

    if (!auth?.permissions?.includes('reports.view')) {
        return null;
    }

    const items = [
        {
            key: 'medals',
            title: t('Medal Tally'),
            href: REPORT_PATHS.medals,
            icon: Medal,
        },
        {
            key: 'medals-by-member',
            title: t('Medals by Member'),
            href: REPORT_PATHS.medalsByMember,
            icon: Award,
        },
        {
            key: 'player-performance-ranking',
            title: t('Player Performance Ranking'),
            href: REPORT_PATHS.playerPerformanceRanking,
            icon: TrendingUp,
        },
        {
            key: 'achievement-history',
            title: t('Achievement History'),
            href: REPORT_PATHS.achievementHistory,
            icon: Star,
        },
        {
            key: 'team-roster',
            title: t('Team Roster'),
            href: REPORT_PATHS.teamRoster,
            icon: ClipboardList,
        },
        {
            key: 'resignation-dismissal',
            title: t('Resignation / Dismissal Log'),
            href: REPORT_PATHS.resignationDismissal,
            icon: UserMinus,
        },
        {
            key: 'unit-headcount',
            title: t('Unit Headcount'),
            href: REPORT_PATHS.unitHeadcount,
            icon: Hash,
        },
        {
            key: 'player-level-summary',
            title: t('Player Level Summary'),
            href: REPORT_PATHS.playerLevelSummary,
            icon: TrendingUp,
        },
        {
            key: 'new-joiners',
            title: t('New Joiners'),
            href: REPORT_PATHS.newJoiners,
            icon: UserPlus,
        },
    ];

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="flex w-full items-center gap-2">
                <BarChart2 className="size-4 shrink-0" />
                <span>{t('Reports')}</span>
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href} prefetch>
                                <item.icon />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
