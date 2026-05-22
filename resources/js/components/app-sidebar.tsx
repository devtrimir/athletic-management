import { Link } from '@inertiajs/react';
import { Building2, CalendarDays, LayoutGrid, MapPin, Medal, Trophy } from 'lucide-react';
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
import { dashboard } from '@/routes';
import { index as sessionsIndex } from '@/routes/sessions';
import { index as sportsIndex } from '@/routes/sports';
import { index as unitsIndex } from '@/routes/units';
import { index as districtsIndex } from '@/routes/districts';
import { index as tournamentTiersIndex } from '@/routes/tournament-tiers';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const referenceDataNavItems: NavItem[] = [
    {
        title: 'Sessions',
        href: sessionsIndex(),
        icon: CalendarDays,
    },
    {
        title: 'Sports',
        href: sportsIndex(),
        icon: Trophy,
    },
    {
        title: 'Units',
        href: unitsIndex(),
        icon: Building2,
    },
    {
        title: 'Districts',
        href: districtsIndex(),
        icon: MapPin,
    },
    {
        title: 'Tournament Tiers',
        href: tournamentTiersIndex(),
        icon: Medal,
    },
];

export function AppSidebar() {
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
                <NavMain items={mainNavItems} />
                <NavMain items={referenceDataNavItems} groupLabel="Reference Data" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
