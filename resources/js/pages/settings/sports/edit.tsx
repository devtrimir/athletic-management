import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
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

type Sport = {
    id: number;
    name: string;
    category: string;
    slug: string;
};

export default function Edit({ sport }: { sport: Sport }) {
    const { t } = useTranslation();
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Sports',
                href: SportController.index.url(),
            },
            {
                title: sport.name,
                href: SportController.edit.url(sport.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit ${sport.name}`} />

            <h1 className="sr-only">Edit {sport.name}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`${t('Edit')} ${sport.name}`}
                    description={t('Update sport discipline details')}
                />

                <Form {...SportController.update.form(sport.id)} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">{t('Name')}</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={sport.name}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">{t('Category')}</Label>
                                    <Select name="category" defaultValue={sport.category} required>
                                        <SelectTrigger id="category" className="w-full">
                                            <SelectValue />
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
                                <Button disabled={processing}>{t('Save changes')}</Button>
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
