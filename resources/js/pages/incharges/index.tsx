import { Head, Link, router } from '@inertiajs/react';
import { Edit, Eye, Plus, Search, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Incharge = {
    id: number;
    full_name: string;
    pno: string;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    is_active: boolean;
    current_teams_count: number;
    assignments_count: number;
};

type PaginatedIncharges = {
    data: Incharge[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    q?: string;
    is_active?: string;
};

function displayValue(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === ''
        ? ''
        : String(value);
}

export default function InchargesIndex({
    incharges,
    filters,
}: {
    incharges: PaginatedIncharges;
    filters: Filters;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(filters.q ?? '');

    const applySearch = () => {
        router.get(
            InchargeController.index.url(),
            { filter: { ...filters, q: query || undefined } },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title={t('Team Prabhari')} />

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={t('Team Prabhari')}
                        description={t(
                            'Manage team prabhari and their assignments.',
                        )}
                    />
                    <Button asChild>
                        <Link href={InchargeController.create.url()}>
                            <Plus className="size-4" />
                            {t('Add team prabhari')}
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    applySearch();
                                }
                            }}
                            placeholder={t(
                                'Search team prabhari by name, PNO, rank, or designation',
                            )}
                            className="pl-9"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={applySearch}
                    >
                        {t('Search')}
                    </Button>
                </div>

                <ListingPagination
                    paginator={incharges}
                    itemLabel={t('team prabhari')}
                    className="sticky top-0 z-40 shadow-sm"
                />
                <div className="overflow-hidden rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">
                                    {t('S. No.')}
                                </TableHead>
                                <TableHead>{t('Team Prabhari')}</TableHead>
                                <TableHead>{t('Rank')}</TableHead>
                                <TableHead>{t('Contact')}</TableHead>
                                <TableHead>{t('Current teams')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incharges.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-28 text-center text-muted-foreground"
                                    >
                                        {t('No team prabhari found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                incharges.data.map((incharge, index) => (
                                    <TableRow key={incharge.id}>
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {(incharges.from ?? 1) + index}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-9 items-center justify-center rounded-md bg-muted">
                                                    <UserRoundCheck className="size-4 text-muted-foreground" />
                                                </span>
                                                <div>
                                                    <Link
                                                        href={InchargeController.show.url(
                                                            incharge.id,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {incharge.full_name}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('PNO')}:{' '}
                                                        {incharge.pno}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {displayValue(incharge.rank)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {displayValue(
                                                    incharge.designation,
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {displayValue(incharge.mobile)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {displayValue(incharge.email)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {incharge.current_teams_count}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    incharge.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {incharge.is_active
                                                    ? t('Active')
                                                    : t('Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={t(
                                                        'View team prabhari',
                                                    )}
                                                >
                                                    <Link
                                                        href={InchargeController.show.url(
                                                            incharge.id,
                                                        )}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={t(
                                                        'Edit team prabhari',
                                                    )}
                                                >
                                                    <Link
                                                        href={InchargeController.edit.url(
                                                            incharge.id,
                                                        )}
                                                    >
                                                        <Edit className="size-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

InchargesIndex.layout = {
    breadcrumbs: [
        { title: 'Team Prabhari', href: InchargeController.index.url() },
    ],
};
