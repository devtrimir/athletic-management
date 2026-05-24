import { Link } from '@inertiajs/react';
import { LayoutGrid, Settings2, Shield, Trophy, UserCheck, Users } from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import TournamentController from '@/actions/App/Http/Controllers/TournamentController';
import AppLogo from '@/components/app-logo';
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
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { t } = useTranslation();

    const mainNavItems: NavItem[] = [
        { title: t('Dashboard'), href: dashboard(), icon: LayoutGrid },
        { title: t('Athletes'), href: MemberController.index.url(), icon: Users },
        { title: t('Coaches'), href: CoachController.index.url(), icon: UserCheck },
        { title: t('Teams'), href: TeamController.index.url(), icon: Shield },
        { title: t('Tournaments'), href: TournamentController.index.url(), icon: Trophy },
    ];

    const adminNavItems: NavItem[] = [
        { title: t('Settings'), href: editProfile(), icon: Settings2 },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} groupLabel={t('Main')} />
                <NavReports />
                <NavMain items={adminNavItems} groupLabel={t('Admin')} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
