import { Link } from '@inertiajs/react';
import { LayoutGrid, Settings2, Shield, Trophy, UserCheck, Users } from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import AppLogo from '@/components/app-logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
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
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { t } = useTranslation();
    const { state } = useSidebar();

    const mainNavItems: NavItem[] = [
        { title: t('Dashboard'), href: dashboard(), icon: LayoutGrid },
        { title: t('Teams'), href: TeamController.index.url(), icon: Shield },
        { title: t('Tournaments'), href: TournamentController.index.url(), icon: Trophy },
        { title: t('Athletes'), href: MemberController.index.url(), icon: Users },
        { title: t('Coaches'), href: CoachController.index.url(), icon: UserCheck },

    ];

    const adminNavItems: NavItem[] = [
        { title: t('Settings'), href: editProfile(), icon: Settings2 },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
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
                            <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
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
