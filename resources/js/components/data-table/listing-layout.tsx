import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
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

const PAN_IGNORE =
    'a,button,input,select,textarea,label,[role=button],[role=checkbox],[role=combobox],[data-no-pan]';

/**
 * The bordered, full-height table frame (sticky head, horizontal scroll).
 *
 * For wide tables it adds scroll helpers for mice without a horizontal wheel:
 * icon buttons (start / left / right / end), shown only while the pointer is
 * over the table and it actually overflows, and drag-to-pan. A press on plain
 * cell space that moves more than a few pixels is treated as a pan and the
 * click that follows is swallowed, so row clicks still work.
 */
export function ListingTable({
    minWidth = 1000,
    className,
    centered = false,
    children,
}: {
    minWidth?: number;
    className?: string;
    /** Center every header and cell horizontally (cells are always vertically centered). */
    centered?: boolean;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const frameRef = useRef<HTMLDivElement>(null);
    const [edge, setEdge] = useState({
        overflow: false,
        atStart: true,
        atEnd: true,
    });

    const scroller = () =>
        frameRef.current?.querySelector<HTMLElement>(
            '[data-slot=table-container]',
        ) ?? null;

    useEffect(() => {
        const el = scroller();

        if (!el) {
            return;
        }

        const update = () =>
            setEdge({
                overflow: el.scrollWidth > el.clientWidth + 1,
                atStart: el.scrollLeft <= 1,
                atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
            });
        const observer = new ResizeObserver(update);

        update();
        el.addEventListener('scroll', update, { passive: true });
        observer.observe(el);

        if (el.firstElementChild) {
            observer.observe(el.firstElementChild);
        }

        let origin: { x: number; y: number; left: number; top: number } | null =
            null;
        let panning = false;

        const onDown = (event: PointerEvent) => {
            if (
                event.pointerType !== 'mouse' ||
                event.button !== 0 ||
                (event.target as HTMLElement).closest(PAN_IGNORE)
            ) {
                return;
            }

            origin = {
                x: event.clientX,
                y: event.clientY,
                left: el.scrollLeft,
                top: el.scrollTop,
            };
        };
        const onMove = (event: PointerEvent) => {
            if (!origin) {
                return;
            }

            const dx = event.clientX - origin.x;
            const dy = event.clientY - origin.y;

            if (!panning && Math.hypot(dx, dy) > 6) {
                panning = true;
                el.style.cursor = 'grabbing';
                el.style.userSelect = 'none';
            }

            if (panning) {
                el.scrollLeft = origin.left - dx;
                el.scrollTop = origin.top - dy;
            }
        };
        const onUp = () => {
            if (panning) {
                const swallow = (event: Event) => event.stopPropagation();

                el.addEventListener('click', swallow, {
                    capture: true,
                    once: true,
                });
                setTimeout(
                    () => el.removeEventListener('click', swallow, true),
                    0,
                );
                el.style.cursor = '';
                el.style.userSelect = '';
            }

            origin = null;
            panning = false;
        };

        el.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', update);
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, []);

    function scrollTo(position: 'start' | 'left' | 'right' | 'end') {
        const el = scroller();

        if (!el) {
            return;
        }

        const step = el.clientWidth * 0.6;
        const left = {
            start: 0,
            left: el.scrollLeft - step,
            right: el.scrollLeft + step,
            end: el.scrollWidth,
        }[position];

        el.scrollTo({ left, behavior: 'smooth' });
    }

    const controls = [
        {
            key: 'start',
            label: 'Scroll to start',
            icon: ChevronsLeft,
            off: edge.atStart,
        },
        {
            key: 'left',
            label: 'Scroll left',
            icon: ChevronLeft,
            off: edge.atStart,
        },
        {
            key: 'right',
            label: 'Scroll right',
            icon: ChevronRight,
            off: edge.atEnd,
        },
        {
            key: 'end',
            label: 'Scroll to end',
            icon: ChevronsRight,
            off: edge.atEnd,
        },
    ] as const;

    return (
        <div
            ref={frameRef}
            className="group/table relative h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full"
        >
            <Table
                className={cn(
                    listingTableClass,
                    centered &&
                        '[&_td]:text-center [&_td_.justify-end]:justify-center [&_th]:text-center [&_th_.justify-end]:justify-center',
                    className,
                )}
                style={{ minWidth }}
            >
                {children}
            </Table>

            {edge.overflow && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-0.5 rounded-lg border bg-background/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity group-focus-within/table:pointer-events-auto group-focus-within/table:opacity-100 group-hover/table:pointer-events-auto group-hover/table:opacity-100">
                    {controls.map(({ key, label, icon: Icon, off }) => (
                        <Button
                            key={key}
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title={t(label)}
                            aria-label={t(label)}
                            disabled={off}
                            onClick={() => scrollTo(key)}
                        >
                            <Icon className="size-4" />
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
