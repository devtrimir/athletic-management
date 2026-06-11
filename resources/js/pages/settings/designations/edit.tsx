import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import DesignationController from '@/actions/App/Http/Controllers/Settings/DesignationController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Rank = { id: number; code: string; name_en: string; };
type Designation = { id: number; code: string; name_en: string; short_name: string | null; name_hi: string | null; designation_order: number; mapped_rank_code: string | null; designation_type: string | null; is_active: boolean; };

export default function Edit({ designation, ranks }: { designation: Designation; ranks: Rank[] }) {
    const { t } = useTranslation();
    setLayoutProps({ breadcrumbs: [{ title: 'Designations', href: DesignationController.index.url() }, { title: designation.name_en, href: DesignationController.edit.url(designation.id) }] });

    return (
        <>
            <Head title={t('Edit designation')} />
            <h1 className="sr-only">{t('Edit designation')}</h1>
            <div className="space-y-6">
                <Heading variant="small" title={`${t('Edit')} ${designation.name_en}`} description={t('Update designation reference details')} />
                <Form {...DesignationController.update.form(designation.id)} className="max-w-2xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="code">{t('Code')}</Label><Input id="code" name="code" defaultValue={designation.code} required maxLength={50} /><InputError message={errors.code} /></div>
                                    <div className="grid gap-2"><Label htmlFor="designation_order">{t('Order')}</Label><Input id="designation_order" name="designation_order" type="number" min={1} defaultValue={designation.designation_order} required /><InputError message={errors.designation_order} /></div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="name_en">{t('Name (English)')}</Label><Input id="name_en" name="name_en" defaultValue={designation.name_en} required maxLength={255} /><InputError message={errors.name_en} /></div>
                                    <div className="grid gap-2"><Label htmlFor="short_name">{t('Short name')}</Label><Input id="short_name" name="short_name" defaultValue={designation.short_name ?? ''} maxLength={100} /><InputError message={errors.short_name} /></div>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2"><Label htmlFor="name_hi">{t('Name (Hindi)')}</Label><Input id="name_hi" name="name_hi" defaultValue={designation.name_hi ?? ''} maxLength={255} /><InputError message={errors.name_hi} /></div>
                                    <div className="grid gap-2"><Label htmlFor="mapped_rank_code">{t('Mapped rank')}</Label><Select name="mapped_rank_code" defaultValue={designation.mapped_rank_code ?? ''}><SelectTrigger id="mapped_rank_code"><SelectValue placeholder={t('Select rank')} /></SelectTrigger><SelectContent>{ranks.map((rank) => <SelectItem key={rank.id} value={rank.code}>{rank.name_en}</SelectItem>)}</SelectContent></Select><InputError message={errors.mapped_rank_code} /></div>
                                </div>
                                <div className="grid gap-2"><Label htmlFor="designation_type">{t('Designation type')}</Label><Input id="designation_type" name="designation_type" defaultValue={designation.designation_type ?? ''} maxLength={100} /><InputError message={errors.designation_type} /></div>
                                <div className="grid gap-2"><Label htmlFor="is_active">{t('Active')}</Label><Select name="is_active" defaultValue={designation.is_active ? '1' : '0'}><SelectTrigger id="is_active"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">{t('Yes')}</SelectItem><SelectItem value="0">{t('No')}</SelectItem></SelectContent></Select><InputError message={errors.is_active} /></div>
                            </div>
                            <div className="flex items-center gap-3"><Button disabled={processing}>{t('Save changes')}</Button><Button variant="outline" asChild><Link href={DesignationController.index.url()}>{t('Cancel')}</Link></Button></div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
