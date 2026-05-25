import { Head, Link, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { index as membersIndex, store as storeMember } from '@/actions/App/Http/Controllers/MemberController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type District = { id: number; name_hi: string; name_en: string };
type Unit = { id: number; name_hi: string; name_en: string };

type FormData = {
    pno: string;
    full_name_hi: string;
    full_name_en: string;
    father_name_hi: string;
    rank: string;
    gender: string;
    dob: string;
    joining_date: string;
    mobile: string;
    home_district_id: string;
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
    other_notes: string;
    team_since: string;
};

export default function MembersCreate({ districts, units }: { districts: District[]; units: Unit[] }) {
    const { t } = useTranslation();
    const { locale } = usePage().props;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: t('New member') },
        ],
    });

    const { data, setData, post, errors, processing } = useForm<FormData>({
        pno: '',
        full_name_hi: '',
        full_name_en: '',
        father_name_hi: '',
        rank: '',
        gender: '',
        dob: '',
        joining_date: '',
        mobile: '',
        home_district_id: '',
        current_unit_id: '',
        player_category: '',
        player_level: '',
        blood_group: '',
        caste: '',
        promotion_date: '',
        appointment: '',
        home_address: '',
        recruitment_type: '',
        sport_event: '',
        other_notes: '',
        team_since: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeMember.url());
    }

    return (
        <>
            <Head title={t('New member')} />
            <h1 className="sr-only">{t('New member')}</h1>

            <div className="space-y-6">
                <Heading variant="small" title={t('New member')} description={t('Add a new athlete to the roster')} />

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    {/* Personal information */}
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('Personal information')}</h3>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="full_name_hi">
                                    {t('Name (Hindi)')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="full_name_hi"
                                    value={data.full_name_hi}
                                    onChange={(e) => setData('full_name_hi', e.target.value)}
                                    maxLength={255}
                                    required
                                />
                                <InputError message={errors.full_name_hi} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="full_name_en">{t('Name (English)')}</Label>
                                <Input
                                    id="full_name_en"
                                    value={data.full_name_en}
                                    onChange={(e) => setData('full_name_en', e.target.value)}
                                    maxLength={255}
                                />
                                <InputError message={errors.full_name_en} />
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="father_name_hi">{t("Father's name")}</Label>
                                <Input
                                    id="father_name_hi"
                                    value={data.father_name_hi}
                                    onChange={(e) => setData('father_name_hi', e.target.value)}
                                    maxLength={255}
                                />
                                <InputError message={errors.father_name_hi} />
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
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
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
                        </div>
                    </div>

                    {/* Service information */}
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('Service information')}</h3>

                        <div className="grid gap-5 sm:grid-cols-2">
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
                                <Input
                                    id="rank"
                                    value={data.rank}
                                    onChange={(e) => setData('rank', e.target.value)}
                                    maxLength={100}
                                />
                                <InputError message={errors.rank} />
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
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
                                <Label htmlFor="current_unit_id">{t('Unit')}</Label>
                                <Combobox
                                    id="current_unit_id"
                                    value={data.current_unit_id}
                                    onValueChange={(v) => setData('current_unit_id', v)}
                                    items={units.map((u) => ({ value: String(u.id), label: locale === 'en' ? u.name_en : u.name_hi }))}
                                    placeholder={t('Select unit')}
                                    searchPlaceholder={t('Search units…')}
                                />
                                <InputError message={errors.current_unit_id} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="home_district_id">{t('Home district')}</Label>
                            <Combobox
                                id="home_district_id"
                                value={data.home_district_id}
                                onValueChange={(v) => setData('home_district_id', v)}
                                items={districts.map((d) => ({ value: String(d.id), label: locale === 'en' ? d.name_en : d.name_hi }))}
                                placeholder={t('Select district')}
                                searchPlaceholder={t('Search districts…')}
                            />
                            <InputError message={errors.home_district_id} />
                        </div>
                    </div>

                    {/* Player information */}
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('Player information')}</h3>

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
                                        <SelectItem value="SKILLED">{t('SKILLED')}</SelectItem>
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
                    </div>

                    {/* Additional profile */}
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('Additional profile')}</h3>

                        <div className="grid gap-5 sm:grid-cols-2">
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

                            <div className="grid gap-2">
                                <Label htmlFor="recruitment_type">{t('Recruitment type')}</Label>
                                <Select value={data.recruitment_type} onValueChange={(v) => setData('recruitment_type', v)}>
                                    <SelectTrigger id="recruitment_type" className="w-full">
                                        <SelectValue placeholder={t('Select recruitment type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DIRECT">{t('DIRECT')}</SelectItem>
                                        <SelectItem value="SPORTS_QUOTA">{t('SPORTS_QUOTA')}</SelectItem>
                                        <SelectItem value="PROMOTED">{t('PROMOTED')}</SelectItem>
                                        <SelectItem value="OTHER">{t('OTHER')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.recruitment_type} />
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
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

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="sport_event">{t('Sport event')}</Label>
                                <Input
                                    id="sport_event"
                                    value={data.sport_event}
                                    onChange={(e) => setData('sport_event', e.target.value)}
                                    maxLength={100}
                                />
                                <InputError message={errors.sport_event} />
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
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="team_since">{t('Team since')}</Label>
                            <DatePicker
                                id="team_since"
                                value={data.team_since}
                                onChange={(v) => setData('team_since', v)}
                            />
                            <InputError message={errors.team_since} />
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

                        <div className="grid gap-2">
                            <Label htmlFor="other_notes">{t('Other notes')}</Label>
                            <Textarea
                                id="other_notes"
                                value={data.other_notes}
                                onChange={(e) => setData('other_notes', e.target.value)}
                                rows={3}
                            />
                            <InputError message={errors.other_notes} />
                        </div>
                    </div>

                    {/* Actions */}
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

