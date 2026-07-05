import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    CalendarDays,
    Settings2,
    Shield,
    Trophy,
    UserCheck,
    UserRoundCheck,
    Users,
} from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { index as sportsCalendarIndex } from '@/actions/App/Http/Controllers/SportsCalendarController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import AppLogo from '@/components/app-logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { NavExternalCoaching } from '@/components/nav-external-coaching';
import { NavMain } from '@/components/nav-main';
import { NavReports } from '@/components/nav-reports';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { t } = useTranslation();
    const { state } = useSidebar();
    const { auth } = usePage().props as { auth?: Partial<Auth> };
    const permissions = new Set(auth?.permissions ?? []);

    function can(permission?: string): boolean {
        return permission === undefined || permissions.has(permission);
    }

    const mainNavItems: Array<NavItem & { permission?: string }> = [
        { title: t('Dashboard'), href: dashboard(), icon: LayoutGrid },
        {
            title: t('Team Prabhari'),
            href: InchargeController.index.url(),
            icon: UserRoundCheck,
            permission: 'incharges.view',
        },
        {
            title: t('Teams'),
            href: TeamController.index.url(),
            icon: Shield,
            permission: 'teams.view',
        },
        {
            title: t('Tournaments'),
            href: TournamentController.index.url(),
            icon: Trophy,
            permission: 'tournaments.view',
        },

        {
            title: t('Athletes'),
            href: MemberController.index.url(),
            icon: Users,
            permission: 'members.view',
        },
        {
            title: t('Coaches'),
            href: CoachController.index.url(),
            icon: UserCheck,
            permission: 'coaches.view',
        },
        {
            title: t('Sports calendars'),
            href: sportsCalendarIndex.url(),
            icon: CalendarDays,
            permission: 'sports-calendars.view',
        },
    ].filter((item) => can(item.permission));

    const adminNavItems: NavItem[] = [
        { title: t('Settings'), href: editProfile(), icon: Settings2 },
    ];

    return (
        <Sidebar collapsible="offcanvas" variant="inset">
            <SidebarHeader className="flex-row items-center gap-2">
                <SidebarMenu className="flex-1">
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarRail />

            <SidebarContent>
                <NavMain items={mainNavItems} groupLabel={t('Main')} />
                <NavExternalCoaching />
                <NavReports />
                <NavMain items={adminNavItems} groupLabel={t('Admin')} />
            </SidebarContent>

            <SidebarFooter>
                <div
                    className="flex items-center justify-between gap-3 px-2 pb-2"
                    data-test="sidebar-locale-switcher"
                >
                    {state === 'expanded' ? (
                        <>
                            <span className="text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
                                Language
                            </span>
                            <LocaleSwitcher className="border-sidebar-border bg-sidebar-accent/30" />
                        </>
                    ) : (
                        <LocaleSwitcher collapsed />
                    )}
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
