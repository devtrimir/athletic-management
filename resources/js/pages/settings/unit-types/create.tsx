import { Form, Head, Link } from '@inertiajs/react';
import UnitTypeController from '@/actions/App/Http/Controllers/Settings/UnitTypeController';
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

export default function Create() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('New unit type')} />

            <h1 className="sr-only">{t('New unit type')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New unit type')}
                    description={t('Add a new reference unit type')}
                />

                <Form
                    {...UnitTypeController.store.form()}
                    className="max-w-xl space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-5 rounded-xl border bg-card p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="code">
                                            {t('Code')}
                                        </Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            placeholder="e.g. PAC"
                                            className="font-mono"
                                            maxLength={50}
                                            required
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="sort_order">
                                            {t('Order')}
                                        </Label>
                                        <Input
                                            id="sort_order"
                                            name="sort_order"
                                            type="number"
                                            min={0}
                                            defaultValue={0}
                                            required
                                        />
                                        <InputError
                                            message={errors.sort_order}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            {t('Name')}
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="e.g. पीएसी"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name_en">
                                            {t('Name (English)')}{' '}
                                            <span className="font-normal text-muted-foreground">
                                                {t('(optional)')}
                                            </span>
                                        </Label>
                                        <Input
                                            id="name_en"
                                            name="name_en"
                                            placeholder="e.g. PAC"
                                            maxLength={100}
                                        />
                                        <InputError
                                            message={errors.name_en}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="is_active">
                                        {t('Active')}
                                    </Label>
                                    <Select name="is_active" defaultValue="1">
                                        <SelectTrigger id="is_active">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">
                                                {t('Yes')}
                                            </SelectItem>
                                            <SelectItem value="0">
                                                {t('No')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.is_active} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>
                                    {t('Create unit type')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={UnitTypeController.index.url()}
                                    >
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
            title: 'Unit Types',
            href: UnitTypeController.index.url(),
        },
        {
            title: 'New unit type',
        },
    ],
};
