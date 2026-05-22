import { useMemo, useState } from 'react';
import { Form, Head, Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import UnitController from '@/actions/App/Http/Controllers/Settings/UnitController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type District = {
    id: number;
    name_en: string;
};

type Unit = {
    id: number;
    name_hi: string;
    name_en: string;
    unit_type: string;
    commandant: string | null;
    district: District | null;
};

export default function Index({ units }: { units: Unit[] }) {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const unitTypes = useMemo(
        () => Array.from(new Set(units.map((u) => u.unit_type))).sort(),
        [units],
    );

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return units.filter((u) => {
            const matchesQuery =
                !q ||
                u.name_hi.toLowerCase().includes(q) ||
                u.name_en.toLowerCase().includes(q) ||
                (u.commandant ?? '').toLowerCase().includes(q) ||
                (u.district?.name_en ?? '').toLowerCase().includes(q);
            const matchesType = typeFilter === 'all' || u.unit_type === typeFilter;
            return matchesQuery && matchesType;
        });
    }, [units, query, typeFilter]);

    return (
        <>
            <Head title="Units" />

            <h1 className="sr-only">Units</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Units"
                        description="Manage reference police units"
                    />
                    <Button asChild size="sm">
                        <Link href={UnitController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New unit
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search units…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Unit type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            {unitTypes.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>Name (Hindi)</TableHead>
                                <TableHead>Name (English)</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Commandant</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead className="w-0 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                        {units.length === 0 ? 'No units yet.' : 'No units match your filters.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((unit) => (
                                    <TableRow key={unit.id}>
                                        <TableCell className="font-medium">{unit.name_hi}</TableCell>
                                        <TableCell>{unit.name_en}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{unit.unit_type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {unit.commandant ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {unit.district?.name_en ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={UnitController.edit.url(unit.id)}>Edit</Link>
                                                </Button>
                                                <Form {...UnitController.destroy.form(unit.id)}>
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
            title: 'Units',
            href: UnitController.index.url(),
        },
    ],
};
