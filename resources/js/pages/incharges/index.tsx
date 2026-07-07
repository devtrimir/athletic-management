import { Head, Link, router } from '@inertiajs/react';
import { Edit, Eye, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
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
    current_team_assignments: {
        team: {
            id: number;
            name: string;
            location_type: 'unit' | 'district' | null;
            location_label: string | null;
            session?: {
                id: number;
                name: string;
            } | null;
        } | null;
        assigned_at: string | null;
    }[];
};

function formatDate(value: string | null | undefined): string {
    return value ? value.trim().split('T')[0] : '';
}

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
                                <TableHead>{t('PNO')}</TableHead>
                                <TableHead>{t('Rank')}</TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Current team names')}</TableHead>
                                <TableHead className="text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incharges.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-28 text-center text-muted-foreground"
                                    >
                                        {t('No team prabhari found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                incharges.data.map((incharge, index) => {
                                    const assignments =
                                        incharge.current_team_assignments ?? [];

                                    return (
                                        <TableRow key={incharge.id}>
                                            <TableCell className="text-center text-sm text-muted-foreground">
                                                {(incharges.from ?? 1) + index}
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={InchargeController.show.url(
                                                        incharge.id,
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {displayValue(incharge.pno)}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                {displayValue(incharge.rank)}
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={InchargeController.show.url(
                                                        incharge.id,
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium hover:underline"
                                                >
                                                    {displayValue(incharge.full_name)}
                                                </a>
                                            </TableCell>
                                            
                                            <TableCell>
                                                {assignments.length > 0 ? (
                                                    <div className="w-full min-w-[520px]">
                                                        <Table>
                                                            <TableHeader className="bg-muted/50">
                                                                    <TableRow>
                                                                        <TableHead className="w-16">
                                                                            {t('S. No.')}
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            {t('Team')}
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            {t('Session')}
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            {t('Location')}
                                                                        </TableHead>
                                                                    <TableHead>
                                                                        {t('Assigned at')}
                                                                    </TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {assignments.map(
                                                                    (assignment, teamIndex) => (
                                                                        <TableRow
                                                                            key={`${incharge.id}-team-${teamIndex}`}
                                                                        >
                                                                            <TableCell className="py-2 text-xs">
                                                                                {teamIndex +
                                                                                    1}
                                                                            </TableCell>
                                                                            <TableCell className="py-2 text-xs">
                                                                                {displayValue(
                                                                                    assignment.team?.name,
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="max-w-28 py-2 text-xs">
                                                                                {displayValue(
                                                                                    assignment.team
                                                                                        ?.session?.name,
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="max-w-28 py-2 text-xs">
                                                                                {displayValue(
                                                                                    assignment.team
                                                                                        ?.location_label,
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="py-2 text-xs">
                                                                                {formatDate(
                                                                                    assignment.assigned_at,
                                                                                ) || t('Not assigned')}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ),
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    t('Not assigned')
                                                )}
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
                                    );
                                })
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
