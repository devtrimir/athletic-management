import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { Award, Dumbbell, IdCard, Link2, UserRound } from 'lucide-react';
import { useState } from 'react';
import {
    index as coachesIndex,
    show as showCoach,
    update,
} from '@/actions/App/Http/Controllers/CoachController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { MemberOption } from '@/components/member-picker';
import { MemberPicker } from '@/components/member-picker';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type SportOption = { id: number; name: string };
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
    member_id: number | null;
    display_name: string | null;
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
    certifications: Array<{
        id: number;
        name: string;
        certificate_type: string | null;
        issuer: string | null;
        issued_at: string | null;
        expired_at: string | null;
        attachment_path: string | null;
    }>;
    sports: Array<{
        id: number;
        pivot: {
            level_master_id: number | null;
            level: string | null;
            sport_event: string | null;
            is_primary: boolean;
            effective_from: string | null;
            effective_to: string | null;
            notes: string | null;
        };
        name: string;
    }>;
    member?: {
        id: number;
        member_code: string;
        full_name: string;
        pno: string | null;
        rank: string | null;
        mobile: string | null;
    } | null;
};

type CertificationRow = {
    id: number | '';
    name: string;
    certificate_type: string;
    issuer: string;
    issued_at: string;
    expired_at: string;
    attachment_path: string;
};

type SportRow = {
    id: number | '';
    sport_id: string;
    level_master_id: string;
    level: string;
    sport_event: string;
    is_primary: boolean;
    effective_from: string;
    effective_to: string;
    notes: string;
};

type ProtectedSport = {
    sport_id: number;
    sport_name: string;
    teams: string[];
    message: string;
};

type FormData = {
    full_name: string;
    pno: string;
    mobile: string;
    blood_group: string;
    nis_certified: boolean;
    member_id: number | null;
    display_name: string;
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
    certifications: CertificationRow[];
    sports: SportRow[];
};

function coachToCertificationRows(coach: Coach): CertificationRow[] {
    return coach.certifications.map((cert) => ({
        id: cert.id,
        name: cert.name,
        certificate_type: cert.certificate_type ?? '',
        issuer: cert.issuer ?? '',
        issued_at: cert.issued_at ?? '',
        expired_at: cert.expired_at ?? '',
        attachment_path: cert.attachment_path ?? '',
    }));
}

function coachToSportRows(coach: Coach): SportRow[] {
    return coach.sports.map((sport) => ({
        id: sport.id,
        sport_id: String(sport.id),
        level_master_id: sport.pivot.level_master_id
            ? String(sport.pivot.level_master_id)
            : '',
        level: sport.pivot.level ?? '',
        sport_event: sport.pivot.sport_event ?? '',
        is_primary: sport.pivot.is_primary,
        effective_from: sport.pivot.effective_from ?? '',
        effective_to: sport.pivot.effective_to ?? '',
        notes: sport.pivot.notes ?? '',
    }));
}

function coachToMemberOption(coach: Coach): MemberOption | null {
    if (!coach.member) {
        return null;
    }

    return {
        id: coach.member.id,
        member_code: '',
        pno: coach.member.pno,
        full_name: coach.member.full_name,
        player_category: '',
        player_level: '',
        current_status: '',
    };
}

