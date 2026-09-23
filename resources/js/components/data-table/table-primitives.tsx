import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** Base class for a dense, fixed-layout listing table. Compose with a `min-w-[...]`. */
export const listingTableClass =
    'w-full table-fixed border-separate border-spacing-0 text-xs';

export const listingHeadCellClass =
    'h-7 border-r border-b border-border/45 bg-card px-1.5 text-[11px] last:border-r-0';

export const listingCellClass =
    'overflow-hidden border-r border-b border-border/45 px-1.5 py-0.5 align-middle text-xs break-words last:border-r-0';

/** Sticky columns pinned to the left edge while scrolling horizontally. */
export const stickyLeftHeadCellClass = 'sticky z-20 bg-card';
export const stickyLeftBodyCellClass = 'sticky z-10 bg-card';

/** A sticky trailing column (e.g. row actions) pinned to the right edge. */
export const stickyRightHeadCellClass = 'sticky right-0 z-20 bg-card';
export const stickyRightBodyCellClass = 'sticky right-0 z-10 bg-card';

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

/** A small icon + text row, used for PNO / gender / blood group / posting style cells. */
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
