import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
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

type Role = {
    id: number;
    code: string;
    name: string;
};

type User = {
    id: number;
    name: string;
    email: string;
    locale: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    roles: Role[];
};

export default function Index({ users }: { users: User[] }) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale: string } & Record<
        string,
        unknown
    >;
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();

        return users.filter(
            (u) =>
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q),
        );
    }, [users, query]);

    return (
        <>
            <Head title={t('Users')} />

            <h1 className="sr-only">{t('Users')}</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Users')}
                        description={t('Manage users in this organization')}
                    />
                    <Button asChild size="sm">
                        <Link href={UserController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New user')}
                        </Link>
                    </Button>
                </div>

                <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('Search users…')}
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
                                <TableHead>{t('Email')}</TableHead>
                                <TableHead>{t('Roles')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-0 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        {users.length === 0
                                            ? t('No users yet.')
                                            : t('No users match your search.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name}
                                            {user.must_change_password && (
                                                <Badge
                                                    variant="outline"
                                                    className="ml-2 border-amber-200 bg-amber-50 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                >
                                                    {t(
                                                        'Password change required',
                                                    )}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map((r) => (
                                                    <Badge
                                                        key={r.id}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {locale === 'hi'
                                                            ? r.name
                                                            : r.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    user.is_active
                                                        ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                }
                                            >
                                                {user.is_active
                                                    ? t('Active')
                                                    : t('Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Edit')}
                                                    asChild
                                                >
                                                    <Link
                                                        href={UserController.edit.url(
                                                            user.id,
                                                        )}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...UserController.destroy.form(
                                                        user.id,
                                                    )}
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={t('Delete')}
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            disabled={
                                                                processing
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
            title: 'Users',
            href: UserController.index.url(),
        },
    ],
};
