import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import {
    index as teamsIndex,
    store as storeTeam,
} from '@/actions/App/Http/Controllers/TeamController';
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

type Sport = { id: number; name: string };
type Session = { id: number; name: string };
type District = { id: number; name: string };
type Unit = { id: number; name: string; district_id: number | null };

type FormData = {
    sport_id: string;
    session_id: string;
    location_type: 'unit' | 'district';
    district_id: string;
    unit_id: string;
    name: string;
    is_active: boolean;
};

export default function TeamsCreate({
    sessions,
    sports,
    districts,
    units,
}: {
    sessions: Session[];
    sports: Sport[];
    districts: District[];
    units: Unit[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: t('New team') },
        ],
    });

    const { data, setData, post, errors, processing } = useForm<FormData>({
        sport_id: '',
        session_id: '',
        location_type: 'unit',
        district_id: '',
        unit_id: '',
        name: '',
        is_active: true,
    });

    const selectedUnit = units.find((unit) => String(unit.id) === data.unit_id);
    const derivedDistrict = districts.find(
        (district) => district.id === selectedUnit?.district_id,
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTeam.url());
    }

    return (
        <>
            <Head title={t('New team')} />
            <h1 className="sr-only">{t('New team')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New team')}
                    description={t('Create a new team')}
                />

                <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
                    <div className="space-y-5 rounded-xl border bg-card p-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="sport_id">
                                    {t('Sport')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.sport_id}
                                    onValueChange={(v) =>
                                        setData('sport_id', v)
                                    }
                                >
                                    <SelectTrigger
                                        id="sport_id"
                                        className="w-full"
                                    >
                                        <SelectValue
                                            placeholder={t('Select sport')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sports.map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={String(s.id)}
                                            >
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.sport_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="session_id">
                                    {t('Session')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.session_id}
                                    onValueChange={(v) =>
                                        setData('session_id', v)
                                    }
                                >
                                    <SelectTrigger
                                        id="session_id"
                                        className="w-full"
                                    >
                                        <SelectValue
                                            placeholder={t('Select session')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={String(s.id)}
                                            >
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.session_id} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location_type">
                                {t('Team Location')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.location_type}
                                onValueChange={(value: 'unit' | 'district') => {
                                    setData('location_type', value);
                                    setData('unit_id', '');
                                    setData('district_id', '');
                                }}
                            >
                                <SelectTrigger
                                    id="location_type"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unit">
                                        {t('Create team for Unit')}
                                    </SelectItem>
                                    <SelectItem value="district">
                                        {t('Create team for District')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.location_type} />
                        </div>

                        {data.location_type === 'unit' ? (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="unit_id">
                                        {t('Unit')}{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={data.unit_id}
                                        onValueChange={(value) => {
                                            setData('unit_id', value);
                                            setData('district_id', '');
                                        }}
                                    >
                                        <SelectTrigger
                                            id="unit_id"
                                            className="w-full"
                                        >
                                            <SelectValue
                                                placeholder={t('Select unit')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {units.map((unit) => (
                                                <SelectItem
                                                    key={unit.id}
                                                    value={String(unit.id)}
                                                >
                                                    {unit.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.unit_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('District')}</Label>
                                    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                        {derivedDistrict?.name ??
                                            t(
                                                'District will be derived from the selected unit.',
                                            )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="district_id">
                                    {t('District')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.district_id}
                                    onValueChange={(value) =>
                                        setData('district_id', value)
                                    }
                                >
                                    <SelectTrigger
                                        id="district_id"
                                        className="w-full"
                                    >
                                        <SelectValue
                                            placeholder={t('Select district')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map((district) => (
                                            <SelectItem
                                                key={district.id}
                                                value={String(district.id)}
                                            >
                                                {district.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.district_id} />
                            </div>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('Team name')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="is_active">
                                    {t('Status')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.is_active ? '1' : '0'}
                                    onValueChange={(value) =>
                                        setData('is_active', value === '1')
                                    }
                                >
                                    <SelectTrigger
                                        id="is_active"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            {t('Active')}
                                        </SelectItem>
                                        <SelectItem value="0">
                                            {t('Inactive')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.is_active} />
                            </div>
                        </div>

                        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                            {t(
                                'Assign the team incharge after creating the team so history can be tracked properly.',
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={processing}>{t('Save team')}</Button>
                        <Button variant="outline" asChild>
                            <Link href={teamsIndex.url()}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
