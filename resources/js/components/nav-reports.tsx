import { Link } from '@inertiajs/react';
import { Award, BarChart2, ChevronDown, ClipboardList, Hash, Medal, Star, TrendingUp, UserMinus, UserPlus } from 'lucide-react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import ReportsMedalsController from '@/actions/App/Http/Controllers/ReportsMedalsController';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTranslation } from '@/hooks/use-translation';

// Paths: medals uses the dedicated controller; all others use ReportController.show.
const REPORT_PATHS = {
    medals: ReportsMedalsController.definition.url,
    medalsByMember: ReportController.show('medals-by-member').url,
    achievementHistory: ReportController.show('achievement-history').url,
    teamRoster: ReportController.show('team-roster').url,
    resignationDismissal: ReportController.show('resignation-dismissal-log').url,
    unitHeadcount: ReportController.show('unit-headcount').url,
    playerLevelSummary: ReportController.show('player-level-summary').url,
    newJoiners: ReportController.show('new-joiners').url,
} as const;

export function NavReports() {
    const { t } = useTranslation();
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    const items = [
        { key: 'medals', title: t('Medal Tally'), href: REPORT_PATHS.medals, icon: Medal },
        { key: 'medals-by-member', title: t('Medals by Member'), href: REPORT_PATHS.medalsByMember, icon: Award },
        { key: 'achievement-history', title: t('Achievement History'), href: REPORT_PATHS.achievementHistory, icon: Star },
        { key: 'team-roster', title: t('Team Roster'), href: REPORT_PATHS.teamRoster, icon: ClipboardList },
        {
            key: 'resignation-dismissal',
            title: t('Resignation / Dismissal Log'),
            href: REPORT_PATHS.resignationDismissal,
            icon: UserMinus,
        },
        { key: 'unit-headcount', title: t('Unit Headcount'), href: REPORT_PATHS.unitHeadcount, icon: Hash },
        {
            key: 'player-level-summary',
            title: t('Player Level Summary'),
            href: REPORT_PATHS.playerLevelSummary,
            icon: TrendingUp,
        },
        { key: 'new-joiners', title: t('New Joiners'), href: REPORT_PATHS.newJoiners, icon: UserPlus },
    ];

    return (
        <SidebarGroup className="px-2 py-0">
            <Collapsible defaultOpen={isCurrentOrParentUrl('/reports')}>
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="group/reports flex w-full items-center gap-2">
                        <BarChart2 className="size-4 shrink-0" />
                        <span>{t('Reports')}</span>
                        <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/reports:rotate-180" />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
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
                </CollapsibleContent>
            </Collapsible>
        </SidebarGroup>
    );
}
