import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import RankController from '@/actions/App/Http/Controllers/Settings/RankController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

const CADRES = ['SUBORDINATE', 'PPS', 'IPS', 'PPS_OR_IPS', 'IPS_OR_PPS'] as const;

type Rank = { id: number; code: string; name_en: string; short_name: string | null; name_hi: string | null; rank_order: number; cadre_type: string | null; is_gazetted: boolean; aliases: string[] | null; is_active: boolean; };

export default function Edit({ rank }: { rank: Rank }) {
    const { t } = useTranslation();
    setLayoutProps({ breadcrumbs: [{ title: 'Ranks', href: RankController.index.url() }, { title: rank.name_en, href: RankController.edit.url(rank.id) }] });

    return (
        <>
            <Head title={t('Edit rank')} />
            <h1 className="sr-only">{t('Edit rank')}</h1>
            <div className="space-y-6">
                <Heading variant="small" title={`${t('Edit')} ${rank.name_en}`} description={t('Update rank reference details')} />
                <Form {...RankController.update.form(rank.id)} className="max-w-2xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="code">{t('Code')}</Label><Input id="code" name="code" defaultValue={rank.code} required maxLength={50} /><InputError message={errors.code} /></div>
                                    <div className="grid gap-2"><Label htmlFor="rank_order">{t('Order')}</Label><Input id="rank_order" name="rank_order" type="number" min={1} defaultValue={rank.rank_order} required /><InputError message={errors.rank_order} /></div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="name_en">{t('Name (English)')}</Label><Input id="name_en" name="name_en" defaultValue={rank.name_en} required maxLength={255} /><InputError message={errors.name_en} /></div>
                                    <div className="grid gap-2"><Label htmlFor="short_name">{t('Short name')}</Label><Input id="short_name" name="short_name" defaultValue={rank.short_name ?? ''} maxLength={100} /><InputError message={errors.short_name} /></div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="name_hi">{t('Name (Hindi)')}</Label><Input id="name_hi" name="name_hi" defaultValue={rank.name_hi ?? ''} maxLength={255} /><InputError message={errors.name_hi} /></div>
                                    <div className="grid gap-2"><Label htmlFor="cadre_type">{t('Cadre type')}</Label><Select name="cadre_type" defaultValue={rank.cadre_type ?? ''}><SelectTrigger id="cadre_type"><SelectValue placeholder={t('Select cadre')} /></SelectTrigger><SelectContent>{CADRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><InputError message={errors.cadre_type} /></div>
                                </div>
                                <div className="grid gap-2"><Label htmlFor="aliases">{t('Aliases')}</Label><Textarea id="aliases" name="aliases" defaultValue={rank.aliases?.join(', ') ?? ''} placeholder={t('Comma-separated aliases')} /><InputError message={errors.aliases} /></div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="is_gazetted">{t('Gazetted')}</Label><Select name="is_gazetted" defaultValue={rank.is_gazetted ? '1' : '0'}><SelectTrigger id="is_gazetted"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">{t('No')}</SelectItem><SelectItem value="1">{t('Yes')}</SelectItem></SelectContent></Select><InputError message={errors.is_gazetted} /></div>
                                    <div className="grid gap-2"><Label htmlFor="is_active">{t('Active')}</Label><Select name="is_active" defaultValue={rank.is_active ? '1' : '0'}><SelectTrigger id="is_active"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">{t('Yes')}</SelectItem><SelectItem value="0">{t('No')}</SelectItem></SelectContent></Select><InputError message={errors.is_active} /></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3"><Button disabled={processing}>{t('Save changes')}</Button><Button variant="outline" asChild><Link href={RankController.index.url()}>{t('Cancel')}</Link></Button></div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
