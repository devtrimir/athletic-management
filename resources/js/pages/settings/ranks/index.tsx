import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import RankController from '@/actions/App/Http/Controllers/Settings/RankController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Rank = {
    id: number;
    code: string;
    name: string;
    short_name: string | null;
    rank_order: number;
    cadre_type: string | null;
    is_gazetted: boolean;
    aliases: string[] | null;
    is_active: boolean;
};

export default function Index({ ranks }: { ranks: Rank[] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();

        return ranks.filter((rank) => {
            if (!q) {
                return true;
            }

            return [rank.code, rank.name, rank.short_name ?? '', rank.cadre_type ?? '']
                .some((value) => value.toLowerCase().includes(q));
        });
    }, [ranks, query]);

    return (
        <>
            <Head title={t('Ranks')} />

            <h1 className="sr-only">{t('Ranks')}</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading variant="small" title={t('Ranks')} description={t('Manage reference ranks')} />
                    <Button asChild size="sm">
                        <Link href={RankController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New rank')}
                        </Link>
                    </Button>
                </div>

                <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder={t('Search ranks…')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('Code')}</TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Short name')}</TableHead>
                                <TableHead>{t('Order')}</TableHead>
                                <TableHead>{t('Cadre')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                        {ranks.length === 0 ? t('No ranks yet.') : t('No ranks match your search.')}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((rank) => (
                                <TableRow key={rank.id}>
                                    <TableCell className="font-mono text-xs">{rank.code}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{rank.name}</div>
                                    </TableCell>
                                    <TableCell>{rank.short_name ?? '—'}</TableCell>
                                    <TableCell>{rank.rank_order}</TableCell>
                                    <TableCell>{rank.cadre_type ?? '—'}</TableCell>
                                    <TableCell>
                                        <Badge variant={rank.is_active ? 'default' : 'secondary'}>{rank.is_active ? t('Active') : t('Inactive')}</Badge>
                                        {rank.is_gazetted && <Badge variant="outline" className="ml-2">{t('Gazetted')}</Badge>}
                                    </TableCell>
                                    <TableCell className="w-0">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" title={t('Edit')} asChild>
                                                <Link href={RankController.edit.url(rank.id)}><Pencil className="h-4 w-4" /></Link>
                                            </Button>
                                            <Form {...RankController.destroy.form(rank.id)}>
                                                {({ processing }) => (
                                                    <Button variant="ghost" size="icon" title={t('Delete')} className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={processing}>
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

Index.layout = {
    breadcrumbs: [{ title: 'Ranks', href: RankController.index.url() }],
};
