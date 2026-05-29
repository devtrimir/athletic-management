import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/Settings/RoleController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type FormData = {
    code: string;
    name_hi: string;
    name_en: string;
};

export default function Create() {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Roles'), href: RoleController.index.url() },
            { title: t('New role') },
        ],
    });

    const { data, setData, post, processing, errors } = useForm<FormData>({
        code: '',
        name_hi: '',
        name_en: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(RoleController.store.url());
    };

    return (
        <>
            <Head title={t('New role')} />
            <div className="space-y-6">
                <Heading
                    title={t('New role')}
                    description={t('Create a custom role for this organization')}
                />

                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="code">{t('Code')}</Label>
                        <Input
                            id="code"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            placeholder="e.g. team_lead"
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Lowercase letters, numbers, and underscores only.')}
                        </p>
                        <InputError message={errors.code} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name_hi">{t('Name (Hindi)')}</Label>
                        <Input
                            id="name_hi"
                            value={data.name_hi}
                            onChange={(e) => setData('name_hi', e.target.value)}
                        />
                        <InputError message={errors.name_hi} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name_en">{t('Name (English)')}</Label>
                        <Input
                            id="name_en"
                            value={data.name_en}
                            onChange={(e) => setData('name_en', e.target.value)}
                        />
                        <InputError message={errors.name_en} />
                    </div>

                    <Button type="submit" disabled={processing}>
                        {t('Create role')}
                    </Button>
                </form>
            </div>
        </>
    );
}


