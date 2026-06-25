import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { IdCard, UserRound } from 'lucide-react';
import {
    index as coachesIndex,
    show as showCoach,
    update,
} from '@/actions/App/Http/Controllers/CoachController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type NisMasterOption = {
    id: number;
    code: string;
    name: string;
    short_name: string | null;
};
type RankOption = {
    id: number;
    code: string;
    name: string;
    short_name: string | null;
};
type DesignationOption = {
    id: number;
    code: string;
    name: string;
    short_name: string | null;
};
type TierOption = {
    id: number;
    code: string;
    label_hi: string;
    label_en: string;
    weight: number;
    label?: string;
};
type ComboboxItem = { value: string; label: string };
const GENDER_OPTIONS: ComboboxItem[] = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other gender' },
];

type Coach = {
    id: number;
    full_name: string;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    designation: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string;
    blood_group: string | null;
    district_id: number | null;
    unit_id: number | null;
    nis_master_id: number | null;
    tier_master_id: number | null;
    rank_master_id: number | null;
    designation_master_id: number | null;
    bio: string | null;
    address: string | null;
};

type FormData = {
    full_name: string;
    pno: string;
    mobile: string;
    blood_group: string;
    nis_certified: boolean;
    designation: string;
    rank_master_id: string;
    designation_master_id: string;
    tier_master_id: string;
    nis_master_id: string;
    district_id: string;
    unit_id: string;
    email: string;
    gender: string;
    date_of_birth: string;
    coach_status: string;
    bio: string;
    address: string;
    photo_path: string;
};

