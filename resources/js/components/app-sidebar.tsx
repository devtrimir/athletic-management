import { Link } from '@inertiajs/react';
import { BarChart2, LayoutGrid, Settings2, UserCheck, Users } from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import ReportsMedalsController from '@/actions/App/Http/Controllers/ReportsMedalsController';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
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
        { title: t('Reports'), href: ReportsMedalsController.url(), icon: BarChart2 },
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
                <NavMain items={adminNavItems} groupLabel={t('Admin')} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
