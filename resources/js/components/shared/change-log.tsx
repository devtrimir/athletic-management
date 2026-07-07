import {
    AlignLeft,
    Check,
    ChevronDown,
    GitBranch,
    LayoutList,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';

export type AuditChange = {
    field: string;
    old: string | null;
    new: string | null;
};
export type AuditEntry = {
    id: number;
    action: string;
    subject: string;
    at: string;
    by: string | null;
    changes: AuditChange[];
};

function humanizeField(field: string): string {
    if (!field) {
        return '';
    }

    return field
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeValue(value: string | null): string {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    if (trimmed.toLowerCase() === 'true') {
        return 'Yes';
    }

    if (trimmed.toLowerCase() === 'false') {
        return 'No';
    }

    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(trimmed)) {
        return trimmed;
    }

    if (!/^[a-zA-Z]/.test(trimmed)) {
        return trimmed;
    }

    return trimmed
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) => {
            const normalizedWord = word.toUpperCase();

            if (
                normalizedWord === word.toUpperCase() &&
                normalizedWord.length <= 4
            ) {
                return normalizedWord;
            }

            return `${word[0].toUpperCase()}${word.slice(1)}`;
        })
        .join(' ');
}

// ── Internal filter pill ──────────────────────────────────────────────────────

function FilterPill({
    label,
    activeLabel,
    onClear,
    children,
}: {
    label: string;
    activeLabel?: string;
    onClear: () => void;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const isActive = !!activeLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={[
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                        isActive
                            ? 'border-primary/40 bg-primary/8 text-primary hover:bg-primary/12'
                            : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')}
                >
                    <span>{label}</span>
                    {isActive && (
                        <>
                            <span className="text-primary/50">·</span>
                            <span className="max-w-24 truncate font-semibold">
                                {activeLabel}
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Clear ${label}`}
                                className="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                    setOpen(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        onClear();
                                        setOpen(false);
                                    }
                                }}
                            >
                                <X className="size-3" />
                            </span>
                        </>
                    )}
                    {!isActive && <ChevronDown className="size-3 opacity-50" />}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                {children}
            </PopoverContent>
        </Popover>
    );
}

function OptionList({
    options,
    value,
    onSelect,
}: {
    options: { value: string; label: string }[];
    value: string | undefined;
    onSelect: (v: string | undefined) => void;
}) {
    return (
        <div className="py-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() =>
                        onSelect(value === opt.value ? undefined : opt.value)
                    }
                >
                    <Check
                        className={[
                            'size-3.5 shrink-0',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                        ].join(' ')}
                    />
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function getPeriodStart(
    selected: 'month' | 'quarter' | 'half_year' | 'year' | undefined,
): Date | null {
    if (!selected) {
        return null;
    }

    const now = new Date();

    switch (selected) {
        case 'month':
            return new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                now.getDate(),
            );
        case 'quarter':
            return new Date(
                now.getFullYear(),
                now.getMonth() - 3,
                now.getDate(),
            );
        case 'half_year':
            return new Date(
                now.getFullYear(),
                now.getMonth() - 6,
                now.getDate(),
            );
        case 'year':
            return new Date(
                now.getFullYear() - 1,
                now.getMonth(),
                now.getDate(),
            );
        default:
            return null;
    }
}

// ── Main component ────────────────────────────────────────────────────────────

interface ChangeLogProps {
    /** Deferred entries — undefined while loading */
    entries: AuditEntry[] | undefined;
    /** Subject label to suppress badge for (e.g. 'Member', 'Team', 'Coach') */
    primaryEntity: string;
    /** localStorage key for persisting the selected view mode */
    storageKey: string;
    /** Optional endpoint for chunked loading */
    endpoint?: string;
}

export function ChangeLog({
    entries,
    primaryEntity,
    storageKey,
    endpoint,
}: ChangeLogProps) {
    const { t } = useTranslation();
    const displayLocale = 'en-US';
    const [remoteEntries, setRemoteEntries] = useState<
        AuditEntry[] | undefined
    >(undefined);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage] = useState(25);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [view, setView] = useState<'timeline' | 'table' | 'compact'>(() => {
        if (typeof window === 'undefined') {
            return 'timeline';
        }

        const stored = localStorage.getItem(storageKey);

        return stored === 'timeline' ||
            stored === 'table' ||
            stored === 'compact'
            ? stored
            : 'timeline';
    });
    const [search, setSearch] = useState('');
    const [year, setYear] = useState<string | undefined>(undefined);
    const [period, setPeriod] = useState<
        'month' | 'quarter' | 'half_year' | 'year' | undefined
    >('month');
    const [fromDate, setFromDate] = useState(
        getPeriodStart('month')?.toISOString().slice(0, 10) ?? '',
    );
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
    const [action, setAction] = useState<string | undefined>(undefined);
    const [subject, setSubject] = useState<string | undefined>(undefined);

    function buildQueryParams(targetPage: number): string {
        const params = new URLSearchParams();

        params.set('page', String(targetPage));
        params.set('per_page', String(perPage));

        if (search.trim() !== '') {
            params.set('search', search.trim());
        }

        if (year) {
            params.set('year', year);
        }

        if (period) {
            params.set('period', period);
        }

        if (fromDate !== '') {
            params.set('from', fromDate);
        }

        if (toDate !== '') {
            params.set('to', toDate);
        }

        if (action) {
            params.set('action', action);
        }

        if (subject) {
            params.set('subject', subject);
        }

        return params.toString();
    }

    function normalizePeriod(selected: 'month' | 'quarter' | 'half_year' | 'year' | undefined): void {
        if (selected === undefined) {
            return;
        }

        const nextFrom = getPeriodStart(selected);

        if (nextFrom) {
            setFromDate(nextFrom.toISOString().slice(0, 10));
            setToDate(new Date().toISOString().slice(0, 10));
        }
    }

    useEffect(() => {
        if (!endpoint) {
            return;
        }

        let alive = true;

        if (page === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const query = buildQueryParams(page);

        fetch(`${endpoint}?${query}`)
            .then((response) => response.json())
            .then(
                (payload: {
                    data: AuditEntry[];
                    meta?: { has_more: boolean };
                }) => {
                    if (!alive) {
                        return;
                }

                setRemoteEntries((current) =>
                    page === 1
                        ? payload.data ?? []
                        : [...(current ?? []), ...(payload.data ?? [])],
                );
                setHasMore(payload.meta?.has_more ?? false);
                setLoading(false);
                setLoadingMore(false);
            },
        )
        .catch(() => {
                if (!alive) {
                    return;
                }

                if (page === 1) {
                    setRemoteEntries([]);
                }

                setHasMore(false);
                setLoading(false);
                setLoadingMore(false);
            });

        return () => {
            alive = false;
        };
    }, [endpoint, page, perPage, search, year, period, fromDate, toDate, action, subject]);

    useEffect(() => {
        if (!endpoint) {
            return;
        }

        setRemoteEntries(undefined);
        setHasMore(false);
        setPage(1);
    }, [search, year, period, fromDate, toDate, action, subject, endpoint]);

    const sourceEntries = endpoint ? remoteEntries : entries;

    const yearOptions = useMemo(() => {
        if (!sourceEntries) {
            return [];
        }

        const years = [
            ...new Set(
                sourceEntries.map((e) =>
                    new Date(e.at).getFullYear().toString(),
                ),
            ),
        ]
            .sort()
            .reverse();

        return years.map((y) => ({ value: y, label: y }));
    }, [sourceEntries]);

    const actionOptions = useMemo(() => {
        if (!sourceEntries) {
            return [];
        }

        return [...new Set(sourceEntries.map((e) => e.action))].map((a) => ({
            value: a,
            label: t(a),
        }));
    }, [sourceEntries, t]);

    const subjectOptions = useMemo(() => {
        if (!sourceEntries) {
            return [];
        }

        return [...new Set(sourceEntries.map((e) => e.subject))].map((s) => ({
            value: s,
            label: t(s),
        }));
    }, [sourceEntries, t]);

    const visible = useMemo(() => {
        if (!sourceEntries) {
            return [];
        }

        return sourceEntries.filter((entry) => {
            const entryDate = new Date(entry.at);

            if (year && new Date(entry.at).getFullYear().toString() !== year) {
                return false;
            }

            const periodStart = getPeriodStart(period);

            if (periodStart && entryDate < periodStart) {
                return false;
            }

            if (action && entry.action !== action) {
                return false;
            }

            if (subject && entry.subject !== subject) {
                return false;
            }

            if (search) {
                const q = search.toLowerCase();
                const inBy = entry.by?.toLowerCase().includes(q) ?? false;
                const inSubject = entry.subject.toLowerCase().includes(q);
                const inChanges = entry.changes.some(
                    (ch) =>
                        ch.field.toLowerCase().includes(q) ||
                        (ch.old ?? '').toLowerCase().includes(q) ||
                        (ch.new ?? '').toLowerCase().includes(q),
                );

                if (!inBy && !inSubject && !inChanges) {
                    return false;
                }
            }

            return true;
        });
    }, [sourceEntries, year, period, action, subject, search]);

    const anyFilter = !!(year || period || action || subject || search || fromDate || toDate);

    const summary = useMemo(() => {
        const total = visible.length;
        const byAction = visible.reduce<Record<string, number>>(
            (acc, entry) => {
                acc[entry.action] = (acc[entry.action] ?? 0) + 1;

                return acc;
            },
            {},
        );

        return { total, byAction };
    }, [visible]);

    const groupedByDate = useMemo(() => {
        const groups = new Map<string, AuditEntry[]>();

        for (const entry of visible) {
            const key = new Date(entry.at).toLocaleDateString(displayLocale, {
                dateStyle: 'long',
            });
            const current = groups.get(key) ?? [];
            current.push(entry);
            groups.set(key, current);
        }

        return Array.from(groups.entries());
    }, [visible]);

    return (
        <>
            <div className="sticky top-0 z-10 mb-4 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Search changes…')}
                            className="h-8 w-48 pl-7 text-xs"
                        />
                    </div>

                    <FilterPill
                        label={t('Year')}
                        activeLabel={year}
                        onClear={() => setYear(undefined)}
                    >
                        <OptionList
                            options={yearOptions}
                            value={year}
                            onSelect={setYear}
                        />
                    </FilterPill>

                        <FilterPill
                            label={t('Period')}
                            activeLabel={
                                period
                                ? t(
                                      period === 'month'
                                          ? 'Last one month'
                                          : period === 'quarter'
                                            ? 'Last quarter'
                                            : period === 'half_year'
                                              ? 'Last half year'
                                              : 'Last year',
                                  )
                                : undefined
                            }
                            onClear={() => {
                                setPeriod(undefined);
                                setFromDate('');
                                setToDate('');
                            }}
                        >
                            <OptionList
                                options={[
                                { value: 'month', label: t('Last one month') },
                                { value: 'quarter', label: t('Last quarter') },
                                {
                                    value: 'half_year',
                                    label: t('Last half year'),
                                },
                                { value: 'year', label: t('Last year') },
                                ]}
                                value={period}
                                onSelect={(v) => {
                                    const selected = v as
                                        | 'month'
                                        | 'quarter'
                                        | 'half_year'
                                        | 'year'
                                        | undefined;

                                    setPeriod(selected);

                                    if (selected) {
                                        normalizePeriod(selected);
                                    }

                                    if (!selected) {
                                        setFromDate('');
                                        setToDate('');
                                    }
                                }}
                            />
                        </FilterPill>

                    <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                            {t('From')}
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setPeriod(undefined);
                                    setFromDate(e.target.value);
                                }}
                                className="h-7 w-32 border-0 bg-transparent px-0 py-0 text-xs"
                            />
                        </label>
                        <label className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                            {t('To')}
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => {
                                    setPeriod(undefined);
                                    setToDate(e.target.value);
                                }}
                                className="h-7 w-32 border-0 bg-transparent px-0 py-0 text-xs"
                            />
                        </label>
                    </div>

                    <FilterPill
                        label={t('Action')}
                        activeLabel={action ? t(action) : undefined}
                        onClear={() => setAction(undefined)}
                    >
                        <OptionList
                            options={actionOptions}
                            value={action}
                            onSelect={setAction}
                        />
                    </FilterPill>

                    <FilterPill
                        label={t('Subject')}
                        activeLabel={subject ? t(subject) : undefined}
                        onClear={() => setSubject(undefined)}
                    >
                        <OptionList
                            options={subjectOptions}
                            value={subject}
                            onSelect={setSubject}
                        />
                    </FilterPill>

                    {anyFilter && (
                        <button
                            type="button"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setSearch('');
                                setYear(undefined);
                                setPeriod(undefined);
                                setFromDate('');
                                setToDate('');
                                setAction(undefined);
                                setSubject(undefined);
                            }}
                        >
                            {t('Clear filters')}
                        </button>
                    )}

                    <div className="ml-auto flex items-center gap-3">
                        {anyFilter && (
                            <span className="text-xs text-muted-foreground">
                                {visible.length} {t('results')}
                            </span>
                        )}
                        <ToggleGroup
                            type="single"
                            value={view}
                            onValueChange={(v) => {
                                if (
                                    v === 'timeline' ||
                                    v === 'table' ||
                                    v === 'compact'
                                ) {
                                    setView(v);
                                    localStorage.setItem(storageKey, v);
                                }
                            }}
                            variant="outline"
                            size="sm"
                        >
                            <ToggleGroupItem
                                value="timeline"
                                aria-label={t('Timeline')}
                            >
                                <GitBranch className="size-3.5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="table"
                                aria-label={t('Table')}
                            >
                                <LayoutList className="size-3.5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="compact"
                                aria-label={t('Compact')}
                            >
                                <AlignLeft className="size-3.5" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border bg-background px-2 py-1">
                        {summary.total} {t('records')}
                    </span>
                    {Object.entries(summary.byAction).map(([key, count]) => (
                        <span
                            key={key}
                            className="rounded-md border bg-background px-2 py-1"
                        >
                            {t(key)}: {count}
                        </span>
                    ))}
                </div>
                {endpoint && hasMore && (
                    <div className="mt-3 flex justify-center">
                        <button
                            type="button"
                            className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                                const nextPage = page + 1;
                                setLoadingMore(true);
                                setPage(nextPage);
                            }}
                            disabled={loadingMore}
                        >
                            {loadingMore ? t('Loading…') : t('Load more')}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading && endpoint ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('Loading…')}
                </p>
            ) : visible.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    {anyFilter
                        ? t('No changes match filters.')
                        : t('No changes recorded yet.')}
                </p>
            ) : view === 'table' ? (
                <div className="rounded-xl border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-40">
                                    {t('Date / Time')}
                                </TableHead>
                                <TableHead className="w-32">
                                    {t('User')}
                                </TableHead>
                                <TableHead className="w-28">
                                    {t('Action')}
                                </TableHead>
                                <TableHead className="w-28">
                                    {t('Subject')}
                                </TableHead>
                                <TableHead>{t('Changes')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                        {new Date(entry.at).toLocaleString(
                                            displayLocale,
                                            {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            },
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {entry.by ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className="text-xs capitalize"
                                        >
                                            {t(entry.action)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {entry.subject !== primaryEntity ? (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {t(entry.subject)}
                                            </Badge>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {entry.changes.length === 0 ? (
                                            '—'
                                        ) : (
                                            <ul className="space-y-0.5">
                                                {entry.changes.map((ch, i) => (
                                                    <li key={i}>
                                                        <span className="font-medium">
                                                        {humanizeField(ch.field)}:
                                                        </span>{' '}
                                                        {ch.old !== null ? (
                                                            <>
                                                                <span className="text-muted-foreground line-through">
                                                                    {humanizeValue(
                                                                        ch.old,
                                                                    ) || '—'}
                                                                </span>
                                                                {' → '}
                                                                <span>
                                                                {humanizeValue(
                                                                    ch.new,
                                                                ) || '—'}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span>
                                                            {humanizeValue(
                                                                ch.new,
                                                            ) || '—'}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : view === 'compact' ? (
                <ol className="divide-y rounded-xl border bg-card">
                    {visible.map((entry) => (
                        <li
                            key={entry.id}
                            className="flex items-center gap-3 px-4 py-2.5"
                        >
                            <time className="w-36 shrink-0 text-xs text-muted-foreground">
                                {new Date(entry.at).toLocaleString(displayLocale, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </time>
                            <span className="hidden w-28 shrink-0 truncate text-xs text-muted-foreground sm:block">
                                {entry.by ?? ''}
                            </span>
                            <Badge
                                variant="outline"
                                className="shrink-0 text-xs capitalize"
                            >
                                {t(entry.action)}
                            </Badge>
                            {entry.subject !== primaryEntity && (
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 text-xs"
                                >
                                    {t(entry.subject)}
                                </Badge>
                            )}
                            {entry.changes.length > 0 && (
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                    {entry.changes.length}×
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            ) : (
                /* timeline (default) */
                <div className="space-y-6">
                    {groupedByDate.map(([dateLabel, items]) => (
                        <section
                            key={dateLabel}
                            className="rounded-xl border bg-card"
                        >
                            <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                                {dateLabel}
                            </div>
                            <ol className="relative ml-3 space-y-6 border-l border-border py-4">
                                {items.map((entry) => (
                                    <li key={entry.id} className="ms-6">
                                        <span className="absolute -start-2 flex h-4 w-4 items-center justify-center rounded-full bg-muted ring-2 ring-background" />
                                        <div className="mb-1 flex items-center gap-2">
                                            <time className="text-xs text-muted-foreground">
                                                {new Date(
                                                    entry.at,
                                                ).toLocaleString(displayLocale, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </time>
                                            {entry.by && (
                                                <span className="text-xs text-muted-foreground">
                                                    — {entry.by}
                                                </span>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className="text-xs capitalize"
                                            >
                                                {t(entry.action)}
                                            </Badge>
                                            {entry.subject !==
                                                primaryEntity && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {t(entry.subject)}
                                                </Badge>
                                            )}
                                        </div>
                                                {entry.changes.length > 0 && (
                                                    <ul className="mt-1 space-y-1">
                                                        {entry.changes.map((ch, i) => (
                                                            <li
                                                                key={i}
                                                                className="text-sm"
                                                            >
                                                                <span className="font-medium">
                                                            {humanizeField(ch.field)}:
                                                            </span>{' '}
                                                                {ch.old !== null ? (
                                                            <>
                                                                <span className="text-muted-foreground line-through">
                                                                    {humanizeValue(
                                                                        ch.old,
                                                                    ) || '—'}
                                                                </span>
                                                                {' → '}
                                                                <span className="text-foreground">
                                                                    {humanizeValue(
                                                                        ch.new,
                                                                    ) || '—'}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-foreground">
                                                                {humanizeValue(
                                                                    ch.new,
                                                                ) || '—'}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
        </>
    );
}
