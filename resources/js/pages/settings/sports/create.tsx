import { Form, Head, Link } from '@inertiajs/react';
import SportController from '@/actions/App/Http/Controllers/Settings/SportController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

const CATEGORIES = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'TEAM', label: 'Team' },
    { value: 'COMBAT', label: 'Combat' },
    { value: 'WATER', label: 'Water' },
] as const;

export default function Create() {
    const { t } = useTranslation();
    return (
        <>
            <Head title={t('New sport')} />

            <h1 className="sr-only">{t('New sport')}</h1>

            <div className="space-y-6">
                <Heading variant="small" title={t('New sport')} description={t('Add a new sport discipline')} />

                <Form {...SportController.store.form()} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name_hi">{t('Name (Hindi)')}</Label>
                                        <Input
                                            id="name_hi"
                                            name="name_hi"
                                            placeholder="e.g. हॉकी"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_hi} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name_en">{t('Name (English)')}</Label>
                                        <Input
                                            id="name_en"
                                            name="name_en"
                                            placeholder="e.g. Hockey"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_en} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">{t('Category')}</Label>
                                    <Select name="category" required>
                                        <SelectTrigger id="category" className="w-full">
                                            <SelectValue placeholder={t('Select a category')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.category} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>{t('Create sport')}</Button>
                                <Button variant="outline" asChild>
                                    <Link href={SportController.index.url()}>{t('Cancel')}</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        {
            title: 'Sports',
            href: SportController.index.url(),
        },
        {
            title: 'New sport',
        },
    ],
};
