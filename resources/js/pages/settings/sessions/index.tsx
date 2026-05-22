import { useMemo, useState } from 'react';
import { Form, Head, Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import SportSessionController from '@/actions/App/Http/Controllers/Settings/SportSessionController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SportSession = {
    id: number;
    name: string;
    start_year: number;
    end_year: number;
    is_current: boolean;
};

export default function Index({ sessions }: { sessions: SportSession[] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return sessions.filter((s) => {
            const matchesQuery = !q || s.name.toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'current' ? s.is_current : !s.is_current);
            return matchesQuery && matchesStatus;
        });
    }, [sessions, query, statusFilter]);

    return (
        <>
            <Head title="Sport sessions" />

            <h1 className="sr-only">Sport sessions</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Sport sessions"
                        description="Manage reference sport session years"
                    />
                    <Button asChild size="sm">
                        <Link href={SportSessionController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New session
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search sessions…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                            <SelectItem value="past">Past</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>Name</TableHead>
                                <TableHead>Years</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-0 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                                        {sessions.length === 0 ? 'No sessions yet.' : 'No sessions match your filters.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">{session.name}</TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {session.start_year}–{session.end_year}
                                        </TableCell>
                                        <TableCell>
                                            {session.is_current ? (
                                                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Current</Badge>
                                            ) : (
                                                <Badge variant="outline">Past</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={SportSessionController.edit.url(session.id)}>Edit</Link>
                                                </Button>
                                                <Form {...SportSessionController.destroy.form(session.id)}>
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
            title: 'Sport sessions',
            href: SportSessionController.index.url(),
        },
    ],
};
