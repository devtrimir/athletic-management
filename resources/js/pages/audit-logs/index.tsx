import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { DiffView } from '@/components/audit/diff-view';
import { FilterPill, OptionList } from '@/components/data-table/filter-pill';
import {
    listingCellClass,
    listingHeadCellClass,
    listingTableClass,
} from '@/components/data-table/table-primitives';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';

type Log = {
    id: number;
    at: string;
    entity: string;
    entity_id: number | null;
    action: string;
    source: string | null;
    actor_type: string | null;
    actor_name: string | null;
    ip_address: string | null;
    user_agent: string | null;
    url: string | null;
    http_method: string | null;
    request_id: string | null;
    diff: Record<string, unknown> | null;
};

type Filters = {
    entity: string | null;
    action: string | null;
    actor_type: string | null;
    source: string | null;
    from: string | null;
    to: string | null;
    q: string | null;
};

type Props = {
    logs: {
        data: Log[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: Filters;
    perPage: number;
    entities: string[];
    actions: string[];
};

const ACTOR_TYPES = ['user', 'external_coach', 'system'];
const SOURCES = ['web', 'console'];

function humanize(value: string): string {
    return value.replaceAll('_', ' ');
}

export default function AuditLogsIndex({
    logs,
    filters,
    perPage,
    entities,
    actions,
}: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.q ?? '');
    const [expanded, setExpanded] = useState<number | null>(null);
    const hasFilters = Object.values(filters).some(Boolean);

    function apply(overrides: Partial<Filters> & { per_page?: number } = {}) {
        const next = { ...filters, per_page: perPage, ...overrides };
        const params = Object.fromEntries(
            Object.entries(next).filter(([, value]) => value),
        );

        router.get('/audit-logs', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    useEffect(() => {
        if (search.trim() === (filters.q ?? '')) {
            return;
        }

        const timer = setTimeout(
            () => apply({ q: search.trim() || null }),
            400,
        );

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const optionList = (
        options: string[],
        key: keyof Filters,
        render: (value: string) => string = humanize,
    ) => (
        <div className="max-h-64 overflow-y-auto">
            <OptionList
                options={options.map((value) => ({
                    value,
                    label: render(value),
                }))}
                value={filters[key] ?? undefined}
                onSelect={(value) => apply({ [key]: value ?? null })}
            />
        </div>
    );

    return (
        <>
            <Head title={t('Audit logs')} />

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Audit logs')}
                        description={t(
                            'Who changed or accessed what, when and from where.',
                        )}
                    />
                    <div className="relative w-72 shrink-0">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Record ID, request ID or IP')}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border bg-card p-1">
                    <FilterPill
                        label={t('Record type')}
                        activeLabel={filters.entity ?? undefined}
                        onClear={() => apply({ entity: null })}
                    >
                        {optionList(entities, 'entity', (value) => value)}
                    </FilterPill>
                    <FilterPill
                        label={t('Action')}
                        activeLabel={
                            filters.action
                                ? humanize(filters.action)
                                : undefined
                        }
                        onClear={() => apply({ action: null })}
                    >
                        {optionList(actions, 'action')}
                    </FilterPill>
                    <FilterPill
                        label={t('Actor')}
                        activeLabel={
                            filters.actor_type
                                ? humanize(filters.actor_type)
                                : undefined
                        }
                        onClear={() => apply({ actor_type: null })}
                    >
                        {optionList(ACTOR_TYPES, 'actor_type')}
                    </FilterPill>
                    <FilterPill
                        label={t('Source')}
                        activeLabel={filters.source ?? undefined}
                        onClear={() => apply({ source: null })}
                    >
                        {optionList(SOURCES, 'source')}
                    </FilterPill>
                    <FilterPill
                        label={t('Date')}
                        activeLabel={
                            filters.from || filters.to
                                ? `${filters.from ?? '…'} – ${filters.to ?? '…'}`
                                : undefined
                        }
                        onClear={() => apply({ from: null, to: null })}
                    >
                        <div className="flex items-center gap-2 p-3">
                            <Input
                                type="date"
                                className="h-8 w-36 text-sm"
                                value={filters.from ?? ''}
                                onChange={(event) =>
                                    apply({ from: event.target.value || null })
                                }
                            />
                            <span className="text-xs text-muted-foreground">
                                –
                            </span>
                            <Input
                                type="date"
                                className="h-8 w-36 text-sm"
                                value={filters.to ?? ''}
                                onChange={(event) =>
                                    apply({ to: event.target.value || null })
                                }
                            />
                        </div>
                    </FilterPill>
                    <div className="min-w-0 flex-1" />
                    {hasFilters && (
                        <button
                            type="button"
                            className="h-8 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setSearch('');
                                router.get(
                                    '/audit-logs',
                                    { per_page: perPage },
                                    { replace: true, preserveState: true },
                                );
                            }}
                        >
                            <X className="mr-1 inline size-3" />
                            {t('Clear filters')}
                        </button>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="h-full min-h-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
                        <Table
                            className={`${listingTableClass} min-w-[1000px]`}
                        >
                            <colgroup>
                                <col className="w-8" />
                                <col className="w-[150px]" />
                                <col className="w-[200px]" />
                                <col className="w-[140px]" />
                                <col className="w-[160px]" />
                                <col className="w-[110px]" />
                                <col className="w-[130px]" />
                                <col />
                            </colgroup>
                            <TableHeader className="sticky top-0 z-20">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead
                                        className={listingHeadCellClass}
                                    />
                                    {[
                                        'When',
                                        'Actor',
                                        'Action',
                                        'Record',
                                        'Source',
                                        'IP address',
                                        'Request',
                                    ].map((label) => (
                                        <TableHead
                                            key={label}
                                            className={listingHeadCellClass}
                                        >
                                            {t(label)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {t('No audit entries found.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.data.map((log) => (
                                        <Fragment key={log.id}>
                                            <TableRow
                                                className="cursor-pointer hover:bg-muted/30"
                                                onClick={() =>
                                                    setExpanded(
                                                        expanded === log.id
                                                            ? null
                                                            : log.id,
                                                    )
                                                }
                                            >
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {expanded === log.id ? (
                                                        <ChevronDown className="size-3.5" />
                                                    ) : (
                                                        <ChevronRight className="size-3.5" />
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {formatDate(log.at, '-')}{' '}
                                                    <span className="text-muted-foreground">
                                                        {new Date(
                                                            log.at,
                                                        ).toLocaleTimeString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    <span className="font-medium">
                                                        {log.actor_name ??
                                                            humanize(
                                                                log.actor_type ??
                                                                    '-',
                                                            )}
                                                    </span>{' '}
                                                    <span className="text-muted-foreground">
                                                        {log.actor_name &&
                                                            humanize(
                                                                log.actor_type ??
                                                                    '',
                                                            )}
                                                    </span>
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1.5 py-0 text-[10px]"
                                                    >
                                                        {humanize(log.action)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {log.entity}
                                                    {log.entity_id
                                                        ? ` #${log.entity_id}`
                                                        : ''}
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {log.source ?? '-'}
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {log.ip_address ?? '-'}
                                                </TableCell>
                                                <TableCell
                                                    className={listingCellClass}
                                                >
                                                    {log.request_id ? (
                                                        <button
                                                            type="button"
                                                            title={t(
                                                                'Show everything from this request',
                                                            )}
                                                            className="font-mono text-primary hover:underline"
                                                            onClick={(
                                                                event,
                                                            ) => {
                                                                event.stopPropagation();
                                                                setSearch(
                                                                    log.request_id ??
                                                                        '',
                                                                );
                                                            }}
                                                        >
                                                            {log.request_id.slice(
                                                                0,
                                                                8,
                                                            )}
                                                        </button>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {expanded === log.id && (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell
                                                        colSpan={8}
                                                        className="border-b bg-muted/20 p-3 text-xs"
                                                    >
                                                        <dl className="mb-2 grid gap-1 sm:grid-cols-2">
                                                            <div>
                                                                <dt className="inline text-muted-foreground">
                                                                    {t('URL')}
                                                                    :{' '}
                                                                </dt>
                                                                <dd className="inline break-all">
                                                                    {
                                                                        log.http_method
                                                                    }{' '}
                                                                    {log.url ??
                                                                        '-'}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="inline text-muted-foreground">
                                                                    {t(
                                                                        'Device',
                                                                    )}
                                                                    :{' '}
                                                                </dt>
                                                                <dd className="inline break-all">
                                                                    {log.user_agent ??
                                                                        '-'}
                                                                </dd>
                                                            </div>
                                                        </dl>
                                                        <DiffView
                                                            diff={log.diff}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ListingPagination
                    paginator={logs}
                    itemLabel={t('entries')}
                    rowsPerPage={{
                        value: perPage,
                        options: [10, 25, 50, 100],
                        onChange: (value) => apply({ per_page: value }),
                    }}
                    className="shrink-0 shadow-sm"
                />
            </div>
        </>
    );
}
