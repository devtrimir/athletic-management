import { Form, Head, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Settings/RoleController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/use-translation';

type Permission = {
    id: number;
    code: string;
    group: string;
    name_hi: string;
    name_en: string;
};

type Role = {
    id: number;
    code: string;
    name_hi: string;
    name_en: string;
    is_system: boolean;
};

type Props = {
    role: Role;
    permissions: Permission[];
    role_permission_ids: number[];
    user_count: number;
};

export default function Show({ role, permissions, role_permission_ids, user_count }: Props) {
    const { t } = useTranslation();
    const { locale } = usePage().props;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Roles'), href: RoleController.index.url() },
            { title: role.name_en },
        ],
    });

    const nameForm = useForm({
        name_hi: role.name_hi,
        name_en: role.name_en,
    });

    const permForm = useForm({
        permissions: role_permission_ids,
    });

    const groupedPermissions = useMemo(() => {
        const groups: Record<string, Permission[]> = {};

        for (const p of permissions) {
            if (!groups[p.group]) {
                groups[p.group] = [];
            }

            groups[p.group].push(p);
        }

        return groups;
    }, [permissions]);

    const togglePermission = (id: number) => {
        const current = permForm.data.permissions;
        permForm.setData(
            'permissions',
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        );
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        nameForm.put(RoleController.update.url(role.id));
    };

    const handlePermSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        permForm.post(RoleController.updatePermissions.url(role.id));
    };

    return (
        <>
            <Head title={role.name_en} />
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <Heading title={role.name_en} description={role.code} />
                    {role.is_system && (
                        <Badge variant="secondary">{t('System')}</Badge>
                    )}
                    <span className="text-sm text-muted-foreground ml-auto">
                        {user_count} {t('users')}
                    </span>
                </div>

                {/* Name section — only editable for non-system roles */}
                {!role.is_system && (
                    <>
                        <Separator />
                        <form onSubmit={handleNameSubmit} className="space-y-4 max-w-md">
                            <h3 className="text-sm font-semibold">{t('Role name')}</h3>
                            <div className="space-y-2">
                                <Label htmlFor="name_hi">{t('Name (Hindi)')}</Label>
                                <Input
                                    id="name_hi"
                                    value={nameForm.data.name_hi}
                                    onChange={(e) => nameForm.setData('name_hi', e.target.value)}
                                />
                                <InputError message={nameForm.errors.name_hi} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name_en">{t('Name (English)')}</Label>
                                <Input
                                    id="name_en"
                                    value={nameForm.data.name_en}
                                    onChange={(e) => nameForm.setData('name_en', e.target.value)}
                                />
                                <InputError message={nameForm.errors.name_en} />
                            </div>
                            <Button type="submit" disabled={nameForm.processing}>
                                {t('Save changes')}
                            </Button>
                        </form>
                    </>
                )}

                <Separator />

                {/* Permissions section */}
                <form onSubmit={handlePermSubmit} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">{t('Permissions')}</h3>
                            {role.code === 'admin' && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('The admin role always has all permissions.')}
                                </p>
                            )}
                        </div>
                        {role.code !== 'admin' && (
                            <Button type="submit" size="sm" disabled={permForm.processing}>
                                {t('Update permissions')}
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(groupedPermissions).map(([group, perms]) => (
                            <div
                                key={group}
                                className="rounded-lg border bg-card p-4 space-y-3"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {group}
                                </p>
                                <div className="space-y-2">
                                    {perms.map((perm) => {
                                        const isChecked = permForm.data.permissions.includes(perm.id);
                                        const isLocked = role.code === 'admin';

                                        return (
                                            <div key={perm.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`perm-${perm.id}`}
                                                    checked={isChecked}
                                                    disabled={isLocked}
                                                    onCheckedChange={() =>
                                                        !isLocked && togglePermission(perm.id)
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`perm-${perm.id}`}
                                                    className="text-sm font-normal cursor-pointer leading-snug"
                                                >
                                                    {locale === 'hi' ? perm.name_hi : perm.name_en}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {role.code !== 'admin' && (
                        <Button type="submit" disabled={permForm.processing}>
                            {t('Update permissions')}
                        </Button>
                    )}
                </form>

                {/* Danger zone — delete non-system roles with no users */}
                {!role.is_system && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-destructive">{t('Danger zone')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('Deleting a role will remove it from all users who hold it.')}
                            </p>
                            <Form
                                action={RoleController.destroy.url(role.id)}
                                method="delete"
                                onBefore={() =>
                                    confirm(t('Are you sure you want to delete this role?'))
                                }
                            >
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                >
                                    {t('Delete role')}
                                </Button>
                            </Form>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}


