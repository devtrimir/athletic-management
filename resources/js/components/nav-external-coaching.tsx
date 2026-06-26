import { Link } from '@inertiajs/react';
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

export function NavExternalCoaching() {
    const { t } = useTranslation();
    const { isCurrentUrl } = useCurrentUrl();

    const items = [
        {
            key: 'external-coaches',
            title: t('External coaches'),
            href: ExternalCoachController.index.url(),
            icon: UserCog,
        },
        {
            key: 'training-venues',
            title: t('Training venues'),
            href: TrainingVenueController.index.url(),
            icon: MapPinned,
        },
        {
            key: 'external-coaching-assignments',
            title: t('Assignments'),
            href: ExternalCoachingAssignmentController.index.url(),
            icon: NotebookTabs,
        },
        {
            key: 'external-training-attendances',
            title: t('Attendance review'),
            href: ExternalTrainingAttendanceController.index.url(),
            icon: ClipboardCheck,
        },
        {
            key: 'external-coach-performance-updates',
            title: t('Performance review'),
            href: ExternalCoachPerformanceUpdateController.index.url(),
            icon: Dumbbell,
        },
    ];

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
