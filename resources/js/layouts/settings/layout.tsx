import { Link, usePage } from '@inertiajs/react';
import {
    BriefcaseIcon,
    Building2,
    CalendarDays,
    LocateIcon,
    Medal,
    Monitor,
    Shield,
    ShieldIcon,
    Trophy,
    User,
    Users,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTranslation } from '@/hooks/use-translation';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { index as designationsIndex } from '@/routes/designations';
import { index as districtsIndex } from '@/routes/districts';
import { index as nisMastersIndex } from '@/routes/nis-masters';
import { edit } from '@/routes/profile';
import { index as ranksIndex } from '@/routes/ranks';
import { index as rolesIndex } from '@/routes/roles';
import { edit as editSecurity } from '@/routes/security';
import { index as sessionsIndex } from '@/routes/sessions';
import { index as sportsIndex } from '@/routes/sports';
import { index as tournamentTiersIndex } from '@/routes/tournament-tiers';
import { index as unitsIndex } from '@/routes/units';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
    return (
        <Link
            href={item.href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
        >
            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
            {item.title}
        </Link>
    );
}

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const canManageUsers = auth.permissions.includes('users.manage');

    const accountNavItems: NavItem[] = [
        { title: t('Profile'), href: edit(), icon: User },
        { title: t('Security'), href: editSecurity(), icon: Shield },
        { title: t('Appearance'), href: editAppearance(), icon: Monitor },
    ];

    const referenceDataNavItems: NavItem[] = [
        { title: t('Sessions'), href: sessionsIndex(), icon: CalendarDays },
        { title: t('Sports'), href: sportsIndex(), icon: Trophy },
        { title: t('Units'), href: unitsIndex(), icon: Building2 },
        { title: t('Districts'), href: districtsIndex(), icon: LocateIcon },
        { title: t('Ranks'), href: ranksIndex(), icon: ShieldIcon },
        {
            title: t('Designations'),
            href: designationsIndex(),
            icon: BriefcaseIcon,
        },
        {
            title: t('Tournament Tiers'),
            href: tournamentTiersIndex(),
            icon: Medal,
        },
        { title: t('NIS Masters'), href: nisMastersIndex(), icon: Medal },
    ];

    const adminNavItems: NavItem[] = [
        { title: t('Users'), href: usersIndex(), icon: Users },
        { title: t('Roles'), href: rolesIndex(), icon: Shield },
    ];

    return (
        <div className="px-4 py-6">
            <Heading
                title={t('Settings')}
                description={t('Manage your profile and account settings')}
            />

            <div className="flex flex-col lg:flex-row lg:gap-10">
                <aside className="w-full shrink-0 lg:w-52">
                    <nav
                        className="flex flex-col gap-0.5"
                        aria-label={t('Settings')}
                    >
                        <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            {t('Account')}
                        </p>
                        {accountNavItems.map((item) => (
                            <NavLink
                                key={toUrl(item.href)}
                                item={item}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                        <p className="mt-4 px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            {t('Reference Data')}
                        </p>
                        {referenceDataNavItems.map((item) => (
                            <NavLink
                                key={toUrl(item.href)}
                                item={item}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                        {canManageUsers && (
                            <>
                                <p className="mt-4 px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    {t('Administration')}
                                </p>
                                {adminNavItems.map((item) => (
                                    <NavLink
                                        key={toUrl(item.href)}
                                        item={item}
                                        isActive={isCurrentOrParentUrl(
                                            item.href,
                                        )}
                                    />
                                ))}
                            </>
                        )}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="space-y-10">{children}</section>
                </div>
            </div>
        </div>
    );
}
