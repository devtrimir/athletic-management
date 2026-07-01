import { Form, Head, Link } from '@inertiajs/react';
import DistrictController from '@/actions/App/Http/Controllers/Settings/DistrictController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

export default function Create() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('New district')} />

            <h1 className="sr-only">{t('New district')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New district')}
                    description={t('Add a new reference district')}
                />

                <Form
                    {...DistrictController.store.form()}
                    className="max-w-xl space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-5 rounded-xl border bg-card p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            {t('Name')}
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="e.g. लखनऊ"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">
                                            {t('State')}
                                        </Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            defaultValue="Uttar Pradesh"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.state} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="code">
                                            {t('Code')}
                                        </Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            placeholder="e.g. LKO"
                                            maxLength={10}
                                            className="font-mono"
                                            required
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>
                                    {t('Create district')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={DistrictController.index.url()}>
                                        {t('Cancel')}
                                    </Link>
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
            title: 'Districts',
            href: DistrictController.index.url(),
        },
        {
            title: 'New district',
        },
    ],
};
