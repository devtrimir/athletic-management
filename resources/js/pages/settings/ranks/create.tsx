import { Form, Head, Link } from '@inertiajs/react';
import RankController from '@/actions/App/Http/Controllers/Settings/RankController';
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

const CADRES = [
    'SUBORDINATE',
    'PPS',
    'IPS',
    'PPS_OR_IPS',
    'IPS_OR_PPS',
] as const;

export default function Create() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('New rank')} />
            <h1 className="sr-only">{t('New rank')}</h1>
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New rank')}
                    description={t('Add a new rank reference record')}
                />

                <Form
                    {...RankController.store.form()}
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
                                        <Label htmlFor="rank_order">
                                            {t('Order')}
                                        </Label>
                                        <Input
                                            id="rank_order"
                                            name="rank_order"
                                            type="number"
                                            min={1}
                                            required
                                        />
                                        <InputError
                                            message={errors.rank_order}
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
                                        <Label htmlFor="cadre_type">
                                            {t('Cadre type')}
                                        </Label>
                                        <Select name="cadre_type">
                                            <SelectTrigger id="cadre_type">
                                                <SelectValue
                                                    placeholder={t(
                                                        'Select cadre',
                                                    )}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CADRES.map((c) => (
                                                    <SelectItem
                                                        key={c}
                                                        value={c}
                                                    >
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.cadre_type}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="aliases">
                                        {t('Aliases')}
                                    </Label>
                                    <Textarea
                                        id="aliases"
                                        name="aliases"
                                        placeholder={t(
                                            'Comma-separated aliases',
                                        )}
                                    />
                                    <InputError message={errors.aliases} />
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="is_gazetted">
                                            {t('Gazetted')}
                                        </Label>
                                        <Select
                                            name="is_gazetted"
                                            defaultValue="0"
                                        >
                                            <SelectTrigger id="is_gazetted">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">
                                                    {t('No')}
                                                </SelectItem>
                                                <SelectItem value="1">
                                                    {t('Yes')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.is_gazetted}
                                        />
                                    </div>
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
                                    {t('Create rank')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={RankController.index.url()}>
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
        { title: 'Ranks', href: RankController.index.url() },
        { title: 'New rank' },
    ],
};
