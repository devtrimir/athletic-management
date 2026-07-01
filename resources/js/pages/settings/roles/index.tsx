import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import RoleController from '@/actions/App/Http/Controllers/Settings/RoleController';
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

type RoleRow = {
    id: number;
    code: string;
    name_hi: string;
    name_en: string;
    is_system: boolean;
    permissions_count: number;
    user_count: number;
};

export default function Index({ roles }: { roles: RoleRow[] }) {
    const { t } = useTranslation();
    const { locale } = usePage().props;

    return (
        <>
            <Head title={t('Roles')} />
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Heading
                        title={t('Roles')}
                        description={t('Manage roles and their permissions')}
                    />
                    <Button asChild size="sm">
                        <Link href={RoleController.create.url()}>
                            <Plus className="h-4 w-4" />
                            {t('New role')}
                        </Link>
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Name')}</TableHead>
                            <TableHead className="text-right">
                                {t('Permissions')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('Users')}
                            </TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center text-muted-foreground"
                                >
                                    {t('No roles yet.')}
                                </TableCell>
                            </TableRow>
                        )}
                        {roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {locale === 'hi'
                                                ? role.name_hi
                                                : role.name_en}
                                        </span>
                                        {role.is_system && (
                                            <Badge variant="secondary">
                                                {t('System')}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                        {role.code}
                                    </p>
                                </TableCell>
                                <TableCell className="text-right">
                                    {role.permissions_count}
                                </TableCell>
                                <TableCell className="text-right">
                                    {role.user_count}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={RoleController.show.url(
                                                    role.id,
                                                )}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">
                                                    {t('Edit')}
                                                </span>
                                            </Link>
                                        </Button>
                                        {!role.is_system && (
                                            <Form
                                                action={RoleController.destroy.url(
                                                    role.id,
                                                )}
                                                method="delete"
                                                onBefore={() =>
                                                    confirm(
                                                        t(
                                                            'Are you sure you want to delete this role?',
                                                        ),
                                                    )
                                                }
                                            >
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        {t('Delete')}
                                                    </span>
                                                </Button>
                                            </Form>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Roles', href: RoleController.index.url() }],
};
