import { Form, Head, Link } from '@inertiajs/react';
import UnitController from '@/actions/App/Http/Controllers/Settings/UnitController';
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

type District = {
    id: number;
    name: string;
};

type UnitType = {
    id: number;
    name: string;
    name_en: string | null;
};

export default function Create({
    districts,
    unitTypes,
}: {
    districts: District[];
    unitTypes: UnitType[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('New unit')} />

            <h1 className="sr-only">{t('New unit')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New unit')}
                    description={t('Add a new police unit')}
                />

                <Form
                    {...UnitController.store.form()}
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
                                            placeholder="e.g. प्रथम वाहिनी पीएसी"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="unit_type_id">
                                        {t('Unit type')}
                                    </Label>
                                    <Select name="unit_type_id" required>
                                        <SelectTrigger
                                            id="unit_type_id"
                                            className="w-full"
                                        >
                                            <SelectValue
                                                placeholder={t('Select a type')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unitTypes.map((u) => (
                                                <SelectItem
                                                    key={u.id}
                                                    value={String(u.id)}
                                                >
                                                    {u.name_en ?? u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.unit_type_id}
                                    />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="commandant">
                                            {t('Commandant')}{' '}
                                            <span className="font-normal text-muted-foreground">
                                                {t('(optional)')}
                                            </span>
                                        </Label>
                                        <Input
                                            id="commandant"
                                            name="commandant"
                                            placeholder="Officer name"
                                            maxLength={100}
                                        />
                                        <InputError
                                            message={errors.commandant}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="district_id">
                                            {t('District')}{' '}
                                            <span className="font-normal text-muted-foreground">
                                                {t('(optional)')}
                                            </span>
                                        </Label>
                                        <Select name="district_id">
                                            <SelectTrigger
                                                id="district_id"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map((d) => (
                                                    <SelectItem
                                                        key={d.id}
                                                        value={String(d.id)}
                                                    >
                                                        {d.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.district_id}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>
                                    {t('Create unit')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={UnitController.index.url()}>
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
            title: 'Units',
            href: UnitController.index.url(),
        },
        {
            title: 'New unit',
        },
    ],
};
