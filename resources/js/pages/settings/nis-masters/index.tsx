import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import NisMasterController from '@/actions/App/Http/Controllers/Settings/NisMasterController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type NisMaster = {
    id: number;
    kind: string;
    code: string;
    name: string;
    short_name: string | null;
    sort_order: number;
    is_active: boolean;
};

const KIND_OPTIONS = ['nis', 'tier', 'level', 'rank', 'designation'] as const;

export default function Index({ masters }: { masters: NisMaster[] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState('all');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();

        return masters.filter((master) => {
            const matchesKind = kind === 'all' || master.kind === kind;
            const matchesQuery = !q || [master.code, master.name, master.short_name ?? ''].some((value) => value.toLowerCase().includes(q));

            return matchesKind && matchesQuery;
        });
    }, [masters, query, kind]);

    return (
        <>
            <Head title={t('NIS Masters')} />
            <h1 className="sr-only">{t('NIS Masters')}</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading variant="small" title={t('NIS Masters')} description={t('Manage coach master references')} />
                    <Button asChild size="sm">
                        <Link href={NisMasterController.index.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New master')}
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder={t('Search masters…')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
                    </div>
                    <Select value={kind} onValueChange={setKind}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('Kind')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All kinds')}</SelectItem>
                            {KIND_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('Kind')}</TableHead>
                                <TableHead>{t('Code')}</TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Short')}</TableHead>
                                <TableHead>{t('Order')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                        {masters.length === 0 ? t('No NIS masters yet.') : t('No masters match your filters.')}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((master) => (
                                <TableRow key={master.id}>
                                    <TableCell><Badge variant="outline">{master.kind}</Badge></TableCell>
                                    <TableCell className="font-mono text-xs">{master.code}</TableCell>
                                    <TableCell className="font-medium">{master.name}</TableCell>
                                    <TableCell>{master.short_name ?? '—'}</TableCell>
                                    <TableCell>{master.sort_order}</TableCell>
                                    <TableCell>
                                        <Badge variant={master.is_active ? 'default' : 'secondary'}>{master.is_active ? t('Active') : t('Inactive')}</Badge>
                                    </TableCell>
                                    <TableCell className="w-0">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" title={t('Edit')} asChild>
                                                <Link href={NisMasterController.index.url()}><Pencil className="h-4 w-4" /></Link>
                                            </Button>
                                            <Form {...NisMasterController.index.form()}>
                                                {() => (
                                                    <Button variant="ghost" size="icon" title={t('Delete')} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </Form>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Index.layout = { breadcrumbs: [{ title: 'NIS Masters', href: NisMasterController.index.url() }] };
