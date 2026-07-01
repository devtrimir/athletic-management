import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';

import {
    edit,
    index,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

type TrainingVenue = {
    id: number;
    name: string;
    code: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    allowed_radius_meters: number;
    status: string;
    remarks: string | null;
};

export default function TrainingVenuesShow({
    trainingVenue,
}: {
    trainingVenue: TrainingVenue;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={trainingVenue.name} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={trainingVenue.name}
                        description={trainingVenue.code ?? t('Training venue')}
                    />
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={index.url()}>
                                <ArrowLeft className="size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={edit.url(trainingVenue)}>
                                <Pencil className="size-4" />
                                {t('Edit')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail
                            label={t('Status')}
                            value={<Badge>{t(trainingVenue.status)}</Badge>}
                        />
                        <Detail
                            label={t('City')}
                            value={trainingVenue.city || t('Not set')}
                        />
                        <Detail
                            label={t('Allowed radius (meters)')}
                            value={`${trainingVenue.allowed_radius_meters} m`}
                        />
                        <Detail
                            label={t('Coordinates')}
                            value={
                                trainingVenue.latitude &&
                                trainingVenue.longitude
                                    ? `${trainingVenue.latitude}, ${trainingVenue.longitude}`
                                    : t('Not set')
                            }
                        />
                    </div>
                    <div className="border-t p-6">
                        <Detail
                            label={t('Address')}
                            value={trainingVenue.address || t('Not set')}
                        />
                    </div>
                    {trainingVenue.remarks ? (
                        <div className="border-t p-6">
                            <Detail
                                label={t('Remarks')}
                                value={trainingVenue.remarks}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
                {label}
            </div>
            <div className="text-sm">{value}</div>
        </div>
    );
}
