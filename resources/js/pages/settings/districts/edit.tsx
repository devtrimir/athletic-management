import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import DistrictController from '@/actions/App/Http/Controllers/Settings/DistrictController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type District = {
    id: number;
    name_hi: string;
    name_en: string;
    state: string;
    code: string;
};

export default function Edit({ district }: { district: District }) {
    const { t } = useTranslation();
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Districts',
                href: DistrictController.index.url(),
            },
            {
                title: district.name_en,
                href: DistrictController.edit.url(district.id),
            },
        ],
    });

    return (
        <>
            <Head title={`${t('Edit')} ${district.name_en}`} />

            <h1 className="sr-only">{t('Edit')} {district.name_en}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`${t('Edit')} ${district.name_en}`}
                    description={t('Update district details')}
                />

                <Form {...DistrictController.update.form(district.id)} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name_hi">{t('Name (Hindi)')}</Label>
                                        <Input
                                            id="name_hi"
                                            name="name_hi"
                                            defaultValue={district.name_hi}
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
                                            defaultValue={district.name_en}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_en} />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">{t('State')}</Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            defaultValue={district.state}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.state} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="code">{t('Code')}</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            defaultValue={district.code}
                                            maxLength={10}
                                            className="font-mono"
                                            required
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>{t('Save changes')}</Button>
                                <Button variant="outline" asChild>
                                    <Link href={DistrictController.index.url()}>{t('Cancel')}</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