export default function CoachesEdit({
    coach,
    districts,
    units,
    ranks,
    designations,
    tiers,
    nisMasters,
    coachStatuses,
    genders,
}: {
    coach: Coach;
    districts: { id: number; name: string }[];
    units: { id: number; name: string; district_id: number | null }[];
    ranks: RankOption[];
    designations: DesignationOption[];
    tiers: TierOption[];
    nisMasters: NisMasterOption[];
    coachStatuses: string[];
    genders: string[];
}) {
    const { t } = useTranslation();
    const bloodGroupItems: ComboboxItem[] = [
        'A+',
        'A-',
        'B+',
        'B-',
        'O+',
        'O-',
        'AB+',
        'AB-',
    ].map((group) => ({
        value: group,
        label: group,
    }));
    const unitItems: ComboboxItem[] = units.map((unit) => ({
        value: String(unit.id),
        label: unit.name,
    }));
    const districtItems: ComboboxItem[] = districts.map((district) => ({
        value: String(district.id),
        label: district.name,
    }));
    const rankItems: ComboboxItem[] = ranks.map((master) => ({
        value: String(master.id),
        label: master.short_name
            ? `${master.name} (${master.short_name})`
            : master.name,
    }));
    const designationItems: ComboboxItem[] = designations.map((master) => ({
        value: String(master.id),
        label: master.short_name
            ? `${master.name} (${master.short_name})`
            : master.name,
    }));
    const tierItems: ComboboxItem[] = tiers.map((master) => ({
        value: String(master.id),
        label: master.label ?? master.label_en ?? master.label_hi,
    }));
    const nisItems: ComboboxItem[] = nisMasters.map((master) => ({
        value: String(master.id),
        label: master.short_name
            ? `${master.name} (${master.short_name})`
            : master.name,
    }));

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name, href: showCoach.url(coach) },
            { title: t('Edit coach') },
        ],
    });

    const { data, setData, patch, errors, processing } = useForm<FormData>({
        full_name: coach.full_name,
        pno: coach.pno ?? '',
        mobile: coach.mobile ?? '',
        blood_group: coach.blood_group ?? '',
        nis_certified: coach.nis_certified,
        designation: coach.designation ?? '',
        rank_master_id: coach.rank_master_id
            ? String(coach.rank_master_id)
            : '',
        designation_master_id: coach.designation_master_id
            ? String(coach.designation_master_id)
            : '',
        tier_master_id: coach.tier_master_id
            ? String(coach.tier_master_id)
            : '',
        nis_master_id: coach.nis_master_id ? String(coach.nis_master_id) : '',
        district_id: coach.district_id ? String(coach.district_id) : '',
        unit_id: coach.unit_id ? String(coach.unit_id) : '',
        email: coach.email ?? '',
        gender: coach.gender ?? '',
        date_of_birth: coach.date_of_birth ?? '',
        coach_status: coach.coach_status,
        bio: coach.bio ?? '',
        address: coach.address ?? '',
        photo_path: '',
    });

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        patch(update.url(coach));
    }

    const profileTitle = data.full_name || coach.full_name;
    const profileSubtitle = [data.designation, data.pno]
        .filter(Boolean)
        .join(' · ');
    const errorKeys = Object.keys(errors);
    const hasProfileErrors = [
        'full_name',
        'pno',
        'mobile',
        'designation',
        'email',
        'coach_status',
        'gender',
        'date_of_birth',
        'address',
        'bio',
        'nis_certified',
    ].some((field) => errorKeys.includes(field));

    return (
        <>
            <Head title={t('Edit coach')} />
            <h1 className="sr-only">{t('Edit coach')}</h1>

            <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b bg-muted/35 px-6 py-5">
                        <Heading
                            variant="small"
                            title={t('Edit coach')}
                            description={t(
                                'Maintain coach identity, contact, and service profile.',
                            )}
                        />
                    </div>
                    <div className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <UserRound className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-lg font-semibold">
                                    {profileTitle}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {profileSubtitle || t('Coach profile')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border bg-background px-3 py-1 font-medium">
                                {data.coach_status
                                    ? t(data.coach_status)
                                    : t('Status pending')}
                            </span>
                            <span className="rounded-full border bg-background px-3 py-1 font-medium">
                                {data.nis_certified
                                    ? t('NIS certified')
                                    : t('NIS not marked')}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <div className="border-b px-6 py-3 text-sm font-medium">
                            {t('Coach details')}
                            {hasProfileErrors && (
                                <span className="ml-2 inline-flex size-1.5 rounded-full bg-destructive" />
                            )}
                        </div>

                        <div className="space-y-5 p-6">
                                    <div className="flex items-center gap-3 border-b pb-4">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <IdCard className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                {t('Coach details')}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Identity, contact, and service profile',
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="full_name">
                                                {t('Name')}{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="full_name"
                                                value={data.full_name}
                                                onChange={(e) =>
                                                    setData(
                                                        'full_name',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={255}
                                                required
                                            />
                                            <InputError
                                                message={errors.full_name}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="pno">
                                                {t('PNO')}
                                            </Label>
                                            <Input
                                                id="pno"
                                                value={data.pno}
                                                onChange={(e) =>
                                                    setData(
                                                        'pno',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={20}
                                                className="font-mono"
                                            />
                                            <InputError message={errors.pno} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="mobile">
                                                {t('Mobile')}
                                            </Label>
                                            <Input
                                                id="mobile"
                                                value={data.mobile}
                                                onChange={(e) =>
                                                    setData(
                                                        'mobile',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={20}
                                            />
                                            <InputError
                                                message={errors.mobile}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="blood_group">
                                                {t('Blood group')}
                                            </Label>
                                            <Combobox
                                                id="blood_group"
                                                value={data.blood_group}
                                                onValueChange={(v) =>
                                                    setData('blood_group', v)
                                                }
                                                items={bloodGroupItems}
                                                placeholder={t(
                                                    'Select blood group',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search blood groups…',
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="unit_id">
                                                {t('Unit')}
                                            </Label>
                                            <Combobox
                                                id="unit_id"
                                                value={data.unit_id}
                                                onValueChange={(v) => {
                                                    setData('unit_id', v);
                                                    const selected = units.find(
                                                        (unit) =>
                                                            String(unit.id) ===
                                                            v,
                                                    );
                                                    const district =
                                                        districts.find(
                                                            (item) =>
                                                                item.id ===
                                                                selected?.district_id,
                                                        );
                                                    setData(
                                                        'district_id',
                                                        district
                                                            ? String(
                                                                  district.id,
                                                              )
                                                            : '',
                                                    );
                                                }}
                                                items={unitItems}
                                                placeholder={t('Select unit')}
                                                searchPlaceholder={t(
                                                    'Search units…',
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="district_id">
                                                {t('District')}
                                            </Label>
                                            <Combobox
                                                id="district_id"
                                                value={data.district_id}
                                                onValueChange={(v) =>
                                                    setData('district_id', v)
                                                }
                                                items={districtItems}
                                                placeholder={t(
                                                    'Select district',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search districts…',
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="rank_master_id">
                                                {t('Rank')}
                                            </Label>
                                            <Combobox
                                                id="rank_master_id"
                                                value={data.rank_master_id}
                                                onValueChange={(v) =>
                                                    setData('rank_master_id', v)
                                                }
                                                items={rankItems}
                                                placeholder={t('Select rank')}
                                                searchPlaceholder={t(
                                                    'Search ranks…',
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="designation_master_id">
                                                {t('Designation')}
                                            </Label>
                                            <Combobox
                                                id="designation_master_id"
                                                value={
                                                    data.designation_master_id
                                                }
                                                onValueChange={(v) =>
                                                    setData(
                                                        'designation_master_id',
                                                        v,
                                                    )
                                                }
                                                items={designationItems}
                                                placeholder={t(
                                                    'Select designation',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search designations…',
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="tier_master_id">
                                                {t('Tier / level')}
                                            </Label>
                                            <Combobox
                                                id="tier_master_id"
                                                value={data.tier_master_id}
                                                onValueChange={(v) =>
                                                    setData('tier_master_id', v)
                                                }
                                                items={tierItems}
                                                placeholder={t(
                                                    'Select tier / level',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search tiers…',
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="nis_master_id">
                                                {t('NIS info')}
                                            </Label>
                                            <Combobox
                                                id="nis_master_id"
                                                value={data.nis_master_id}
                                                onValueChange={(v) =>
                                                    setData('nis_master_id', v)
                                                }
                                                items={nisItems}
                                                placeholder={t(
                                                    'Select NIS info',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search NIS info…',
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                {t('Email')}
                                            </Label>
                                            <Input
                                                id="email"
                                                value={data.email}
                                                onChange={(e) =>
                                                    setData(
                                                        'email',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={255}
                                                type="email"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="coach_status">
                                                {t('Status')}
                                            </Label>
                                            <Select
                                                value={data.coach_status}
                                                onValueChange={(v) =>
                                                    setData('coach_status', v)
                                                }
                                            >
                                                <SelectTrigger
                                                    id="coach_status"
                                                    className="w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select status',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {coachStatuses.map(
                                                        (status) => (
                                                            <SelectItem
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {t(status)}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.coach_status}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="gender">
                                                {t('Gender')}
                                            </Label>
                                            <Select
                                                value={data.gender}
                                                onValueChange={(v) =>
                                                    setData('gender', v)
                                                }
                                            >
                                                <SelectTrigger
                                                    id="gender"
                                                    className="w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select gender',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {genders.map((value) => (
                                                        <SelectItem
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {GENDER_OPTIONS.find(
                                                                (option) =>
                                                                    option.value ===
                                                                    value,
                                                            )?.label ?? value}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.gender}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="date_of_birth">
                                                {t('Date of birth')}
                                            </Label>
                                            <DatePicker
                                                id="date_of_birth"
                                                value={data.date_of_birth}
                                                onChange={(value) =>
                                                    setData(
                                                        'date_of_birth',
                                                        value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={errors.date_of_birth}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="address">
                                            {t('Address')}
                                        </Label>
                                        <Textarea
                                            id="address"
                                            value={data.address}
                                            onChange={(e) =>
                                                setData(
                                                    'address',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError message={errors.address} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="bio">{t('Bio')}</Label>
                                        <Textarea
                                            id="bio"
                                            value={data.bio}
                                            onChange={(e) =>
                                                setData('bio', e.target.value)
                                            }
                                            rows={3}
                                        />
                                        <InputError message={errors.bio} />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="nis_certified"
                                            checked={data.nis_certified}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'nis_certified',
                                                    !!checked,
                                                )
                                            }
                                        />
                                        <Label htmlFor="nis_certified">
                                            {t('NIS certified')}
                                        </Label>
                                    </div>
                                    <InputError
                                        message={errors.nis_certified}
                                    />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Changes update coach search, team assignment, and exports.',
                            )}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={processing}>
                                {processing ? t('Saving…') : t('Save coach')}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href={showCoach.url(coach)}>
                                    {t('Cancel')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

        </>
    );
}
