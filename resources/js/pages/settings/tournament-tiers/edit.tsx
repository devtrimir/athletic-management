import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import TournamentTierController from '@/actions/App/Http/Controllers/Settings/TournamentTierController';
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

const TIER_CODES = [
    { value: 'INTERNATIONAL', label: 'International' },
    { value: 'NATIONAL', label: 'National' },
    { value: 'AIPSC', label: 'AIPSC' },
    { value: 'STATE', label: 'State' },
    { value: 'ZONAL', label: 'Zonal' },
    { value: 'OTHER', label: 'Other' },
] as const;

type Tier = {
    id: number;
    code: string;
    label_hi: string;
    label_en: string;
    weight: number;
};

export default function Edit({ tier }: { tier: Tier }) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Tournament Tiers',
                href: TournamentTierController.index.url(),
            },
            {
                title: tier.label_en,
                href: TournamentTierController.edit.url(tier.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit ${tier.label_en}`} />

            <h1 className="sr-only">Edit {tier.label_en}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`Edit ${tier.label_en}`}
                    description="Update tournament tier details"
                />

                <Form {...TournamentTierController.update.form(tier.id)} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="code">Code</Label>
                                <Select name="code" defaultValue={tier.code} required>
                                    <SelectTrigger id="code">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIER_CODES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.code} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="label_hi">Label (Hindi)</Label>
                                <Input
                                    id="label_hi"
                                    name="label_hi"
                                    defaultValue={tier.label_hi}
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.label_hi} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="label_en">Label (English)</Label>
                                <Input
                                    id="label_en"
                                    name="label_en"
                                    defaultValue={tier.label_en}
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.label_en} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="weight">Weight</Label>
                                <Input
                                    id="weight"
                                    name="weight"
                                    type="number"
                                    min={0}
                                    max={32767}
                                    defaultValue={tier.weight}
                                    required
                                />
                                <InputError message={errors.weight} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>Save changes</Button>
                                <Button variant="outline" asChild>
                                    <Link href={TournamentTierController.index.url()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
