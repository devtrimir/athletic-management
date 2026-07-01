import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Plus } from 'lucide-react';

import {
    create,
    edit,
    show,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Venue = {
    id: number;
    name: string;
    code: string | null;
    city: string | null;
    status: string;
    allowed_radius_meters: number;
    district?: { name: string } | null;
    unit?: { name: string } | null;
};

type PaginatedVenues = {
    data: Venue[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export default function TrainingVenuesIndex({
    trainingVenues,
}: {
    trainingVenues: PaginatedVenues;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Training venues')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={t('Training venues')}
                        description={t(
                            'Manage external training locations and attendance radius settings.',
                        )}
                    />
                    <Button asChild>
                        <Link href={create.url()}>
                            <Plus className="size-4" />
                            {t('Add venue')}
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">
                                    {t('S.No.')}
                                </TableHead>
                                <TableHead>{t('Venue')}</TableHead>
                                <TableHead>{t('Location')}</TableHead>
                                <TableHead>{t('Radius')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-28 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trainingVenues.data.map((venue, index) => (
                                <TableRow key={venue.id}>
                                    <TableCell>
                                        {(trainingVenues.from ?? 1) + index}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {venue.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {venue.code || t('No code')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            {venue.city ||
                                                venue.district?.name ||
                                                t('Not set')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {venue.unit?.name ||
                                                t('No unit linked')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {venue.allowed_radius_meters} m
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                venue.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {t(venue.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Link
                                                    href={show.url(venue)}
                                                    aria-label={t('View')}
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Link
                                                    href={edit.url(venue)}
                                                    aria-label={t('Edit')}
                                                >
                                                    <Pencil className="size-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {trainingVenues.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        {t('No training venues found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination
                    paginator={trainingVenues}
                    itemLabel={t('venues')}
                />
            </div>
        </>
    );
}
