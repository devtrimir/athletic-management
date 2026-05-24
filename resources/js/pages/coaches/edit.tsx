import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { index as coachesIndex, show as showCoach, update } from '@/actions/App/Http/Controllers/CoachController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { MemberOption} from '@/components/member-picker';
import { MemberPicker } from '@/components/member-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type Coach = {
    id: number;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    member_id: number | null;
    member?: {
        id: number;
        member_code: string;
        full_name_hi: string;
        full_name_en: string | null;
        pno: string | null;
        rank: string | null;
        player_category: string;
        player_level: string;
        current_status: string;
    } | null;
};

type FormData = {
    full_name_hi: string;
    full_name_en: string;
    pno: string;
    mobile: string;
    nis_certified: boolean;
    member_id: number | null;
};

function coachMemberToOption(m: NonNullable<Coach['member']>): MemberOption {
    return {
        id: m.id,
        member_code: m.member_code,
        pno: m.pno,
        full_name_hi: m.full_name_hi,
        full_name_en: m.full_name_en,
        player_category: m.player_category,
        player_level: m.player_level,
        current_status: m.current_status,
    };
}

export default function CoachesEdit({ coach }: { coach: Coach }) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name_hi, href: showCoach.url(coach) },
            { title: t('Edit coach') },
        ],
    });

    const [pickedMember, setPickedMember] = useState<MemberOption | null>(
        coach.member ? coachMemberToOption(coach.member) : null,
    );

    const { data, setData, patch, errors, processing } = useForm<FormData>({
        full_name_hi: coach.full_name_hi,
        full_name_en: coach.full_name_en ?? '',
        pno: coach.pno ?? '',
        mobile: coach.mobile ?? '',
        nis_certified: coach.nis_certified,
        member_id: coach.member_id,
    });

    function handleMemberChange(member: MemberOption | null) {
        setPickedMember(member);
        setData('member_id', member?.id ?? null);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update.url(coach));
    }

    return (
        <>
            <Head title={t('Edit coach')} />
            <h1 className="sr-only">{t('Edit coach')}</h1>

            <div className="space-y-6">
                <Heading variant="small" title={t('Edit coach')} description={coach.full_name_hi} />

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    {/* Coach details */}
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('Coach details')}</h3>

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

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="nis_certified"
                                checked={data.nis_certified}
                                onCheckedChange={(checked) => setData('nis_certified', !!checked)}
                            />
                            <Label htmlFor="nis_certified">{t('NIS certified')}</Label>
                        </div>
                        <InputError message={errors.nis_certified} />
                    </div>

                    {/* Member link */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">{t('Linked member')}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{t('Link this coach to a member record (optional)')}</p>
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
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? t('Saving…') : t('Save coach')}
                        </Button>
                        <Link href={showCoach.url(coach)}>
                            <Button type="button" variant="outline">
                                {t('Cancel')}
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}
