import { Form, Head, Link } from '@inertiajs/react';
import DesignationController from '@/actions/App/Http/Controllers/Settings/DesignationController';
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

type Rank = { id: number; code: string; name: string };

export default function Create({ ranks }: { ranks: Rank[] }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('New designation')} />
            <h1 className="sr-only">{t('New designation')}</h1>
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New designation')}
                    description={t('Add a new designation reference record')}
                />
                <Form
                    {...DesignationController.store.form()}
                    className="max-w-2xl space-y-6"
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
                                            required
                                            maxLength={50}
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="designation_order">
                                            {t('Order')}
                                        </Label>
                                        <Input
                                            id="designation_order"
                                            name="designation_order"
                                            type="number"
                                            min={1}
                                            required
                                        />
                                        <InputError
                                            message={errors.designation_order}
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
                                            required
                                            maxLength={255}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="short_name">
                                            {t('Short name')}
                                        </Label>
                                        <Input
                                            id="short_name"
                                            name="short_name"
                                            maxLength={100}
                                        />
                                        <InputError
                                            message={errors.short_name}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="mapped_rank_code">
                                            {t('Mapped rank')}
                                        </Label>
                                        <Select name="mapped_rank_code">
                                            <SelectTrigger id="mapped_rank_code">
                                                <SelectValue
                                                    placeholder={t(
                                                        'Select rank',
                                                    )}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ranks.map((rank) => (
                                                    <SelectItem
                                                        key={rank.id}
                                                        value={rank.code}
                                                    >
                                                        {rank.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.mapped_rank_code}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="designation_type">
                                        {t('Designation type')}
                                    </Label>
                                    <Input
                                        id="designation_type"
                                        name="designation_type"
                                        maxLength={100}
                                    />
                                    <InputError
                                        message={errors.designation_type}
                                    />
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="is_active">
                                            {t('Active')}
                                        </Label>
                                        <Select
                                            name="is_active"
                                            defaultValue="1"
                                        >
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
                                        <InputError
                                            message={errors.is_active}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>
                                    {t('Create designation')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={DesignationController.index.url()}
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
        { title: 'Designations', href: DesignationController.index.url() },
        { title: 'New designation' },
    ],
};
