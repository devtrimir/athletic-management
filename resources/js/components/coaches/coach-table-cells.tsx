import { Link } from '@inertiajs/react';
import { IdCard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { CoachAvatar } from '@/components/coaches/coach-avatar';
import PlayerCoachBadge from '@/components/player-coach-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export const coachTableClass =
    'w-full min-w-[1140px] table-fixed border-separate border-spacing-0 text-xs';

export const coachHeadCellClass =
    'h-7 border-r border-b border-border/45 bg-card px-1.5 text-[11px] last:border-r-0';

export const coachCellClass =
    'overflow-hidden border-r border-b border-border/45 px-1.5 py-0.5 align-middle text-xs break-words last:border-r-0';

export const teamGroupEndClass = 'border-b-2 border-b-primary/30';

/** Widths (px) for the leading select / S.No / Coach columns, shared by both listing tables. */
export const LEADING_COL_WIDTH = {
    select: 36,
    sno: 44,
    coach: 240,
} as const;

/** Left offsets (px) for the sticky select / S.No / Coach columns, derived from their widths. */
export const STICKY_LEFT = {
    select: 0,
    sno: LEADING_COL_WIDTH.select,
    coach: LEADING_COL_WIDTH.select + LEADING_COL_WIDTH.sno,
} as const;

/** Select + S.No columns — always the first two, in both tables. */
export function LeadingColgroup() {
    return (
        <>
            <col className="w-9" />
            <col className="w-11" />
        </>
    );
}

/** The Coach identity column's own width, placed wherever it falls in a table's column order. */
export function CoachColgroupCol() {
    return <col className="w-60" />;
}

export const stickyHeadCellClass = 'sticky z-20 bg-card';
export const stickyBodyCellClass = 'sticky z-10 bg-card';

export function SelectionHeaderCheckbox({
    checked,
    indeterminate,
    onCheckedChange,
    label,
}: {
    checked: boolean;
    indeterminate: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <Checkbox
            checked={checked}
            data-state={indeterminate ? 'indeterminate' : undefined}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-label={label}
        />
    );
}

export function SelectionRowCheckbox({
    checked,
    onCheckedChange,
    label,
}: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <Checkbox
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
        />
    );
}

export function CoachIdentity({
    id,
    name,
    rank,
    photoPath,
    memberId,
    member,
}: {
    id: number;
    name: string;
    rank: string | null;
    photoPath?: string | null;
    memberId?: number | null;
    member?: { full_name: string; pno: string | null } | null;
}) {
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <CoachAvatar photoPath={photoPath} name={name} />
            <div className="flex min-w-0 flex-wrap items-center gap-1">
                {rank && (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-sky-500/10 px-1 py-0.5 text-[10px] leading-none font-medium text-sky-700 dark:text-sky-300">
                        {rank}
                    </span>
                )}
                <Link
                    href={CoachController.show.url(id)}
                    className="min-w-0 font-medium break-words text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {name}
                </Link>
                {memberId && (
                    <PlayerCoachBadge
                        memberId={memberId}
                        memberName={member?.full_name}
                        pno={member?.pno}
                        variant="compact"
                    />
                )}
            </div>
        </div>
    );
}

export function IconText({
    icon: Icon,
    iconClassName,
    children,
}: {
    icon: LucideIcon;
    iconClassName: string;
    children: ReactNode;
}) {
    return (
        <span className="flex min-w-0 items-center gap-1">
            <Icon className={cn('size-3 shrink-0', iconClassName)} />
            <span className="min-w-0 break-words">{children}</span>
        </span>
    );
}

export function CoachPnoLink({ id, pno }: { id: number; pno: string | null }) {
    if (!pno) {
        return '-';
    }

    return (
        <Link
            href={CoachController.show.url(id)}
            className="block text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
        >
            <IconText
                icon={IdCard}
                iconClassName="text-sky-600 dark:text-sky-300"
            >
                {pno}
            </IconText>
        </Link>
    );
}
