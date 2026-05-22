import { useMemo, useState } from 'react';
import { Form, Head, Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import TournamentTierController from '@/actions/App/Http/Controllers/Settings/TournamentTierController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Tier = {
    id: number;
    code: string;
    label_hi: string;
    label_en: string;
    weight: number;
};

export default function Index({ tiers }: { tiers: Tier[] }) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return !q
            ? tiers
            : tiers.filter(
                  (t) =>
                      t.code.toLowerCase().includes(q) ||
                      t.label_hi.toLowerCase().includes(q) ||
                      t.label_en.toLowerCase().includes(q),
              );
    }, [tiers, query]);

    return (
        <>
            <Head title="Tournament Tiers" />

            <h1 className="sr-only">Tournament Tiers</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Tournament Tiers"
                        description="Manage reference tournament tiers"
                    />
                    <Button asChild size="sm">
                        <Link href={TournamentTierController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New tier
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search tiers…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>Code</TableHead>
                                <TableHead>Label (Hindi)</TableHead>
                                <TableHead>Label (English)</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead className="w-0 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                                        {tiers.length === 0 ? 'No tournament tiers yet.' : 'No tiers match your search.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((tier) => (
                                    <TableRow key={tier.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">{tier.code}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{tier.label_hi}</TableCell>
                                        <TableCell>{tier.label_en}</TableCell>
                                        <TableCell className="tabular-nums text-muted-foreground">{tier.weight}</TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={TournamentTierController.edit.url(tier.id)}>Edit</Link>
                                                </Button>
                                                <Form {...TournamentTierController.destroy.form(tier.id)}>
                                                    {({ processing }) => (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            disabled={processing}
                                                        >
                                                            Delete
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
            title: 'Tournament Tiers',
            href: TournamentTierController.index.url(),
        },
    ],
};
