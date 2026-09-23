import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GAP_PX = 8; // matches gap-2

/**
 * Lays out `items` (already ordered by priority, most important first) in a
 * single line and measures how many actually fit in the available width,
 * reserving room for a "More filters (n)" toggle. Whatever doesn't fit is
 * revealed in a second row when the toggle is clicked, instead of wrapping.
 *
 * Re-measures on container resize (window resize, sidebar toggle, etc).
 */
export function PriorityFilterRow({
    items,
    moreLabel,
    lessLabel,
    className,
}: {
    items: ReactNode[];
    moreLabel: string;
    lessLabel: string;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureItemsRef = useRef<HTMLDivElement>(null);
    const measureMoreRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(items.length);
    const [showMore, setShowMore] = useState(false);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const measureItems = measureItemsRef.current;
        const moreEl = measureMoreRef.current;

        if (!container || !measureItems || !moreEl) {
            return;
        }

        function recalc() {
            const containerWidth = container!.clientWidth;
            const itemEls = Array.from(measureItems!.children) as HTMLElement[];

            const totalWidth = itemEls.reduce(
                (sum, el, i) =>
                    sum +
                    el.getBoundingClientRect().width +
                    (i > 0 ? GAP_PX : 0),
                0,
            );

            if (totalWidth <= containerWidth) {
                setVisibleCount(itemEls.length);

                return;
            }

            const moreWidth = moreEl!.getBoundingClientRect().width;
            const budget = containerWidth - moreWidth - GAP_PX;
            let used = 0;
            let count = 0;

            for (const el of itemEls) {
                const width = el.getBoundingClientRect().width;
                const withGap = width + (count > 0 ? GAP_PX : 0);

                if (used + withGap > budget) {
                    break;
                }

                used += withGap;
                count++;
            }

            setVisibleCount(count);
        }

        recalc();

        const observer = new ResizeObserver(recalc);
        observer.observe(container);

        return () => observer.disconnect();
    }, [items]);

    const visibleItems = items.slice(0, visibleCount);
    const hiddenItems = items.slice(visibleCount);

    return (
        <div ref={containerRef} className={cn('min-w-0', className)}>
            {/* Off-screen measuring pass: same items, laid out in one line, never wraps. */}
            <div
                aria-hidden
                className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-2 whitespace-nowrap"
            >
                <div ref={measureItemsRef} className="flex items-center gap-2">
                    {items.map((item, i) => (
                        <div key={i} className="shrink-0">
                            {item}
                        </div>
                    ))}
                </div>
                <div ref={measureMoreRef} className="shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                    >
                        {moreLabel} (99)
                    </Button>
                </div>
            </div>

            <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
                {visibleItems.map((item, i) => (
                    <div key={i} className="shrink-0">
                        {item}
                    </div>
                ))}
                {hiddenItems.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMore((prev) => !prev)}
                        className="h-7 shrink-0 px-2.5 text-xs"
                    >
                        {showMore
                            ? lessLabel
                            : `${moreLabel} (${hiddenItems.length})`}
                    </Button>
                )}
            </div>

            {showMore && hiddenItems.length > 0 && (
                <div className="mt-1.5 flex animate-in flex-wrap gap-1.5 duration-200 fade-in-0 slide-in-from-top-1">
                    {hiddenItems}
                </div>
            )}
        </div>
    );
}
