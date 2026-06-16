import { Head, Link, router, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { index as membersIndex, show as showMember, update } from '@/actions/App/Http/Controllers/MemberController';
import { destroy as destroyMemberPhoto, store as storeMemberPhoto } from '@/actions/App/Http/Controllers/MemberPhotoController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type District = { id: number; name: string };
type Unit = { id: number; name: string };
type SportOption = { id: number; name: string };
type PlayableSport = { id: number; name: string };
type MasterOption = { code: string; name: string; short_name: string | null };

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name: string;
    father_name: string | null;
    rank: string | null;
    designation: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    home_district_id: number | null;
    posting_district_id: number | null;
    current_unit_id: number | null;
    player_category: string;
    player_level: string;
    photo_path: string | null;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    home_address: string | null;
    recruitment_type: string | null;
    playable_sports: Array<PlayableSport & {
        pivot?: {
            role: string | null;
            position: string | null;
            sport_event: string | null;
            notes: string | null;
        };
        role: string | null;
        position: string | null;
        sport_event: string | null;
        notes: string | null;
    }>;
    sport_event: string | null;
    other_notes: string | null;
    team_since: string | null;
};

type FormData = {
    pno: string;
    full_name: string;
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
    playable_sports: { sport_id: string; role: string; sport_event: string; notes: string }[];
    sport_event: string;
    other_notes: string;
    team_since: string;
};

