import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, MapPin } from 'lucide-react';

import type {
    store,
    update,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import { index } from '@/actions/App/Http/Controllers/TrainingVenueController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

export type TrainingVenue = {
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

type Props = {
    title: string;
    description: string;
    action: ReturnType<typeof store> | ReturnType<typeof update>;
    statuses: string[];
    venue?: TrainingVenue;
};

export function TrainingVenueForm({
    title,
    description,
    action,
    statuses,
    venue,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Heading title={title} description={description} />
                <Button asChild variant="outline">
                    <Link href={index.url()}>
                        <ArrowLeft className="size-4" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <Form action={action} className="space-y-4">
                {({ errors, processing }) => (
                    <>
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-3 border-b px-6 py-4">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <MapPin className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Venue details')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Location, radius, and operational status',
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5 p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            {t('Name')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={venue?.name}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="code">
                                            {t('Code')}
                                        </Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            defaultValue={venue?.code ?? ''}
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address">
                                        {t('Address')}
                                    </Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        rows={3}
                                        defaultValue={venue?.address ?? ''}
                                    />
                                    <InputError message={errors.address} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">
                                            {t('City')}
                                        </Label>
                                        <Input
                                            id="city"
                                            name="city"
                                            defaultValue={venue?.city ?? ''}
                                        />
                                        <InputError message={errors.city} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">
                                            {t('State')}
                                        </Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            defaultValue={venue?.state ?? ''}
                                        />
                                        <InputError message={errors.state} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="latitude">
                                            {t('Latitude')}
                                        </Label>
                                        <Input
                                            id="latitude"
                                            name="latitude"
                                            type="number"
                                            step="0.000001"
                                            defaultValue={venue?.latitude ?? ''}
                                        />
                                        <InputError message={errors.latitude} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="longitude">
                                            {t('Longitude')}
                                        </Label>
                                        <Input
                                            id="longitude"
                                            name="longitude"
                                            type="number"
                                            step="0.000001"
                                            defaultValue={
                                                venue?.longitude ?? ''
                                            }
                                        />
                                        <InputError
                                            message={errors.longitude}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="allowed_radius_meters">
                                            {t('Allowed radius (meters)')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="allowed_radius_meters"
                                            name="allowed_radius_meters"
                                            type="number"
                                            min="1"
                                            max="10000"
                                            defaultValue={
                                                venue?.allowed_radius_meters ??
                                                100
                                            }
                                            required
                                        />
                                        <InputError
                                            message={
                                                errors.allowed_radius_meters
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">
                                            {t('Status')}
                                        </Label>
                                        <Select
                                            name="status"
                                            defaultValue={
                                                venue?.status ?? 'active'
                                            }
                                            required
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statuses.map((status) => (
                                                    <SelectItem
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {t(status)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.status} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="remarks">
                                        {t('Remarks')}
                                    </Label>
                                    <Textarea
                                        id="remarks"
                                        name="remarks"
                                        rows={3}
                                        defaultValue={venue?.remarks ?? ''}
                                    />
                                    <InputError message={errors.remarks} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button asChild variant="outline">
                                <Link href={index.url()}>{t('Cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
