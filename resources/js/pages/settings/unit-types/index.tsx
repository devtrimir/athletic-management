import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import UnitTypeController from '@/actions/App/Http/Controllers/Settings/UnitTypeController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type UnitType = {
    id: number;
    code: string;
    name: string;
    name_en: string | null;
    is_active: boolean;
    sort_order: number;
    units_count: number;
};

export default function Index({ unitTypes }: { unitTypes: UnitType[] }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();

        if (!q) {
            return unitTypes;
        }

        return unitTypes.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                (u.name_en ?? '').toLowerCase().includes(q) ||
                u.code.toLowerCase().includes(q),
        );
    }, [unitTypes, query]);

    return (
        <>
            <Head title="Unit Types" />

            <h1 className="sr-only">Unit Types</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Unit Types')}
                        description={t(
                            'Manage the types available when creating a unit',
                        )}
                    />
                    <Button asChild size="sm">
                        <Link href={UnitTypeController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New unit type')}
                        </Link>
                    </Button>
                </div>

                <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('Search unit types…')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Code')}</TableHead>
                                <TableHead>{t('Order')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Units')}</TableHead>
                                <TableHead className="w-0 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        {unitTypes.length === 0
                                            ? t('No unit types yet.')
                                            : t(
                                                  'No unit types match your search.',
                                              )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((unitType) => (
                                    <TableRow key={unitType.id}>
                                        <TableCell className="font-medium">
                                            {unitType.name}
                                            {unitType.name_en && (
                                                <span className="ml-1.5 text-xs text-muted-foreground">
                                                    ({unitType.name_en})
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                {unitType.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {unitType.sort_order}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    unitType.is_active
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {unitType.is_active
                                                    ? t('Active')
                                                    : t('Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {unitType.units_count}
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Edit')}
                                                    asChild
                                                >
                                                    <Link
                                                        href={UnitTypeController.edit.url(
                                                            unitType.id,
                                                        )}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...UnitTypeController.destroy.form(
                                                        unitType.id,
                                                    )}
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={
                                                                unitType.units_count >
                                                                0
                                                                    ? t(
                                                                          'In use — cannot delete',
                                                                      )
                                                                    : t(
                                                                          'Delete',
                                                                      )
                                                            }
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            disabled={
                                                                processing ||
                                                                unitType.units_count >
                                                                    0
                                                            }
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
            title: 'Unit Types',
            href: UnitTypeController.index.url(),
        },
    ],
};
