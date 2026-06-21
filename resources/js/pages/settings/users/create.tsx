import { Head, Link, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Role = {
    id: number;
    code: string;
    name_hi: string;
    name_en: string;
    is_system: boolean;
};

type FormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    locale: string;
    roles: number[];
};

export default function Create({ roles }: { roles: Role[] }) {
    const { t } = useTranslation();
    const { locale } = usePage().props;
    const roleName = (role: Role) => (locale === 'hi' ? role.name_hi : role.name_en) || role.name_hi || role.name_en || role.code;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Users'), href: UserController.index.url() },
            { title: t('New user') },
        ],
    });

    const { data, setData, post, errors, processing } = useForm<FormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        locale: 'hi',
        roles: [],
    });

    function toggleRole(id: number) {
        setData('roles', data.roles.includes(id) ? data.roles.filter((r) => r !== id) : [...data.roles, id]);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(UserController.store.url());
    }

    return (
        <>
            <Head title={t('New user')} />

            <h1 className="sr-only">{t('New user')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('New user')}
                    description={t('Add a new user to this organization')}
                />

                <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
                    <div className="space-y-5 rounded-xl border bg-card p-6">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('User details')}</h3>

                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('Name')} <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                maxLength={255}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('Email')} <span className="text-destructive">*</span></Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                maxLength={255}
                                required
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('Password')} <span className="text-destructive">*</span></Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">{t('Confirm password')} <span className="text-destructive">*</span></Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="locale">{t('Language')}</Label>
                            <Select value={data.locale} onValueChange={(v) => setData('locale', v)}>
                                <SelectTrigger id="locale" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hi">{t('Hindi')}</SelectItem>
                                    <SelectItem value="en">{t('English')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.locale} />
                        </div>
                    </div>

                    {roles.length > 0 && (
                        <div className="space-y-3 rounded-xl border bg-card p-6">
                            <h3 className="text-sm font-medium text-muted-foreground">{t('Assign roles')}</h3>
                            <InputError message={errors.roles} />
                            <div className="space-y-2">
                                {roles.map((role) => (
                                    <div key={role.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`role-${role.id}`}
                                            checked={data.roles.includes(role.id)}
                                            onCheckedChange={() => toggleRole(role.id)}
                                        />
                                        <Label htmlFor={`role-${role.id}`} className="cursor-pointer font-normal">
                                            {roleName(role)}
                                            <span className="ml-1.5 text-muted-foreground">({role.code})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button disabled={processing}>{t('Create user')}</Button>
                        <Button variant="outline" asChild>
                            <Link href={UserController.index.url()}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
