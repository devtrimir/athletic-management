import { useMemo, useState } from 'react';
import { Form, Head, Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import DistrictController from '@/actions/App/Http/Controllers/Settings/DistrictController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type District = {
    id: number;
    name_hi: string;
    name_en: string;
    state: string;
    code: string;
};

export default function Index({ districts }: { districts: District[] }) {
    const [query, setQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('all');

    const states = useMemo(
        () => Array.from(new Set(districts.map((d) => d.state))).sort(),
        [districts],
    );

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return districts.filter((d) => {
            const matchesQuery =
                !q ||
                d.name_hi.toLowerCase().includes(q) ||
                d.name_en.toLowerCase().includes(q) ||
                d.code.toLowerCase().includes(q);
            const matchesState = stateFilter === 'all' || d.state === stateFilter;
            return matchesQuery && matchesState;
        });
    }, [districts, query, stateFilter]);

    return (
        <>
            <Head title="Districts" />

            <h1 className="sr-only">Districts</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Districts"
                        description="Manage reference districts"
                    />
                    <Button asChild size="sm">
                        <Link href={DistrictController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New district
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search districts…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    {states.length > 1 && (
                        <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="State" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All states</SelectItem>
                                {states.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>Name (Hindi)</TableHead>
                                <TableHead>Name (English)</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead className="w-0 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                                        {districts.length === 0 ? 'No districts yet.' : 'No districts match your filters.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((district) => (
                                    <TableRow key={district.id}>
                                        <TableCell className="font-medium">{district.name_hi}</TableCell>
                                        <TableCell>{district.name_en}</TableCell>
                                        <TableCell className="text-muted-foreground">{district.state}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">{district.code}</Badge>
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={DistrictController.edit.url(district.id)}>Edit</Link>
                                                </Button>
                                                <Form {...DistrictController.destroy.form(district.id)}>
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
            title: 'Districts',
            href: DistrictController.index.url(),
        },
    ],
};
