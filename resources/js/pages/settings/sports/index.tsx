import { useMemo, useState } from 'react';
import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import SportController from '@/actions/App/Http/Controllers/Settings/SportController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

const CATEGORY_VARIANTS: Record<string, string> = {
    INDIVIDUAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    TEAM: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    COMBAT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    WATER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

type Sport = {
    id: number;
    name_hi: string;
    name_en: string;
    category: string;
    slug: string;
};

const CATEGORIES = ['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'] as const;

export default function Index({ sports }: { sports: Sport[] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return sports.filter((s) => {
            const matchesQuery =
                !q ||
                s.name_hi.toLowerCase().includes(q) ||
                s.name_en.toLowerCase().includes(q) ||
                s.slug.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
            return matchesQuery && matchesCategory;
        });
    }, [sports, query, categoryFilter]);

    return (
        <>
            <Head title="Sports" />

            <h1 className="sr-only">Sports</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Sports')}
                        description={t('Manage reference sports disciplines')}
                    />
                    <Button asChild size="sm">
                        <Link href={SportController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New sport')}
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search sports…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('Category')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All categories')}</SelectItem>
                            {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('Name (Hindi)')}</TableHead>
                                <TableHead>{t('Name (English)')}</TableHead>
                                <TableHead>{t('Category')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                                        {sports.length === 0 ? t('No sports yet.') : t('No sports match your filters.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((sport) => (
                                    <TableRow key={sport.id}>
                                        <TableCell className="font-medium">{sport.name_hi}</TableCell>
                                        <TableCell>{sport.name_en}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={CATEGORY_VARIANTS[sport.category] ?? ''}
                                            >
                                                {sport.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" title={t('Edit')} asChild>
                                                    <Link href={SportController.edit.url(sport.id)}><Pencil className="h-4 w-4" /></Link>
                                                </Button>
                                                <Form {...SportController.destroy.form(sport.id)}>
                                                    {({ processing }) => (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={t('Delete')}
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            disabled={processing}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </Form>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Sports',
            href: SportController.index.url(),
        },
    ],
};
