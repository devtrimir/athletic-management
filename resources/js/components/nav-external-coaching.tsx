import { Link, usePage } from '@inertiajs/react';
import {
    ClipboardCheck,
    Dumbbell,
    MapPinned,
    NotebookTabs,
    ShieldCheck,
    UserCog,
} from 'lucide-react';

import ExternalCoachController from '@/actions/App/Http/Controllers/ExternalCoachController';
import ExternalCoachingAssignmentController from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import ExternalCoachPerformanceUpdateController from '@/actions/App/Http/Controllers/ExternalCoachPerformanceUpdateController';
import ExternalTrainingAttendanceController from '@/actions/App/Http/Controllers/ExternalTrainingAttendanceController';
import TrainingVenueController from '@/actions/App/Http/Controllers/TrainingVenueController';
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

export function NavExternalCoaching() {
    const { t } = useTranslation();
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: Partial<Auth> };
    const permissions = new Set(auth?.permissions ?? []);

    const items = [
        {
            key: 'external-coaches',
            title: t('External coaches'),
            href: ExternalCoachController.index.url(),
            icon: UserCog,
            permission: 'external-coaches.view',
        },
        {
            key: 'training-venues',
            title: t('Training venues'),
            href: TrainingVenueController.index.url(),
            icon: MapPinned,
            permission: 'training-venues.view',
        },
        {
            key: 'external-coaching-assignments',
            title: t('Assignments'),
            href: ExternalCoachingAssignmentController.index.url(),
            icon: NotebookTabs,
            permission: 'external-coaching-assignments.view',
        },
        {
            key: 'external-training-attendances',
            title: t('Attendance review'),
            href: ExternalTrainingAttendanceController.index.url(),
            icon: ClipboardCheck,
            permission: 'external-training-attendances.view',
        },
        {
            key: 'external-coach-performance-updates',
            title: t('Performance review'),
            href: ExternalCoachPerformanceUpdateController.index.url(),
            icon: Dumbbell,
            permission: 'external-coach-performance-updates.view',
        },
    ].filter((item) => permissions.has(item.permission));

    if (items.length === 0) {
        return null;
    }

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="flex w-full items-center gap-2">
                <ShieldCheck className="size-4 shrink-0" />
                <span>{t('External coaching')}</span>
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
