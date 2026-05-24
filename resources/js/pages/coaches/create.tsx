import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { index as coachesIndex, store as storeCoach } from '@/actions/App/Http/Controllers/CoachController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { MemberOption} from '@/components/member-picker';
import { MemberPicker } from '@/components/member-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type FormData = {
    full_name_hi: string;
    full_name_en: string;
    pno: string;
    mobile: string;
    nis_certified: boolean;
    member_id: number | null;
};

export default function CoachesCreate() {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: t('New coach') },
        ],
    });

    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);

    const { data, setData, post, errors, processing } = useForm<FormData>({
        full_name_hi: '',
        full_name_en: '',
        pno: '',
        mobile: '',
        nis_certified: false,
        member_id: null,
    });

    function handleMemberChange(member: MemberOption | null) {
        setPickedMember(member);
        setData((prev) => ({
            ...prev,
            member_id: member?.id ?? null,
            full_name_hi: prev.full_name_hi || (member?.full_name_hi ?? ''),
            pno: prev.pno || (member?.pno ?? ''),
        }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeCoach.url());
    }

    return (
        <>
            <Head title={t('New coach')} />
            <h1 className="sr-only">{t('New coach')}</h1>

            <div className="space-y-6">
                <Heading variant="small" title={t('New coach')} description={t('Add a new coach to the team')} />

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
                        <Link href={coachesIndex.url()}>
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
