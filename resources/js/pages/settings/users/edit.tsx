import { Head, Link, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Role = {
    id: number;
    code: string;
    name_hi: string;
    name_en: string;
    is_system: boolean;
};

type UserData = {
    id: number;
    name: string;
    email: string;
    locale: string;
    is_active: boolean;
    must_change_password: boolean;
    role_ids: number[];
};

type ProfileFormData = {
    name: string;
    email: string;
    locale: string;
    is_active: boolean;
    password: string;
    password_confirmation: string;
};

type RolesFormData = {
    roles: number[];
};

export default function Edit({
    user,
    roles,
}: {
    user: UserData;
    roles: Role[];
}) {
    const { t } = useTranslation();
    const { locale } = usePage().props;
    const roleName = (role: Role) =>
        (locale === 'hi' ? role.name_hi : role.name_en) ||
        role.name_hi ||
        role.name_en ||
        role.code;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Users'), href: UserController.index.url() },
            { title: user.name, href: UserController.edit.url(user.id) },
        ],
    });

    const profileForm = useForm<ProfileFormData>({
        name: user.name,
        email: user.email,
        locale: user.locale,
        is_active: user.is_active,
        password: '',
        password_confirmation: '',
    });

    const rolesForm = useForm<RolesFormData>({
        roles: user.role_ids,
    });

    function toggleRole(id: number) {
        rolesForm.setData(
            'roles',
            rolesForm.data.roles.includes(id)
                ? rolesForm.data.roles.filter((r) => r !== id)
                : [...rolesForm.data.roles, id],
        );
    }

    function handleProfileSubmit(e: React.FormEvent) {
        e.preventDefault();
        profileForm.put(UserController.update.url(user.id));
    }

    function handleRolesSubmit(e: React.FormEvent) {
        e.preventDefault();
        rolesForm.post(UserController.updateRoles.url(user.id));
    }

    return (
        <>
            <Head title={`${t('Edit user')} — ${user.name}`} />

            <h1 className="sr-only">{t('Edit user')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('Edit user')}
                    description={user.name}
                />

                {/* ── Profile / account form ───────────────────────────── */}
                <form
                    onSubmit={handleProfileSubmit}
                    className="max-w-xl space-y-6"
                >
                    <div className="space-y-5 rounded-xl border bg-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {t('User details')}
                        </h3>

                        <div className="grid gap-2">
                            <Label htmlFor="name">
                                {t('Name')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={profileForm.data.name}
                                onChange={(e) =>
                                    profileForm.setData('name', e.target.value)
                                }
                                maxLength={255}
                                required
                            />
                            <InputError message={profileForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">
                                {t('Email')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileForm.data.email}
                                onChange={(e) =>
                                    profileForm.setData('email', e.target.value)
                                }
                                maxLength={255}
                                required
                            />
                            <InputError message={profileForm.errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="locale">{t('Language')}</Label>
                            <Select
                                value={profileForm.data.locale}
                                onValueChange={(v) =>
                                    profileForm.setData('locale', v)
                                }
                            >
                                <SelectTrigger id="locale" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hi">
                                        {t('Hindi')}
                                    </SelectItem>
                                    <SelectItem value="en">
                                        {t('English')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={profileForm.errors.locale} />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-xl border bg-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {t('Account status')}
                        </h3>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_active"
                                checked={profileForm.data.is_active}
                                onCheckedChange={(v) =>
                                    profileForm.setData('is_active', Boolean(v))
                                }
                            />
                            <Label
                                htmlFor="is_active"
                                className="cursor-pointer font-normal"
                            >
                                {t('User is active')}
                            </Label>
                        </div>
                        <InputError message={profileForm.errors.is_active} />
                    </div>

                    <div className="space-y-5 rounded-xl border bg-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {t('Reset password')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Leave blank to keep the current password. Setting a new password will require the user to change it on next login.',
                            )}
                        </p>

                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                {t('New password')}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={profileForm.data.password}
                                onChange={(e) =>
                                    profileForm.setData(
                                        'password',
                                        e.target.value,
                                    )
                                }
                                autoComplete="new-password"
                            />
                            <InputError message={profileForm.errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                {t('Confirm new password')}
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={profileForm.data.password_confirmation}
                                onChange={(e) =>
                                    profileForm.setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={profileForm.processing}>
                            {t('Save changes')}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={UserController.index.url()}>
                                {t('Cancel')}
                            </Link>
                        </Button>
                    </div>
                </form>

                {/* ── Roles form ────────────────────────────────────────── */}
                {roles.length > 0 && (
                    <form onSubmit={handleRolesSubmit} className="max-w-xl">
                        <div className="space-y-3 rounded-xl border bg-card p-6">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {t('Assign roles')}
                            </h3>
                            <InputError message={rolesForm.errors.roles} />
                            <div className="space-y-2">
                                {roles.map((role) => (
                                    <div
                                        key={role.id}
                                        className="flex items-center gap-2"
                                    >
                                        <Checkbox
                                            id={`role-${role.id}`}
                                            checked={rolesForm.data.roles.includes(
                                                role.id,
                                            )}
                                            onCheckedChange={() =>
                                                toggleRole(role.id)
                                            }
                                        />
                                        <Label
                                            htmlFor={`role-${role.id}`}
                                            className="cursor-pointer font-normal"
                                        >
                                            {roleName(role)}
                                            <span className="ml-1.5 text-muted-foreground">
                                                ({role.code})
                                            </span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <Button disabled={rolesForm.processing}>
                                {t('Update roles')}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}
