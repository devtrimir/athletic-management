import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { Award, Dumbbell, IdCard, Link2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { index as coachesIndex, store as storeCoach } from '@/actions/App/Http/Controllers/CoachController';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { MemberOption } from '@/components/member-picker';
import { MemberPicker } from '@/components/member-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type SportOption = { id: number; name: string };

type CertificationRow = {
    name: string;
    certificate_type: string;
    issuer: string;
    issued_at: string;
    expired_at: string;
    attachment_path: string;
};

type SportRow = {
    sport_id: string;
    level: string;
    is_primary: boolean;
    effective_from: string;
    effective_to: string;
    notes: string;
};

type FormData = {
    full_name: string;
    pno: string;
    mobile: string;
    nis_certified: boolean;
    member_id: number | null;
    display_name: string;
    designation: string;
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

export default function CoachesCreate({
    sports,
    coachStatuses,
    genders,
}: {
    sports: SportOption[];
    coachStatuses: string[];
    genders: string[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: t('New coach') },
        ],
    });

    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);

    const { data, setData, post, errors, processing } = useForm<FormData>({
        full_name: '',
        pno: '',
        mobile: '',
        nis_certified: false,
        member_id: null,
        display_name: '',
        designation: '',
        email: '',
        gender: '',
        date_of_birth: '',
        coach_status: 'ACTIVE',
        bio: '',
        address: '',
        photo_path: '',
        certifications: [],
        sports: [],
    });

    function handleMemberChange(member: MemberOption | null): void {
        setPickedMember(member);
        setData((prev) => ({
            ...prev,
            member_id: member?.id ?? null,
            full_name: prev.full_name || (member?.full_name ?? ''),
            pno: prev.pno || (member?.pno ?? ''),
            designation: prev.designation,
        }));
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        post(storeCoach.url());
    }

    function linkedMemberSummary(member: MemberOption | null): string {
        if (!member) {
            return '';
        }

        return [member.member_code, member.full_name, member.pno].filter(Boolean).join(' · ');
    }

    function addCertification(): void {
        setData('certifications', [
            ...data.certifications,
            {
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

    function setCertificationField(index: number, key: keyof CertificationRow, value: string): void {
        setData(
            'certifications',
            data.certifications.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
        );
    }

    function addSport(): void {
        setData('sports', [
            ...data.sports,
            {
                sport_id: '',
                level: '',
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

    function setSportField(index: number, key: keyof SportRow, value: string | boolean): void {
        setData(
            'sports',
            data.sports.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
        );
    }

    const profileTitle = data.display_name || data.full_name || t('New coach profile');
    const profileSubtitle = [data.designation, data.pno].filter(Boolean).join(' · ');
    const selectedSportsCount = data.sports.filter((sport) => sport.sport_id).length;
    const completedCertificationsCount = data.certifications.filter((certification) => certification.name.trim() !== '').length;
    const errorKeys = Object.keys(errors);
    const hasProfileErrors = ['full_name', 'pno', 'mobile', 'designation', 'email', 'coach_status', 'gender', 'date_of_birth', 'display_name', 'address', 'bio', 'nis_certified'].some((field) => errorKeys.includes(field));
    const hasCertificationErrors = errorKeys.some((field) => field.startsWith('certifications.'));
    const hasSportErrors = errorKeys.some((field) => field.startsWith('sports.'));
    const hasMemberErrors = errorKeys.includes('member_id');

    return (
        <>
            <Head title={t('New coach')} />
            <h1 className="sr-only">{t('New coach')}</h1>

            <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b bg-muted/35 px-6 py-5">
                        <Heading
                            variant="small"
                            title={t('New coach')}
                            description={t('Create a coach profile for team assignments, certifications, and sport specialization.')}
                        />
                    </div>
                    <div className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <UserRound className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-lg font-semibold">{profileTitle}</p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {profileSubtitle || t('Profile details will appear here as you type.')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border bg-background px-3 py-1 font-medium">
                                {data.coach_status ? t(data.coach_status) : t('Status pending')}
                            </span>
                            <span className="rounded-full border bg-background px-3 py-1 font-medium">
                                {data.nis_certified ? t('NIS certified') : t('NIS not marked')}
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
                                        {hasProfileErrors && <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />}
                                    </TabsTrigger>
                                    <TabsTrigger value="certifications">
                                        {t('Certifications')}
                                        {completedCertificationsCount > 0 && (
                                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                                {completedCertificationsCount}
                                            </span>
                                        )}
                                        {hasCertificationErrors && <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />}
                                    </TabsTrigger>
                                    <TabsTrigger value="sports">
                                        {t('Sports specialization')}
                                        {selectedSportsCount > 0 && (
                                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                                {selectedSportsCount}
                                            </span>
                                        )}
                                        {hasSportErrors && <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />}
                                    </TabsTrigger>
                                    <TabsTrigger value="member">
                                        {t('Linked member')}
                                        {hasMemberErrors && <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-destructive" />}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6">
                                <TabsContent value="profile" className="mt-0 space-y-5">
                        <div className="flex items-center gap-3 border-b pb-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <IdCard className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">{t('Coach details')}</h3>
                                <p className="text-xs text-muted-foreground">{t('Identity, contact, and service profile')}</p>
                            </div>
                        </div>

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
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
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
                                <Label htmlFor="designation">{t('Designation')}</Label>
                                <Input
                                    id="designation"
                                    value={data.designation}
                                    onChange={(e) => setData('designation', e.target.value)}
                                    maxLength={255}
                                />
                                <InputError message={errors.designation} />
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('Email')}</Label>
                                <Input
                                    id="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    maxLength={255}
                                    type="email"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="coach_status">{t('Status')}</Label>
                                <Select
                                    value={data.coach_status}
                                    onValueChange={(v) => setData('coach_status', v)}
                                >
                                    <SelectTrigger id="coach_status" className="w-full">
                                        <SelectValue placeholder={t('Select status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {coachStatuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.coach_status} />
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="gender">{t('Gender')}</Label>
                                <Select value={data.gender} onValueChange={(v) => setData('gender', v)}>
                                    <SelectTrigger id="gender" className="w-full">
                                        <SelectValue placeholder={t('Select gender')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {genders.map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {t(value)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.gender} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date_of_birth">{t('Date of birth')}</Label>
                                <DatePicker id="date_of_birth" value={data.date_of_birth} onChange={(v) => setData('date_of_birth', v)} />
                                <InputError message={errors.date_of_birth} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="display_name">{t('Display name')}</Label>
                            <Input
                                id="display_name"
                                value={data.display_name}
                                onChange={(e) => setData('display_name', e.target.value)}
                                maxLength={255}
                            />
                            <InputError message={errors.display_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">{t('Address')}</Label>
                            <Textarea
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                rows={3}
                            />
                            <InputError message={errors.address} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="bio">{t('Bio')}</Label>
                            <Textarea
                                id="bio"
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={3}
                            />
                            <InputError message={errors.bio} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="nis_certified"
                                checked={data.nis_certified}
                                onCheckedChange={(checked) => setData('nis_certified', !!checked)}
                            />
                            <Label htmlFor="nis_certified">{t('NIS certified')}</Label>
                        </div>
                        <InputError message={errors.nis_certified} />
                                </TabsContent>

                                <TabsContent value="certifications" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                    <Award className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">{t('Certifications')}</h3>
                                    <p className="text-xs text-muted-foreground">{t('NIS, federation, and specialist qualifications')}</p>
                                </div>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                                {t('Add certification')}
                            </Button>
                        </div>

                        {data.certifications.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                {t('No certifications added yet.')}
                            </div>
                        ) : data.certifications.map((certification, index) => (
                            <div key={index} className="space-y-4 rounded-lg border bg-muted/25 p-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Name')}</Label>
                                        <Input
                                            value={certification.name}
                                            onChange={(e) => setCertificationField(index, 'name', e.target.value)}
                                        />
                                        <InputError message={(errors as Record<string, string>)?.[`certifications.${index}.name`]} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('Type')}</Label>
                                        <Input
                                            value={certification.certificate_type}
                                            onChange={(e) => setCertificationField(index, 'certificate_type', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Issuer')}</Label>
                                        <Input
                                            value={certification.issuer}
                                            onChange={(e) => setCertificationField(index, 'issuer', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('Attachment path')}</Label>
                                        <Input
                                            value={certification.attachment_path}
                                            onChange={(e) => setCertificationField(index, 'attachment_path', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Issued at')}</Label>
                                        <Input
                                            value={certification.issued_at}
                                            onChange={(e) => setCertificationField(index, 'issued_at', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('Expired at')}</Label>
                                        <Input
                                            value={certification.expired_at}
                                            onChange={(e) => setCertificationField(index, 'expired_at', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeCertification(index)}>
                                        {t('Remove')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                                </TabsContent>

                                <TabsContent value="sports" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                    <Dumbbell className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">{t('Sports specialization')}</h3>
                                    <p className="text-xs text-muted-foreground">{t('Choose the sports this coach can be assigned to')}</p>
                                </div>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addSport}>
                                {t('Add sport')}
                            </Button>
                        </div>

                        {data.sports.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                {t('No sport specialization added yet.')}
                            </div>
                        ) : data.sports.map((sport, index) => (
                            <div key={index} className="space-y-4 rounded-lg border bg-muted/25 p-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>{t('Sport')}</Label>
                                        <Select value={sport.sport_id} onValueChange={(v) => setSportField(index, 'sport_id', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select sport')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sports.map((option) => (
                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                        {option.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('Level')}</Label>
                                        <Input
                                            value={sport.level}
                                            onChange={(e) => setSportField(index, 'level', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label>{t('From')}</Label>
                                        <DatePicker
                                            value={sport.effective_from}
                                            onChange={(value) => setSportField(index, 'effective_from', value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('To')}</Label>
                                        <DatePicker
                                            value={sport.effective_to}
                                            onChange={(value) => setSportField(index, 'effective_to', value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('Primary')}</Label>
                                        <div className="flex items-center gap-3 pt-1">
                                            <Checkbox
                                                checked={sport.is_primary}
                                                onCheckedChange={(checked) => setSportField(index, 'is_primary', !!checked)}
                                            />
                                            <span className="text-sm text-muted-foreground">{t('Mark as primary')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSport(index)}>
                                        {t('Remove')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                                </TabsContent>

                                <TabsContent value="member" className="mt-0 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                                <Link2 className="h-4 w-4" />
                            </div>
                            <div>
                            <h3 className="text-sm font-semibold">{t('Linked member')}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{t('Link this coach to a member record (optional).')}</p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="member_id">{t('Member')}</Label>
                            <MemberPicker
                                id="member_id"
                                value={pickedMember}
                                onChange={handleMemberChange}
                                placeholder={t('Search by name or PNO…')}
                            />
                            <InputError message={errors.member_id} />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {linkedMemberSummary(pickedMember)}
                        </p>
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>

                    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t('The coach can be assigned to teams after the profile is saved.')}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={processing}>
                                {processing ? t('Saving…') : t('Save coach')}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href={coachesIndex.url()}>{t('Cancel')}</Link>
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
