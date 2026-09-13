import { Link } from '@inertiajs/react';
import { Award, ExternalLink, UserRound } from 'lucide-react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export interface PlayerCoachBadgeProps {
    memberId?: number | null;
    memberName?: string | null;
    pno?: string | null;
    variant?: 'badge' | 'chip' | 'compact';
    showLink?: boolean;
    className?: string;
}

export function PlayerCoachBadge({
    memberId,
    memberName,
    pno,
    variant = 'badge',
    showLink = true,
    className,
}: PlayerCoachBadgeProps) {
    const { t } = useTranslation();

    const label = t('Player-Coach');

    const badgeContent = (
        <>
            {variant === 'chip' ? (
                <UserRound className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
                <Award className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{label}</span>
            {variant === 'chip' && (memberName || pno) && (
                <span className="font-normal text-muted-foreground">
                    ({[memberName, pno ? `${t('PNO')}: ${pno}` : null].filter(Boolean).join(' · ')})
                </span>
            )}
            {showLink && memberId && variant === 'chip' && (
                <ExternalLink className="ml-0.5 h-2.5 w-2.5 opacity-70" />
            )}
        </>
    );

    const baseClasses = cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors',
        'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        'dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
        variant === 'compact' ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-xs',
        className,
    );

    if (showLink && memberId) {
        return (
            <Link
                href={MemberController.show.url(memberId)}
                onClick={(e) => e.stopPropagation()}
                title={t('View athlete profile')}
                className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md"
            >
                <Badge variant="outline" className={baseClasses}>
                    {badgeContent}
                </Badge>
            </Link>
        );
    }

    return (
        <Badge variant="outline" className={baseClasses}>
            {badgeContent}
        </Badge>
    );
}

export default PlayerCoachBadge;
