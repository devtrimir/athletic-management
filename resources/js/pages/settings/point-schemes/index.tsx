import { Form, Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import PointSchemeController from '@/actions/App/Http/Controllers/Settings/PointSchemeController';
import Heading from '@/components/heading';
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

type Scheme = {
    id: number;
    version_number: number;
    name: string;
    status: 'draft' | 'active' | 'retired';
    effective_from: string | null;
    published_at: string | null;
    results_scored: number;
};

export function StatusBadge({ status }: { status: Scheme['status'] }) {
    const { t } = useTranslation();

    if (status === 'draft') {
        return <Badge variant="secondary">{t('Draft')}</Badge>;
    }

    return <Badge>{t('Published')}</Badge>;
}

export default function Index({ schemes }: { schemes: Scheme[] }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Points versions')} />

            <h1 className="sr-only">{t('Points versions')}</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Points versions')}
                        description={t(
                            'Each version is a full points table. A published version is locked; start a new draft to change points.',
                        )}
                    />
                    <Form {...PointSchemeController.store.form()}>
                        {({ processing }) => (
                            <Button size="sm" disabled={processing}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New draft from latest')}
                            </Button>
                        )}
                    </Form>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('Version')}</TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Applies from')}</TableHead>
                                <TableHead className="text-right">
                                    {t('Results scored')}
                                </TableHead>
                                <TableHead className="w-0" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schemes.map((scheme) => (
                                <TableRow key={scheme.id}>
                                    <TableCell className="font-medium">
                                        v{scheme.version_number}
                                    </TableCell>
                                    <TableCell>{scheme.name}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={scheme.status} />
                                    </TableCell>
                                    <TableCell>
                                        {scheme.status === 'draft'
                                            ? (scheme.effective_from ?? '—')
                                            : (scheme.effective_from ??
                                              t('Since the beginning'))}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {scheme.results_scored}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={PointSchemeController.show.url(
                                                    scheme.id,
                                                )}
                                            >
                                                {scheme.status === 'draft'
                                                    ? t('Edit')
                                                    : t('View')}
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

Index.layout = {
    breadcrumbs: [
        { title: 'Points versions', href: PointSchemeController.index.url() },
    ],
};
