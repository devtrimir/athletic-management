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

type Update = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    review_status: string;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string };
    sport: { name: string };
};

type Props = {
    updates: { data: Update[]; from: number | null };
};

export default function ExternalCoachPerformanceUpdatesIndex({ updates }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External coach performance updates')} />

            <div className="space-y-4 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {t('External coach performance updates')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('Review progress updates submitted by external coaches.')}
                    </p>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('S.No.')}</TableHead>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Member')}</TableHead>
                                <TableHead>{t('External coach')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Score')}</TableHead>
                                <TableHead>{t('Review status')}</TableHead>
                                <TableHead>{t('Action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {updates.data.map((update, index) => (
                                <TableRow key={update.id}>
                                    <TableCell>{(updates.from ?? 1) + index}</TableCell>
                                    <TableCell>{update.update_date}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{update.member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {update.member.member_code ?? update.member.pno}
                                        </div>
                                    </TableCell>
                                    <TableCell>{update.external_coach.name}</TableCell>
                                    <TableCell>{update.sport.name}</TableCell>
                                    <TableCell>{update.performance_score ?? '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t(update.review_status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/external-coach-performance-updates/${update.id}`}>
                                                {t('Review')}
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