export default function MembersEdit({ member, districts, units, sports, ranks, designations }: { member: Member; districts: District[]; units: Unit[]; sports: SportOption[]; ranks: MasterOption[]; designations: MasterOption[] }) {
    const { t } = useTranslation();
    const { locale } = usePage().props;
    const initialRankSelection = ranks.find((rank) => [rank.code, rank.name, rank.name, rank.short_name].filter(Boolean).includes(member.rank ?? ''))?.code ?? '__other__';
    const initialDesignationSelection = designations.find((designation) => [designation.code, designation.name, designation.name, designation.short_name].filter(Boolean).includes(member.designation ?? ''))?.code ?? '__other__';
    const [rankSelection, setRankSelection] = useState(initialRankSelection);
    const [rankCustom, setRankCustom] = useState(initialRankSelection === '__other__' ? (member.rank ?? '') : '');
    const [designationSelection, setDesignationSelection] = useState(initialDesignationSelection);
    const [designationCustom, setDesignationCustom] = useState(initialDesignationSelection === '__other__' ? (member.designation ?? '') : '');

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: member.full_name, href: showMember.url(member) },
            { title: t('Edit member') },
        ],
    });

    const { data, setData, patch, errors, processing } = useForm<FormData>({
        pno: member.pno ?? '',
        full_name: member.full_name,
        father_name: member.father_name ?? '',
        rank: member.rank ?? '',
        designation: member.designation ?? '',
        gender: member.gender,
        dob: member.dob ?? '',
        joining_date: member.joining_date ?? '',
        mobile: member.mobile ?? '',
        home_district_id: member.home_district_id != null ? String(member.home_district_id) : '',
        posting_district_id: member.posting_district_id != null ? String(member.posting_district_id) : '',
        current_unit_id: member.current_unit_id != null ? String(member.current_unit_id) : '',
        player_category: member.player_category,
        player_level: member.player_level,
        blood_group: member.blood_group ?? '',
        caste: member.caste ?? '',
        promotion_date: member.promotion_date ?? '',
        appointment: member.appointment ?? '',
        home_address: member.home_address ?? '',
        recruitment_type: member.recruitment_type ?? '',
        playable_sports: member.playable_sports.length > 0 ? member.playable_sports.map((sport) => ({
            sport_id: String(sport.id),
            role: sport.role ?? sport.pivot?.role ?? '',
            sport_event: sport.sport_event ?? sport.pivot?.sport_event ?? '',
            notes: sport.notes ?? sport.pivot?.notes ?? '',
        })) : [{ sport_id: '', role: '', sport_event: '', notes: '' }],
        sport_event: member.sport_event ?? '',
        other_notes: member.other_notes ?? '',
        team_since: member.team_since ?? '',
    });

    const hasPersonalErrors = !!(
        errors.full_name || errors.full_name || errors.father_name ||
        errors.gender || errors.dob || errors.mobile || errors.blood_group ||
        errors.caste || errors.home_address
    );
    const hasServiceErrors = !!(
        errors.pno || errors.rank || errors.designation || errors.joining_date || errors.current_unit_id ||
        errors.home_district_id || errors.posting_district_id || errors.appointment || errors.promotion_date
    );
    const hasSportsErrors = !!(
        errors.player_category || errors.player_level || errors.sport_event || errors.team_since || errors.other_notes
    );

    function masterLabel(item: MasterOption): string {
        const name = locale === 'en' ? item.name : (item.name ?? item.name);

        return item.short_name ? `${item.short_name} - ${name}` : name;
    }

    const designationLabel = t('Designation');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update.url(member));
    }

    return (
        <>
            <Head title={t('Edit member')} />
            <h1 className="sr-only">{t('Edit member')}</h1>

            <div className="space-y-6">
                {/* Header: title + photo */}
                <div className="flex items-start justify-between gap-6">
                    <Heading variant="small" title={t('Edit member')} description={member.full_name} />

                    <div className="shrink-0">
                        {member.photo_path ? (
                            <div className="relative group size-20 rounded-xl overflow-hidden border bg-muted">
                                <img
                                    src={`/storage/${member.photo_path}`}
                                    alt={member.full_name}
                                    className="size-full object-cover"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                                    onClick={() => router.delete(destroyMemberPhoto.url(member))}
                                >
                                    {t('Remove photo')}
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center size-20 rounded-xl border-2 border-dashed bg-muted cursor-pointer hover:bg-muted/80 transition-colors">
                                <span className="text-xs text-muted-foreground text-center leading-tight px-1">{t('Upload photo')}</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];

                                        if (!file) {
                                            return;
                                        }

                                        const fd = new FormData();
                                        fd.append('photo', file);
                                        router.post(storeMemberPhoto.url(member), fd);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="personal">
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <TabsList className="px-2">
                                    <TabsTrigger
                                        value="personal"
                                    >
                                        {t('Personal information')}
                                        {hasPersonalErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="service"
                                    >
                                        {t('Service information')}
                                        {hasServiceErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="sports"
                                    >
                                        {t('Player information')}
                                        {hasSportsErrors && (
                                            <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6">
                                {/* Personal */}
                                <TabsContent value="personal" className="mt-0 space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="full_name">
                                                {t('Name')} <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="full_name"
                                                value={data.full_name}
                                                onChange={(e) => setData('full_name', e.target.value)}
                                                maxLength={255}
                                                required
                                            />
                                            <InputError message={errors.full_name} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="father_name">{t("Father's name")}</Label>
                                            <Input
                                                id="father_name"
                                                value={data.father_name}
                                                onChange={(e) => setData('father_name', e.target.value)}
                                                maxLength={255}
                                            />
                                            <InputError message={errors.father_name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="gender">
                                                {t('Gender')} <span className="text-destructive">*</span>
                                            </Label>
                                            <Select value={data.gender} onValueChange={(v) => setData('gender', v)}>
                                                <SelectTrigger id="gender" className="w-full">
                                                    <SelectValue placeholder={t('Select gender')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M">{t('Male')}</SelectItem>
                                                    <SelectItem value="F">{t('Female')}</SelectItem>
                                                    <SelectItem value="O">{t('Other gender')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.gender} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="blood_group">{t('Blood group')}</Label>
                                            <Select value={data.blood_group} onValueChange={(v) => setData('blood_group', v)}>
                                                <SelectTrigger id="blood_group" className="w-full">
                                                    <SelectValue placeholder={t('Select blood group')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const).map((bg) => (
                                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.blood_group} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="dob">{t('Date of birth')}</Label>
                                            <DatePicker
                                                id="dob"
                                                value={data.dob}
                                                onChange={(v) => setData('dob', v)}
                                            />
                                            <InputError message={errors.dob} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="mobile">{t('Mobile')}</Label>
                                            <Input
                                                id="mobile"
                                                value={data.mobile}
                                                onChange={(e) => setData('mobile', e.target.value)}
                                                maxLength={20}
                                            />
                                            <InputError message={errors.mobile} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="caste">{t('Caste')}</Label>
                                            <Input
                                                id="caste"
                                                value={data.caste}
                                                onChange={(e) => setData('caste', e.target.value)}
                                                maxLength={100}
                                            />
                                            <InputError message={errors.caste} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="home_address">{t('Home address')}</Label>
                                        <Textarea
                                            id="home_address"
                                            value={data.home_address}
                                            onChange={(e) => setData('home_address', e.target.value)}
                                            rows={3}
                                        />
                                        <InputError message={errors.home_address} />
                                    </div>
                                </TabsContent>

                                {/* Service */}
                                <TabsContent value="service" className="mt-0 space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="pno">{t('PNO')}</Label>
                                            <Input
                                                id="pno"
                                                value={data.pno}
                                                onChange={(e) => setData('pno', e.target.value)}
                                                maxLength={20}
                                                className="font-mono"
                                            />
                                            <InputError message={errors.pno} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="rank">{t('Rank')}</Label>
                                            <Select
                                                value={rankSelection}
                                                onValueChange={(value) => {
                                                    setRankSelection(value);
                                                    setData('rank', value === '__other__' ? rankCustom : value);
                                                }}
                                            >
                                                <SelectTrigger id="rank" className="h-9 w-full">
                                                    <SelectValue placeholder={t('Select rank')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ranks.map((rank) => (
                                                        <SelectItem key={rank.code} value={rank.code}>
                                                            {masterLabel(rank)}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="__other__">{t('Other')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {rankSelection === '__other__' && (
                                                <Input
                                                    className="mt-2 h-9"
                                                    value={rankCustom}
                                                    onChange={(e) => {
                                                        setRankCustom(e.target.value);
                                                        setData('rank', e.target.value.trim());
                                                    }}
                                                    maxLength={100}
                                                    placeholder={t('Enter rank')}
                                                />
                                            )}
                                            <InputError message={errors.rank} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="designation">
                                                {designationLabel}{' '}
                                                <span className="text-muted-foreground">{t('(optional)')}</span>
                                            </Label>
                                            <Select
                                                value={designationSelection}
                                                onValueChange={(value) => {
                                                    setDesignationSelection(value);
                                                    setData('designation', value === '__other__' ? designationCustom : value);
                                                }}
                                            >
                                                <SelectTrigger id="designation" className="h-9 w-full">
                                                    <SelectValue placeholder={t('Select designation')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {designations.map((designation) => (
                                                        <SelectItem key={designation.code} value={designation.code}>
                                                            {masterLabel(designation)}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="__other__">{t('Other')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {designationSelection === '__other__' && (
                                                <Input
                                                    className="mt-2 h-9"
                                                    value={designationCustom}
                                                    onChange={(e) => {
                                                        setDesignationCustom(e.target.value);
                                                        setData('designation', e.target.value.trim());
                                                    }}
                                                    maxLength={100}
                                                    placeholder={t('Enter designation')}
                                                />
                                            )}
                                            <InputError message={errors.designation} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="joining_date">{t('Joining date')}</Label>
                                            <DatePicker
                                                id="joining_date"
                                                value={data.joining_date}
                                                onChange={(v) => setData('joining_date', v)}
                                            />
                                            <InputError message={errors.joining_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="promotion_date">{t('Promotion date')}</Label>
                                            <DatePicker
                                                id="promotion_date"
                                                value={data.promotion_date}
                                                onChange={(v) => setData('promotion_date', v)}
                                            />
                                            <InputError message={errors.promotion_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="appointment">{t('Appointment')}</Label>
                                            <Input
                                                id="appointment"
                                                value={data.appointment}
                                                onChange={(e) => setData('appointment', e.target.value)}
                                                maxLength={255}
                                            />
                                            <InputError message={errors.appointment} />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current_unit_id">{t('Unit')}</Label>
                                            <Combobox
                                                id="current_unit_id"
                                                value={data.current_unit_id}
                                                onValueChange={(v) => setData('current_unit_id', v)}
                                                items={units.map((u) => ({ value: String(u.id), label: locale === 'en' ? u.name : u.name }))}
                                                placeholder={t('Select unit')}
                                                searchPlaceholder={t('Search units…')}
                                            />
                                            <InputError message={errors.current_unit_id} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="posting_district_id">{t('Posting unit / district')}</Label>
                                            <Combobox
                                                id="posting_district_id"
                                                value={data.posting_district_id}
                                                onValueChange={(v) => setData('posting_district_id', v)}
                                                items={districts.map((d) => ({ value: String(d.id), label: locale === 'en' ? d.name : d.name }))}
                                                placeholder={t('Select district')}
                                                searchPlaceholder={t('Search districts…')}
                                            />
                                            <InputError message={errors.posting_district_id} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="home_district_id">{t('Home district')}</Label>
                                            <Combobox
                                                id="home_district_id"
                                                value={data.home_district_id}
                                                onValueChange={(v) => setData('home_district_id', v)}
                                                items={districts.map((d) => ({ value: String(d.id), label: locale === 'en' ? d.name : d.name }))}
                                                placeholder={t('Select district')}
                                                searchPlaceholder={t('Search districts…')}
                                            />
                                            <InputError message={errors.home_district_id} />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Sports */}
                                <TabsContent value="sports" className="mt-0 space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="player_category">
                                                {t('Category')} <span className="text-destructive">*</span>
                                            </Label>
                                            <Select value={data.player_category} onValueChange={(v) => setData('player_category', v)}>
                                                <SelectTrigger id="player_category" className="w-full">
                                                    <SelectValue placeholder={t('Select category')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GD">{t('GD')}</SelectItem>
                                                    <SelectItem value="SPORTS_QUOTA">{t('SPORTS_QUOTA')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.player_category} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="player_level">
                                                {t('Level')} <span className="text-destructive">*</span>
                                            </Label>
                                            <Select value={data.player_level} onValueChange={(v) => setData('player_level', v)}>
                                                <SelectTrigger id="player_level" className="w-full">
                                                    <SelectValue placeholder={t('Select level')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ZONAL">{t('ZONAL')}</SelectItem>
                                                    <SelectItem value="NATIONAL">{t('NATIONAL')}</SelectItem>
                                                    <SelectItem value="INTERNATIONAL">{t('INTERNATIONAL')}</SelectItem>
                                                    <SelectItem value="AIPSC">{t('AIPSC')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.player_level} />
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between">
                                            <Label>{t('Sports')}</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={() => setData('playable_sports', [...data.playable_sports, { sport_id: '', role: '', sport_event: '', notes: '' }])}>
                                                {t('Add sport')}
                                            </Button>
                                        </div>
                                        {data.playable_sports.map((row, index) => (
                                            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label>{t('Sport')}</Label>
                                                    <Select value={row.sport_id} onValueChange={(v) => setData('playable_sports', data.playable_sports.map((item, i) => i === index ? { ...item, sport_id: v } : item))}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder={t('Select sport')} /></SelectTrigger>
                                                        <SelectContent>
                                                            {sports.map((s) => <SelectItem key={s.id} value={String(s.id)}>{locale === 'en' ? s.name : s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>{t('Role / position')}</Label>
                                                    <Input value={row.role} onChange={(e) => setData('playable_sports', data.playable_sports.map((item, i) => i === index ? { ...item, role: e.target.value } : item))} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>{t('Sport event')}</Label>
                                                    <Input value={row.sport_event} onChange={(e) => setData('playable_sports', data.playable_sports.map((item, i) => i === index ? { ...item, sport_event: e.target.value } : item))} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>{t('Notes')}</Label>
                                                    <Textarea rows={2} value={row.notes} onChange={(e) => setData('playable_sports', data.playable_sports.map((item, i) => i === index ? { ...item, notes: e.target.value } : item))} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="team_since">{t('Team since')}</Label>
                                            <DatePicker
                                                id="team_since"
                                                value={data.team_since}
                                                onChange={(v) => setData('team_since', v)}
                                            />
                                            <InputError message={errors.team_since} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="other_notes">{t('Other notes')}</Label>
                                        <Textarea
                                            id="other_notes"
                                            value={data.other_notes}
                                            onChange={(e) => setData('other_notes', e.target.value)}
                                            rows={4}
                                        />
                                        <InputError message={errors.other_notes} />
                                    </div>
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {t('Save changes')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={showMember.url(member)}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
