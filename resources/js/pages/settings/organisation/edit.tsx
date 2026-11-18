import { Form, Head, setLayoutProps } from '@inertiajs/react';
import OrganizationController from '@/actions/App/Http/Controllers/Settings/OrganizationController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type Props = {
    names: {
        display_name_en: string | null;
        display_name_hi: string | null;
    };
    fallback: string;
};

export default function Edit({ names, fallback }: Props) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Organisation') }],
    });

    return (
        <>
            <Head title={t('Organisation')} />

            <h1 className="sr-only">{t('Organisation')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('Organisation')}
                    description={t(
                        'The name shown on letterheads, prints, exports and the login page.',
                    )}
                />

                <Form
                    {...OrganizationController.update.form()}
                    className="max-w-xl space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-5 rounded-xl border bg-card p-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="display_name_en">
                                        {t('Name (English)')}
                                    </Label>
                                    <Input
                                        id="display_name_en"
                                        name="display_name_en"
                                        defaultValue={
                                            names.display_name_en ?? ''
                                        }
                                        placeholder={fallback}
                                        maxLength={150}
                                        required
                                    />
                                    <InputError
                                        message={errors.display_name_en}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="display_name_hi">
                                        {t('Name (Hindi)')}
                                    </Label>
                                    <Input
                                        id="display_name_hi"
                                        name="display_name_hi"
                                        defaultValue={
                                            names.display_name_hi ?? ''
                                        }
                                        maxLength={150}
                                        required
                                    />
                                    <InputError
                                        message={errors.display_name_hi}
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={processing}>
                                {t('Save')}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