export default function CoachesEdit({
    coach,
    sports,
    districts,
    units,
    ranks,
    designations,
    tiers,
    nisMasters,
    protectedSports,
    coachStatuses,
    genders,
}: {
    coach: Coach;
    sports: SportOption[];
    districts: { id: number; name: string }[];
    units: { id: number; name: string; district_id: number | null }[];
    ranks: RankOption[];
    designations: DesignationOption[];
    tiers: TierOption[];
    nisMasters: NisMasterOption[];
    protectedSports: ProtectedSport[];
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
    const sportItems: ComboboxItem[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
    }));

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name, href: showCoach.url(coach) },
            { title: t('Edit coach') },
        ],
    });

    const [pickedMember, setPickedMember] = useState<MemberOption | null>(
        coachToMemberOption(coach),
    );
    const [pendingSportRemovalIndex, setPendingSportRemovalIndex] = useState<
        number | null
    >(null);

    const { data, setData, patch, errors, processing } = useForm<FormData>({
        full_name: coach.full_name,
        pno: coach.pno ?? '',
        mobile: coach.mobile ?? '',
        blood_group: coach.blood_group ?? '',
        nis_certified: coach.nis_certified,
        member_id: coach.member_id,
        display_name: coach.display_name ?? '',
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
        certifications: coachToCertificationRows(coach),
        sports: coachToSportRows(coach),
    });

    function handleMemberChange(member: MemberOption | null): void {
        setPickedMember(member);
        setData((prev) => ({
            ...prev,
            member_id: member?.id ?? null,
            full_name: prev.full_name || (member?.full_name ?? ''),
            pno: prev.pno || (member?.pno ?? ''),
        }));
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        patch(update.url(coach));
    }

    function addCertification(): void {
        setData('certifications', [
            ...data.certifications,
            {
                id: '',
                name: '',
                certificate_type: '',
                issuer: '',
                issued_at: '',
                expired_at: '',
                attachment_path: '',
            },
        ]);
    }

    function removeCertification(index: number): void {
        setData(
            'certifications',
            data.certifications.filter((_, i) => i !== index),
        );
    }

    function setCertificationField(
        index: number,
        key: keyof Omit<CertificationRow, 'id'>,
        value: string,
    ): void {
        setData(
            'certifications',
            data.certifications.map((row, i) =>
                i === index ? { ...row, [key]: value } : row,
            ),
        );
    }

    function addSport(): void {
        setData('sports', [
            ...data.sports,
            {
                id: '',
                sport_id: '',
                level_master_id: '',
                level: '',
                sport_event: '',
                is_primary: false,
                effective_from: '',
                effective_to: '',
                notes: '',
            },
        ]);
    }

    function removeSport(index: number): void {
        setData(
            'sports',
            data.sports.filter((_, i) => i !== index),
        );
    }

    function setSportField(
        index: number,
        key: keyof Omit<SportRow, 'id'>,
        value: string | boolean,
    ): void {
        setData(
            'sports',
            data.sports.map((row, i) =>
                i === index ? { ...row, [key]: value } : row,
            ),
        );
    }

    function patchSportField(
        index: number,
        patch: Partial<Omit<SportRow, 'id'>>,
    ): void {
        setData(
            'sports',
            data.sports.map((row, i) =>
                i === index ? { ...row, ...patch } : row,
            ),
        );
    }

    const linkedMemberSummary = pickedMember
        ? [pickedMember.full_name, pickedMember.pno].filter(Boolean).join(' · ')
        : '';
    const pendingSportRemoval =
        pendingSportRemovalIndex !== null
            ? data.sports[pendingSportRemovalIndex]
            : null;
    const pendingSportRemovalLabel = pendingSportRemoval
        ? (sportItems.find(
              (item) => item.value === pendingSportRemoval.sport_id,
          )?.label ?? t('this sport specialization'))
        : t('this sport specialization');
    const profileTitle = data.display_name || data.full_name || coach.full_name;
    const profileSubtitle = [data.designation, data.pno]
        .filter(Boolean)
        .join(' · ');
    const selectedSportsCount = data.sports.filter(
        (sport) => sport.sport_id,
    ).length;
    const completedCertificationsCount = data.certifications.filter(
        (certification) => certification.name.trim() !== '',
    ).length;
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
        'display_name',
        'address',
        'bio',
        'nis_certified',
    ].some((field) => errorKeys.includes(field));
    const hasCertificationErrors = errorKeys.some((field) =>
        field.startsWith('certifications.'),
    );
    const hasSportErrors = errorKeys.some((field) =>
        field.startsWith('sports.'),
    );
    const hasMemberErrors = errorKeys.includes('member_id');

    function protectedSportForRow(sportId: string): ProtectedSport | undefined {
        return protectedSports.find(
            (sport) => String(sport.sport_id) === sportId,
        );
    }

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
                                'Maintain coach profile, certifications, and sport specialization.',
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
                    <Tabs defaultValue="profile">
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="overflow-x-auto">
                                <TabsList className="px-2">
                                    <TabsTrigger value="profile">
                                        {t('Coach details')}
                                        {hasProfileErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="certifications">
                                        {t('Certifications')}
                                        {completedCertificationsCount > 0 && (
                                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                                {completedCertificationsCount}
                                            </span>
                                        )}
                                        {hasCertificationErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="sports">
                                        {t('Sports specialization')}
                                        {selectedSportsCount > 0 && (
                                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                                {selectedSportsCount}
                                            </span>
                                        )}
                                        {hasSportErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="member">
                                        {t('Linked member')}
                                        {hasMemberErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6">
                                <TabsContent
                                    value="profile"
                                    className="mt-0 space-y-5"
                                >
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
                                        <Label htmlFor="display_name">
                                            {t('Display name')}
                                        </Label>
                                        <Input
                                            id="display_name"
                                            value={data.display_name}
                                            onChange={(e) =>
                                                setData(
                                                    'display_name',
                                                    e.target.value,
                                                )
                                            }
                                            maxLength={255}
                                        />
                                        <InputError
                                            message={errors.display_name}
                                        />
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
                                </TabsContent>

                                <TabsContent
                                    value="certifications"
                                    className="mt-0 space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                                <Award className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold">
                                                    {t('Certifications')}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t(
                                                        'NIS, federation, and specialist qualifications',
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addCertification}
                                        >
                                            {t('Add certification')}
                                        </Button>
                                    </div>

                                    {data.certifications.length === 0 ? (
                                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                            {t('No certifications added yet.')}
                                        </div>
                                    ) : (
                                        data.certifications.map(
                                            (certification, index) => (
                                                <div
                                                    key={`${certification.id}-${index}`}
                                                    className="space-y-4 rounded-lg border bg-muted/25 p-4"
                                                >
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t('Name')}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.name
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'name',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <InputError
                                                                message={
                                                                    (
                                                                        errors as Record<
                                                                            string,
                                                                            string
                                                                        >
                                                                    )?.[
                                                                        `certifications.${index}.name`
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t('Type')}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.certificate_type
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'certificate_type',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t('Issuer')}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.issuer
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'issuer',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t(
                                                                    'Attachment path',
                                                                )}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.attachment_path
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'attachment_path',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t('Issued at')}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.issued_at
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'issued_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t(
                                                                    'Expired at',
                                                                )}
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    certification.expired_at
                                                                }
                                                                onChange={(e) =>
                                                                    setCertificationField(
                                                                        index,
                                                                        'expired_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeCertification(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            {t('Remove')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>

                                <TabsContent
                                    value="sports"
                                    className="mt-0 space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                                <Dumbbell className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold">
                                                    {t('Sports specialization')}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t(
                                                        'Choose the sports this coach can be assigned to',
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addSport}
                                        >
                                            {t('Add sport')}
                                        </Button>
                                    </div>

                                    {data.sports.length === 0 ? (
                                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                            {t(
                                                'No sport specialization added yet.',
                                            )}
                                        </div>
                                    ) : (
                                        data.sports.map((sport, index) => (
                                            <div
                                                key={`${sport.id}-${index}`}
                                                className="space-y-4 rounded-lg border bg-muted/25 p-4"
                                            >
                                                {(() => {
                                                    const protectedSport =
                                                        protectedSportForRow(
                                                            sport.sport_id,
                                                        );
                                                    const isProtected =
                                                        !!protectedSport;

                                                    return (
                                                        <>
                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                <div className="grid gap-2">
                                                                    <Label>
                                                                        {t(
                                                                            'Sport',
                                                                        )}
                                                                    </Label>
                                                                    <Combobox
                                                                        value={
                                                                            sport.sport_id
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            setSportField(
                                                                                index,
                                                                                'sport_id',
                                                                                v,
                                                                            )
                                                                        }
                                                                        items={
                                                                            sportItems
                                                                        }
                                                                        placeholder={t(
                                                                            'Select sport',
                                                                        )}
                                                                        searchPlaceholder={t(
                                                                            'Search sports…',
                                                                        )}
                                                                        disabled={
                                                                            isProtected
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>
                                                                        {t(
                                                                            'Tier / level',
                                                                        )}
                                                                    </Label>
                                                                    <Combobox
                                                                        value={
                                                                            sport.level_master_id
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) => {
                                                                            const selected =
                                                                                tierItems.find(
                                                                                    (
                                                                                        item,
                                                                                    ) =>
                                                                                        item.value ===
                                                                                        v,
                                                                                );
                                                                            patchSportField(
                                                                                index,
                                                                                {
                                                                                    level_master_id:
                                                                                        v,
                                                                                    level:
                                                                                        selected?.label ??
                                                                                        '',
                                                                                },
                                                                            );
                                                                        }}
                                                                        items={
                                                                            tierItems
                                                                        }
                                                                        placeholder={t(
                                                                            'Select tier / level',
                                                                        )}
                                                                        searchPlaceholder={t(
                                                                            'Search tiers…',
                                                                        )}
                                                                        disabled={
                                                                            isProtected
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label>
                                                                    {t(
                                                                        'Sport event / discipline',
                                                                    )}
                                                                </Label>
                                                                <Input
                                                                    value={
                                                                        sport.sport_event
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setSportField(
                                                                            index,
                                                                            'sport_event',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder={t(
                                                                        'e.g. 100m, freestyle, kata',
                                                                    )}
                                                                    disabled={
                                                                        isProtected
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="grid gap-2 sm:grid-cols-3">
                                                                <div className="grid gap-2">
                                                                    <Label>
                                                                        {t(
                                                                            'From',
                                                                        )}
                                                                    </Label>
                                                                    <DatePicker
                                                                        value={
                                                                            sport.effective_from
                                                                        }
                                                                        onChange={(
                                                                            value,
                                                                        ) =>
                                                                            setSportField(
                                                                                index,
                                                                                'effective_from',
                                                                                value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isProtected
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>
                                                                        {t(
                                                                            'To',
                                                                        )}
                                                                    </Label>
                                                                    <DatePicker
                                                                        value={
                                                                            sport.effective_to
                                                                        }
                                                                        onChange={(
                                                                            value,
                                                                        ) =>
                                                                            setSportField(
                                                                                index,
                                                                                'effective_to',
                                                                                value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isProtected
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>
                                                                        {t(
                                                                            'Primary',
                                                                        )}
                                                                    </Label>
                                                                    <div className="flex items-center gap-3 pt-1">
                                                                        <Checkbox
                                                                            checked={
                                                                                sport.is_primary
                                                                            }
                                                                            onCheckedChange={(
                                                                                checked,
                                                                            ) =>
                                                                                setSportField(
                                                                                    index,
                                                                                    'is_primary',
                                                                                    !!checked,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isProtected
                                                                            }
                                                                        />
                                                                        <span className="text-sm text-muted-foreground">
                                                                            {t(
                                                                                'Mark as primary',
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {protectedSport ? (
                                                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                                                    {
                                                                        protectedSport.message
                                                                    }
                                                                </p>
                                                            ) : null}
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setPendingSportRemovalIndex(
                                                                            index,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isProtected
                                                                    }
                                                                >
                                                                    {t(
                                                                        'Remove',
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                <TabsContent
                                    value="member"
                                    className="mt-0 space-y-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                                            <Link2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                {t('Linked member')}
                                            </h3>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t(
                                                    'Link this coach to a member record (optional)',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="member_id">
                                            {t('Member')}
                                        </Label>
                                        <MemberPicker
                                            id="member_id"
                                            value={pickedMember}
                                            onChange={handleMemberChange}
                                            placeholder={t(
                                                'Search by name or PNO…',
                                            )}
                                        />
                                        <InputError
                                            message={errors.member_id}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {linkedMemberSummary}
                                    </p>
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>

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

            <AlertDialog
                open={pendingSportRemovalIndex !== null}
                onOpenChange={(open) =>
                    !open && setPendingSportRemovalIndex(null)
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('Remove sport specialization?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                'This will remove :sport from the coach profile. Existing protected sports cannot be removed.',
                            ).replace(':sport', pendingSportRemovalLabel)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingSportRemovalIndex !== null) {
                                    removeSport(pendingSportRemovalIndex);
                                }

                                setPendingSportRemovalIndex(null);
                            }}
                        >
                            {t('Remove')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
