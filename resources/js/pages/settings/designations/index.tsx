import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import DesignationController from '@/actions/App/Http/Controllers/Settings/DesignationController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Rank = { code: string; name: string; };
type Designation = { id: number; code: string; name: string; short_name: string | null; designation_order: number; mapped_rank_code: string | null; designation_type: string | null; is_active: boolean; rank?: Rank | null; };

export default function Index({ designations }: { designations: Designation[] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();

        return designations.filter((designation) => !q || [designation.code, designation.name, designation.short_name ?? '', designation.designation_type ?? '', designation.rank?.name ?? ''].some((v) => v.toLowerCase().includes(q)));
    }, [designations, query]);

    return (
        <>
            <Head title={t('Designations')} />
            <h1 className="sr-only">{t('Designations')}</h1>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading variant="small" title={t('Designations')} description={t('Manage designation reference records')} />
                    <Button asChild size="sm"><Link href={DesignationController.create.url()}><Plus className="mr-1.5 h-4 w-4" />{t('New designation')}</Link></Button>
                </div>
                <div className="relative max-w-xs"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('Search designations…')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" /></div>
                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50"><TableHead>{t('Code')}</TableHead><TableHead>{t('Name')}</TableHead><TableHead>{t('Rank')}</TableHead><TableHead>{t('Order')}</TableHead><TableHead>{t('Type')}</TableHead><TableHead>{t('Status')}</TableHead><TableHead className="w-0 text-right">{t('Actions')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{designations.length === 0 ? t('No designations yet.') : t('No designations match your search.')}</TableCell></TableRow>
                            ) : filtered.map((designation) => (
                                <TableRow key={designation.id}>
                                    <TableCell className="font-mono text-xs">{designation.code}</TableCell>
                                    <TableCell><div className="font-medium">{designation.name}</div></TableCell>
                                    <TableCell>{designation.rank?.name ?? designation.mapped_rank_code ?? '—'}</TableCell>
                                    <TableCell>{designation.designation_order}</TableCell>
                                    <TableCell>{designation.designation_type ?? '—'}</TableCell>
                                    <TableCell><Badge variant={designation.is_active ? 'default' : 'secondary'}>{designation.is_active ? t('Active') : t('Inactive')}</Badge></TableCell>
                                    <TableCell className="w-0"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" title={t('Edit')} asChild><Link href={DesignationController.edit.url(designation.id)}><Pencil className="h-4 w-4" /></Link></Button><Form {...DesignationController.destroy.form(designation.id)}>{({ processing }) => (<Button variant="ghost" size="icon" title={t('Delete')} className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={processing}><Trash2 className="h-4 w-4" /></Button>)}</Form></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Index.layout = { breadcrumbs: [{ title: 'Designations', href: DesignationController.index.url() }] };
