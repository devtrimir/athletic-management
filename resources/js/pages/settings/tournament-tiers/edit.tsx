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
import { useTranslation } from '@/hooks/use-translation';

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
    const { t } = useTranslation();
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
            <Head title={`${t('Edit')} ${tier.label_en}`} />

            <h1 className="sr-only">{t('Edit')} {tier.label_en}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`${t('Edit')} ${tier.label_en}`}
                    description={t('Update tournament tier details')}
                />

                <Form {...TournamentTierController.update.form(tier.id)} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">{t('Code')}</Label>
                                    <Select name="code" defaultValue={tier.code} required>
                                        <SelectTrigger id="code" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIER_CODES.map((tc) => (
                                                <SelectItem key={tc.value} value={tc.value}>
                                                    {tc.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.code} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="label_hi">{t('Label (Hindi)')}</Label>
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
                                        <Label htmlFor="label_en">{t('Label (English)')}</Label>
                                        <Input
                                            id="label_en"
                                            name="label_en"
                                            defaultValue={tier.label_en}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.label_en} />
                                    </div>
                                </div>

                                <div className="grid gap-2 max-w-[200px]">
                                    <Label htmlFor="weight">{t('Weight')}</Label>
                                    <Input
                                        id="weight"
                                        name="weight"
                                        type="number"
                                        min={0}
                                        max={32767}
                                        defaultValue={tier.weight}
                                        className="tabular-nums"
                                        required
                                    />
                                    <InputError message={errors.weight} />
                                    <p className="text-xs text-muted-foreground">{t('Higher weight = higher tier priority.')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>{t('Save changes')}</Button>
                                <Button variant="outline" asChild>
                                    <Link href={TournamentTierController.index.url()}>{t('Cancel')}</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
