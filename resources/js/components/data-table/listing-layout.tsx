import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { listingTableClass } from './table-primitives';

/**
 * Full-height listing page: title + search + actions, a one-line filter bar,
 * a table that takes every remaining pixel, and a pinned footer.
 */
export function ListingLayout({
    title,
    description,
    search,
    actions,
    filters,
    hasFilters,
    onClearFilters,
    resultCount,
    banner,
    children,
    footer,
}: {
    title: string;
    description: string;
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder: string;
    };
    actions?: ReactNode;
    filters?: ReactNode;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    resultCount?: number;
    /** Extra strip between filters and table (e.g. bulk-action bar). */
    banner?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-4">
                <Heading
                    variant="small"
                    title={title}
                    description={description}
                />
                <div className="flex shrink-0 items-center gap-2">
                    {search && (
                        <div className="relative w-56 shrink-0">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={search.placeholder}
                                value={search.value}
                                onChange={(event) =>
                                    search.onChange(event.target.value)
                                }
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
                    )}
                    {actions}
                </div>
            </div>

            {filters && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border bg-card p-1">
                    {filters}
                    <div className="min-w-0 flex-1" />
                    {hasFilters && (
                        <button
                            type="button"
                            className="h-8 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={onClearFilters}
                        >
                            <X className="mr-1 inline size-3" />
                            {t('Clear filters')}
                        </button>
                    )}
                </div>
            )}

            {hasFilters && resultCount !== undefined && (
                <p className="shrink-0 text-xs text-muted-foreground">
                    {resultCount} {t('results')}
                </p>
            )}

            {banner}

            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

            {footer}
        </div>
    );
}

/** The bordered, full-height table frame (sticky head, horizontal scroll). */
export function ListingTable({
    minWidth = 1000,
    className,
    children,
}: {
    minWidth?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className="h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
            <Table
                className={cn(listingTableClass, className)}
                style={{ minWidth }}
            >
                {children}
            </Table>
        </div>
    );
}
