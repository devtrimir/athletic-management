import { Head, Link } from '@inertiajs/react';

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
};

type Props = {
    externalCoaches: {
        data: ExternalCoach[];
        from: number | null;
    };
};

export default function ExternalCoachesIndex({ externalCoaches }: Props) {
    const { t } = useTranslation();

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
                    <Button asChild>
                        <Link href="/external-coaches/create">
                            {t('Create external coach')}
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
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
        </>
    );
}
