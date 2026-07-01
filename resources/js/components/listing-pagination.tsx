import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type PaginatedListing = {
    links: PaginationLink[];
    current_page?: number;
    last_page?: number;
    total: number;
    from: number | null;
    to: number | null;
};

type ListingPaginationProps = {
    paginator: PaginatedListing;
    itemLabel?: string;
    rowsPerPage?: {
        value: number;
        options: number[];
        onChange: (value: number) => void;
    };
    className?: string;
};

function cleanPaginationLabel(label: string): string {
    return label
        .replace(/&laquo;|&lsaquo;/g, '‹')
        .replace(/&raquo;|&rsaquo;/g, '›')
        .replace(/&amp;/g, '&')
        .replace(/<\/?[^>]+(>|$)/g, '');
}

export function ListingPagination({
    paginator,
    itemLabel = 'records',
    rowsPerPage,
    className,
}: ListingPaginationProps) {
    const hasMultiplePages = (paginator.last_page ?? 1) > 1;
    const showControls = hasMultiplePages || rowsPerPage !== undefined;
    const summary =
        paginator.from !== null
            ? `Showing ${paginator.from}-${paginator.to ?? paginator.from} of ${paginator.total} ${itemLabel}`
            : `Showing 0 of ${paginator.total} ${itemLabel}`;

    if (!showControls && paginator.total === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium">{summary}</span>

                {rowsPerPage && (
                    <div className="flex items-center gap-2 text-xs">
                        <span>Rows</span>
                        <div className="flex items-center gap-1">
                            {rowsPerPage.options.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={cn(
                                        'inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors',
                                        option === rowsPerPage.value
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                                    )}
                                    onClick={() => rowsPerPage.onChange(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {hasMultiplePages && (
                <nav
                    aria-label="Pagination"
                    className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 sm:pb-0"
                >
                    {paginator.links.map((link, index) => (
                        <Button
                            key={`${link.label}-${index}`}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 min-w-8 shrink-0 px-2"
                            disabled={!link.url}
                            onClick={() => {
                                if (link.url) {
                                    router.get(
                                        link.url,
                                        {},
                                        { preserveState: true },
                                    );
                                }
                            }}
                        >
                            {cleanPaginationLabel(link.label)}
                        </Button>
                    ))}
                </nav>
            )}
        </div>
    );
}
