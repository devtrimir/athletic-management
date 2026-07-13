import { Head, Link, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    index as membersIndex,
    store as storeMember,
} from '@/actions/App/Http/Controllers/MemberController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type District = { id: number; name: string };
type Unit = { id: number; name: string };
type SportOption = { id: number; name: string; name_en?: string | null };
type MasterOption = { code: string; name: string; short_name: string | null };

type FormData = {
    pno: string;
    full_name: string;
    full_name_normalized: string;
    father_name: string;
    rank: string;
    designation: string;
    gender: string;
    dob: string;
    joining_date: string;
    mobile: string;
    home_district_id: string;
    posting_district_id: string;
    current_unit_id: string;
    player_category: string;
    player_level: string;
    blood_group: string;
    caste: string;
    promotion_date: string;
    appointment: string;
    home_address: string;
    recruitment_type: string;
    sport_event: string;
    playable_sports: {
        sport_id: string;
        role: string;
        sport_event: string;
        notes: string;
    }[];
    other_notes: string;
    team_since: string;
};

export default function MembersCreate({
    districts,
    units,
    sports,
    ranks,
    designations,
}: {
    districts: District[];
    units: Unit[];
    sports: SportOption[];
    ranks: MasterOption[];
    designations: MasterOption[];
}) {
    const { t } = useTranslation();
    const { locale } = usePage().props;
    const [rankSelection, setRankSelection] = useState('');
    const [rankCustom, setRankCustom] = useState('');
    const [designationSelection, setDesignationSelection] = useState('');
    const [designationCustom, setDesignationCustom] = useState('');

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: t('New member') },
        ],
    });

    const { data, setData, post, transform, errors, processing } =
        useForm<FormData>({
            pno: '',
            full_name: '',
            full_name_normalized: '',
            father_name: '',
            rank: '',
            designation: '',
            gender: '',
            dob: '',
            joining_date: '',
            mobile: '',
            home_district_id: '',
            posting_district_id: '',
            current_unit_id: '',
            player_category: '',
            player_level: '',
            blood_group: '',
            caste: '',
            promotion_date: '',
            appointment: '',
            home_address: '',
            recruitment_type: '',
            playable_sports: [
                { sport_id: '', role: '', sport_event: '', notes: '' },
            ],
            sport_event: '',
            other_notes: '',
            team_since: '',
        });

    function normalizedPlayableSports() {
        return data.playable_sports
            .filter((sport) => sport.sport_id !== '')
            .map((sport) => ({
                ...sport,
                role: sport.role.trim(),
                sport_event: sport.sport_event.trim(),
                notes: sport.notes.trim(),
            }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            playable_sports: normalizedPlayableSports(),
        }));
        post(storeMember.url());
    }

    const hasPersonalErrors = !!(
        errors.full_name ||
        errors.full_name ||
        errors.father_name ||
        errors.gender ||
        errors.dob ||
        errors.mobile ||
        errors.blood_group ||
        errors.caste ||
        errors.home_address
    );
    const hasServiceErrors = !!(
        errors.pno ||
        errors.rank ||
        errors.designation ||
        errors.joining_date ||
        errors.current_unit_id ||
        errors.home_district_id ||
        errors.posting_district_id ||
        errors.appointment ||
        errors.promotion_date
    );
    const hasSportsErrors = !!(
        errors.player_category ||
        errors.player_level ||
        errors.sport_event ||
        errors.team_since ||
        errors.other_notes
    );

    function masterLabel(item: MasterOption): string {
        const name = locale === 'en' ? item.name : (item.name ?? item.name);

        return item.short_name ? `${item.short_name} - ${name}` : name;
    }

    const designationLabel = t('Designation');

    return (
        <>
            <Head title={t('New member')} />
            <h1 className="sr-only">{t('New member')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New member')}
                    description={t('Add a new athlete to the roster')}
                />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="personal">
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="overflow-x-auto">
                                <TabsList className="px-2">
                                    <TabsTrigger value="personal">
                                        {t('Personal information')}
                                        {hasPersonalErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="service">
                                        {t('Service information')}
                                        {hasServiceErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="sports">
                                        {t('Player information')}
                                        {hasSportsErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6">
                                {/* Personal */}
                                <TabsContent
                                    value="personal"
                                    className="mt-0 space-y-5"
                                >
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
                                            <Label htmlFor="full_name_normalized">
                                                {t('English name')}
                                            </Label>
                                            <Input
                                                id="full_name_normalized"
                                                value={data.full_name_normalized}
                                                onChange={(e) =>
                                                    setData(
                                                        'full_name_normalized',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={255}
                                                placeholder={t('Optional')}
                                            />
                                            <InputError
                                                message={
                                                    errors.full_name_normalized
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="father_name">
                                                {t("Father's name")}
                                            </Label>
                                            <Input
                                                id="father_name"
                                                value={data.father_name}
                                                onChange={(e) =>
                                                    setData(
                                                        'father_name',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={255}
                                            />
                                            <InputError
                                                message={errors.father_name}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="gender">
                                                {t('Gender')}{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
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
                                                    <SelectItem value="M">
                                                        {t('Male')}
                                                    </SelectItem>
                                                    <SelectItem value="F">
                                                        {t('Female')}
                                                    </SelectItem>
                                                    <SelectItem value="O">
                                                        {t('Other gender')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.gender}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="blood_group">
                                                {t('Blood group')}
                                            </Label>
                                            <Select
                                                value={data.blood_group}
                                                onValueChange={(v) =>
                                                    setData('blood_group', v)
                                                }
                                            >
                                                <SelectTrigger
                                                    id="blood_group"
                                                    className="w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select blood group',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(
                                                        [
                                                            'A+',
                                                            'A-',
                                                            'B+',
                                                            'B-',
                                                            'O+',
                                                            'O-',
                                                            'AB+',
                                                            'AB-',
                                                        ] as const
                                                    ).map((bg) => (
                                                        <SelectItem
                                                            key={bg}
                                                            value={bg}
                                                        >
                                                            {bg}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.blood_group}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="dob">
                                                {t('Date of birth')}
                                            </Label>
                                            <DatePicker
                                                id="dob"
                                                value={data.dob}
                                                onChange={(v) =>
                                                    setData('dob', v)
                                                }
                                            />
                                            <InputError message={errors.dob} />
                                        </div>
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
                                            <Label htmlFor="caste">
                                                {t('Caste')}
                                            </Label>
                                            <Input
                                                id="caste"
                                                value={data.caste}
                                                onChange={(e) =>
                                                    setData(
                                                        'caste',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={100}
                                            />
                                            <InputError
                                                message={errors.caste}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="home_address">
                                            {t('Home address')}
                                        </Label>
                                        <Textarea
                                            id="home_address"
                                            value={data.home_address}
                                            onChange={(e) =>
                                                setData(
                                                    'home_address',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                        <InputError
                                            message={errors.home_address}
                                        />
                                    </div>
                                </TabsContent>

                                {/* Service */}
                                <TabsContent
                                    value="service"
                                    className="mt-0 space-y-5"
                                >
                                    <div className="grid gap-5 sm:grid-cols-3">
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
                                        <div className="grid gap-2">
                                            <Label htmlFor="rank">
                                                {t('Rank')}
                                            </Label>
                                            <Select
                                                value={rankSelection}
                                                onValueChange={(value) => {
                                                    setRankSelection(value);
                                                    setData(
                                                        'rank',
                                                        value === '__other__'
                                                            ? rankCustom
                                                            : value,
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="rank"
                                                    className="h-9 w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select rank',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ranks.map((rank) => (
                                                        <SelectItem
                                                            key={rank.code}
                                                            value={rank.code}
                                                        >
                                                            {masterLabel(rank)}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="__other__">
                                                        {t('Other')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {rankSelection === '__other__' && (
                                                <Input
                                                    className="mt-2 h-9"
                                                    value={rankCustom}
                                                    onChange={(e) => {
                                                        setRankCustom(
                                                            e.target.value,
                                                        );
                                                        setData(
                                                            'rank',
                                                            e.target.value.trim(),
                                                        );
                                                    }}
                                                    maxLength={100}
                                                    placeholder={t(
                                                        'Enter rank',
                                                    )}
                                                />
                                            )}
                                            <InputError message={errors.rank} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="designation">
                                                {designationLabel}{' '}
                                                <span className="text-muted-foreground">
                                                    {t('(optional)')}
                                                </span>
                                            </Label>
                                            <Select
                                                value={designationSelection}
                                                onValueChange={(value) => {
                                                    setDesignationSelection(
                                                        value,
                                                    );
                                                    setData(
                                                        'designation',
                                                        value === '__other__'
                                                            ? designationCustom
                                                            : value,
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="designation"
                                                    className="h-9 w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select designation',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {designations.map(
                                                        (designation) => (
                                                            <SelectItem
                                                                key={
                                                                    designation.code
                                                                }
                                                                value={
                                                                    designation.code
                                                                }
                                                            >
                                                                {masterLabel(
                                                                    designation,
                                                                )}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                    <SelectItem value="__other__">
                                                        {t('Other')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {designationSelection ===
                                                '__other__' && (
                                                <Input
                                                    className="mt-2 h-9"
                                                    value={designationCustom}
                                                    onChange={(e) => {
                                                        setDesignationCustom(
                                                            e.target.value,
                                                        );
                                                        setData(
                                                            'designation',
                                                            e.target.value.trim(),
                                                        );
                                                    }}
                                                    maxLength={100}
                                                    placeholder={t(
                                                        'Enter designation',
                                                    )}
                                                />
                                            )}
                                            <InputError
                                                message={errors.designation}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="joining_date">
                                                {t('Joining date')}
                                            </Label>
                                            <DatePicker
                                                id="joining_date"
                                                value={data.joining_date}
                                                onChange={(v) =>
                                                    setData('joining_date', v)
                                                }
                                            />
                                            <InputError
                                                message={errors.joining_date}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="promotion_date">
                                                {t('Promotion date')}
                                            </Label>
                                            <DatePicker
                                                id="promotion_date"
                                                value={data.promotion_date}
                                                onChange={(v) =>
                                                    setData('promotion_date', v)
                                                }
                                            />
                                            <InputError
                                                message={errors.promotion_date}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="appointment">
                                                {t('Appointment')}
                                            </Label>
                                            <Input
                                                id="appointment"
                                                value={data.appointment}
                                                onChange={(e) =>
                                                    setData(
                                                        'appointment',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={255}
                                            />
                                            <InputError
                                                message={errors.appointment}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current_unit_id">
                                                {t('Unit')}
                                            </Label>
                                            <Combobox
                                                id="current_unit_id"
                                                value={data.current_unit_id}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'current_unit_id',
                                                        v,
                                                    )
                                                }
                                                items={units.map((u) => ({
                                                    value: String(u.id),
                                                    label:
                                                        locale === 'en'
                                                            ? u.name
                                                            : u.name,
                                                }))}
                                                placeholder={t('Select unit')}
                                                searchPlaceholder={t(
                                                    'Search units…',
                                                )}
                                            />
                                            <InputError
                                                message={errors.current_unit_id}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="posting_district_id">
                                                {t('Posting unit / district')}
                                            </Label>
                                            <Combobox
                                                id="posting_district_id"
                                                value={data.posting_district_id}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'posting_district_id',
                                                        v,
                                                    )
                                                }
                                                items={districts.map((d) => ({
                                                    value: String(d.id),
                                                    label:
                                                        locale === 'en'
                                                            ? d.name
                                                            : d.name,
                                                }))}
                                                placeholder={t(
                                                    'Select district',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search districts…',
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.posting_district_id
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="home_district_id">
                                                {t('Home district')}
                                            </Label>
                                            <Combobox
                                                id="home_district_id"
                                                value={data.home_district_id}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'home_district_id',
                                                        v,
                                                    )
                                                }
                                                items={districts.map((d) => ({
                                                    value: String(d.id),
                                                    label:
                                                        locale === 'en'
                                                            ? d.name
                                                            : d.name,
                                                }))}
                                                placeholder={t(
                                                    'Select district',
                                                )}
                                                searchPlaceholder={t(
                                                    'Search districts…',
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.home_district_id
                                                }
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Sports */}
                                <TabsContent
                                    value="sports"
                                    className="mt-0 space-y-5"
                                >
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="player_category">
                                                {t('Category')}{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={data.player_category}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'player_category',
                                                        v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="player_category"
                                                    className="w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select category',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GD">
                                                        {t('GD')}
                                                    </SelectItem>
                                                    <SelectItem value="SPORTS_QUOTA">
                                                        {t('SPORTS_QUOTA')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.player_category}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="player_level">
                                                {t('Level')}{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={data.player_level}
                                                onValueChange={(v) =>
                                                    setData('player_level', v)
                                                }
                                            >
                                                <SelectTrigger
                                                    id="player_level"
                                                    className="w-full"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select level',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ZONAL">
                                                        {t('ZONAL')}
                                                    </SelectItem>
                                                    <SelectItem value="NATIONAL">
                                                        {t('NATIONAL')}
                                                    </SelectItem>
                                                    <SelectItem value="INTERNATIONAL">
                                                        {t('INTERNATIONAL')}
                                                    </SelectItem>
                                                    <SelectItem value="AIPSC">
                                                        {t('AIPSC')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.player_level}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between">
                                            <Label>{t('Sports')}</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setData('playable_sports', [
                                                        ...data.playable_sports,
                                                        {
                                                            sport_id: '',
                                                            role: '',
                                                            sport_event: '',
                                                            notes: '',
                                                        },
                                                    ])
                                                }
                                            >
                                                {t('Add sport')}
                                            </Button>
                                        </div>
                                        {data.playable_sports.map(
                                            (row, index) => (
                                                <div
                                                    key={index}
                                                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
                                                >
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t('Sport')}
                                                        </Label>
                                                        <Combobox
                                                            id={`playable_sport_${index}`}
                                                            value={row.sport_id}
                                                            onValueChange={(
                                                                v,
                                                            ) =>
                                                                setData(
                                                                    'playable_sports',
                                                                    data.playable_sports.map(
                                                                        (
                                                                            item,
                                                                            i,
                                                                        ) =>
                                                                            i ===
                                                                            index
                                                                                ? {
                                                                                      ...item,
                                                                                      sport_id:
                                                                                          v,
                                                                                  }
                                                                                : item,
                                                                    ),
                                                                )
                                                            }
                                                            items={sports.map(
                                                                (sport) => ({
                                                                    value: String(
                                                                        sport.id,
                                                                    ),
                                                                    label: sport.name,
                                                                    description:
                                                                        sport.name_en ??
                                                                        '',
                                                                }),
                                                            )}
                                                            placeholder={t(
                                                                'Select sport',
                                                            )}
                                                            searchPlaceholder={t(
                                                                'Search sports…',
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t(
                                                                'Role / position',
                                                            )}
                                                        </Label>
                                                        <Input
                                                            value={row.role}
                                                            onChange={(e) =>
                                                                setData(
                                                                    'playable_sports',
                                                                    data.playable_sports.map(
                                                                        (
                                                                            item,
                                                                            i,
                                                                        ) =>
                                                                            i ===
                                                                            index
                                                                                ? {
                                                                                      ...item,
                                                                                      role: e
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : item,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t('Sport event')}
                                                        </Label>
                                                        <Input
                                                            value={
                                                                row.sport_event
                                                            }
                                                            onChange={(e) =>
                                                                setData(
                                                                    'playable_sports',
                                                                    data.playable_sports.map(
                                                                        (
                                                                            item,
                                                                            i,
                                                                        ) =>
                                                                            i ===
                                                                            index
                                                                                ? {
                                                                                      ...item,
                                                                                      sport_event:
                                                                                          e
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : item,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t('Notes')}
                                                        </Label>
                                                        <Textarea
                                                            rows={2}
                                                            value={row.notes}
                                                            onChange={(e) =>
                                                                setData(
                                                                    'playable_sports',
                                                                    data.playable_sports.map(
                                                                        (
                                                                            item,
                                                                            i,
                                                                        ) =>
                                                                            i ===
                                                                            index
                                                                                ? {
                                                                                      ...item,
                                                                                      notes: e
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : item,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="team_since">
                                                {t('Team since')}
                                            </Label>
                                            <DatePicker
                                                id="team_since"
                                                value={data.team_since}
                                                onChange={(v) =>
                                                    setData('team_since', v)
                                                }
                                            />
                                            <InputError
                                                message={errors.team_since}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="other_notes">
                                            {t('Other notes')}
                                        </Label>
                                        <Textarea
                                            id="other_notes"
                                            value={data.other_notes}
                                            onChange={(e) =>
                                                setData(
                                                    'other_notes',
                                                    e.target.value,
                                                )
                                            }
                                            rows={4}
                                        />
                                        <InputError
                                            message={errors.other_notes}
                                        />
                                    </div>
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {t('Create member')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={membersIndex.url()}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
