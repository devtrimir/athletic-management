import { Form, Head, setLayoutProps } from '@inertiajs/react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';

export default function ExternalCoachLogin() {
    const { t } = useTranslation();

    setLayoutProps({
        title: t('External coach login'),
        description: t(
            'Sign in to submit assigned athlete training attendance.',
        ),
    });

    return (
        <>
            <Head title={t('External coach login')} />

            <Form
                action="/external-coach/login"
                method="post"
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('Email address')}</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="coach@example.com"
                                className="h-11 rounded-lg border-[#0b1e6b]/15 bg-white/70 px-4"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('Password')}</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                placeholder={t('Password')}
                                className="h-11 rounded-lg border-[#0b1e6b]/15 bg-white/70 px-4"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox id="remember" name="remember" />
                            <Label htmlFor="remember">{t('Remember me')}</Label>
                        </div>

                        <Button
                            type="submit"
                            className="mt-2 h-11 w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            {t('Log in')}
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}
