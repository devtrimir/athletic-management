import { Link } from '@inertiajs/react';
import { Building2, CalendarDays, MapPin, Medal, Monitor, Shield, Trophy, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { index as sessionsIndex } from '@/routes/sessions';
import { index as sportsIndex } from '@/routes/sports';
import { index as unitsIndex } from '@/routes/units';
import { index as districtsIndex } from '@/routes/districts';
import { index as tournamentTiersIndex } from '@/routes/tournament-tiers';
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

    const accountNavItems: NavItem[] = [
        { title: t('Profile'), href: edit(), icon: User },
        { title: t('Security'), href: editSecurity(), icon: Shield },
        { title: t('Appearance'), href: editAppearance(), icon: Monitor },
    ];

    const referenceDataNavItems: NavItem[] = [
        { title: t('Sessions'), href: sessionsIndex(), icon: CalendarDays },
        { title: t('Sports'), href: sportsIndex(), icon: Trophy },
        { title: t('Units'), href: unitsIndex(), icon: Building2 },
        { title: t('Districts'), href: districtsIndex(), icon: MapPin },
        { title: t('Tournament Tiers'), href: tournamentTiersIndex(), icon: Medal },
    ];

    return (
        <div className="px-4 py-6">
            <Heading
                title={t('Settings')}
                description={t('Manage your profile and account settings')}
            />

            <div className="flex flex-col lg:flex-row lg:gap-10">
                <aside className="w-full lg:w-52 shrink-0">
                    <nav className="flex flex-col gap-0.5" aria-label={t('Settings')}>
                        <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('Account')}
                        </p>
                        {accountNavItems.map((item) => (
                            <NavLink
                                key={item.href}
                                item={item}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                        <p className="mt-4 px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('Reference Data')}
                        </p>
                        {referenceDataNavItems.map((item) => (
                            <NavLink
                                key={item.href}
                                item={item}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="space-y-10">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
