import { Head, Link } from '@inertiajs/react';
import { Download, Eye, Plus, Printer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    experience_years: number | null;
    active_coached_players_count: number;
};

type Props = {
    externalCoaches: {
        data: ExternalCoach[];
        from: number | null;
    };
};

function escapeCsvCell(value: string | number | null): string {
    const text = String(value ?? '').replaceAll('"', '""');

    return `"${text}"`;
}

export default function ExternalCoachesIndex({ externalCoaches }: Props) {
    const { t } = useTranslation();

    function exportCsv() {
        const headers = [
            t('S.No.'),
            t('Name'),
            t('Email'),
            t('Phone'),
            t('Experience'),
            t('Active players'),
            t('Status'),
        ];

        const rows = externalCoaches.data.map((coach, index) => [
            (externalCoaches.from ?? 1) + index,
            coach.name,
            coach.email,
            coach.phone ?? '-',
            coach.experience_years ?? '-',
            coach.active_coached_players_count,
            t(coach.status),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map(escapeCsvCell).join(',')),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `external-coaches-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    function printTable() {
        const headers = [
            t('S.No.'),
            t('Name'),
            t('Email'),
            t('Phone'),
            t('Experience'),
            t('Active players'),
            t('Status'),
            t('Action'),
        ];

        const rows = externalCoaches.data
            .map((coach, index) => {
                const cells = [
                    (externalCoaches.from ?? 1) + index,
                    coach.name,
                    coach.email,
                    coach.phone ?? '-',
                    coach.experience_years ?? '-',
                    coach.active_coached_players_count,
                    t(coach.status),
                    t('View'),
                ];

                return `<tr>${cells
                    .map((cell) => `<td>${String(cell)}</td>`)
                    .join('')}</tr>`;
            })
            .join('');

        const printWindow = window.open('', '_blank', 'width=1100,height=800');

        if (!printWindow) {
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${t('External coaches')}</title>
                    <style>
                        body{font-family:Arial,sans-serif;padding:16px;font-size:12px}
                        h2{font-size:18px;margin:0 0 12px}
                        table{width:100%;border-collapse:collapse}
                        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
                        th{background:#f3f4f6}
                    </style>
                </head>
                <body>
                    <h2>${t('External coaches')}</h2>
                    <table>
                        <thead>
                            <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                    <script>window.onload=()=>{window.print();window.close()};</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    return (
        <>
            <Head title={t('External coaches')} />

            <div className="space-y-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {t('External coaches')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Manage external coaches and portal access.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={printTable}
                        >
                            <Printer className="mr-2 size-4" />
                            {t('Print')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportCsv}
                        >
                            <Download className="mr-2 size-4" />
                            {t('Export CSV')}
                        </Button>
                        <Button asChild>
                            <Link href="/external-coaches/create">
                                <Plus className="mr-2 size-4" />
                                {t('Create external coach')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">
                                        {t('S.No.')}
                                    </TableHead>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Email')}</TableHead>
                                    <TableHead>{t('Phone')}</TableHead>
                                    <TableHead>{t('Experience')}</TableHead>
                                    <TableHead>
                                        {t('Active players coached')}
                                    </TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {externalCoaches.data.map((coach, index) => (
                                    <TableRow key={coach.id}>
                                        <TableCell>
                                            {(externalCoaches.from ?? 1) + index}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {coach.name}
                                        </TableCell>
                                        <TableCell>{coach.email}</TableCell>
                                        <TableCell>{coach.phone ?? '-'}</TableCell>
                                        <TableCell>
                                            {coach.experience_years ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            {coach.active_coached_players_count}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {t(coach.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={`/external-coaches/${coach.id}`}
                                                >
                                                    <Eye className="mr-1.5 size-3.5" />
                                                    {t('View')}
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </>
    );
}
