import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type FilterValues = Record<string, string | null | undefined>;

/**
 * Applies listing filters as `filter[key]` query params (the shape the
 * Spatie-style controllers read). Empty values and "all" are dropped.
 */
export function useListingFilters(
    path: string,
    extraParams: Record<string, string> = {},
) {
    function visit(values: FilterValues) {
        const params: Record<string, string> = { ...extraParams };

        for (const [key, value] of Object.entries(values)) {
            const text = (value ?? '').trim();

            if (text !== '' && text !== 'all') {
                params[`filter[${key}]`] = text;
            }
        }

        router.get(path, params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    return {
        /** Re-visit with the current filters merged with `overrides`. */
        apply: (current: FilterValues, overrides: FilterValues = {}) =>
            visit({ ...current, ...overrides }),
        clear: () => visit({}),
    };
}

/**
 * Controlled search box that syncs from the URL filter and applies itself
 * 400ms after the user stops typing.
 */
export function useDebouncedSearch(
    current: string | null | undefined,
    onApply: (value: string) => void,
) {
    const [search, setSearch] = useState(current ?? '');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearch(current ?? '');
    }, [current]);

    useEffect(() => {
        if (search.trim() === (current ?? '')) {
            return;
        }

        const timer = setTimeout(() => onApply(search.trim()), 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return [search, setSearch] as const;
}
