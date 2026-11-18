import { Form } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { useId } from 'react';
import { Reveal } from '@/components/auth/reveal';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';

type Props = {
    /** Wayfinder form target (action + method) of the login endpoint. */
    form: Pick<ComponentProps<typeof Form>, 'action' | 'method'>;
    emailPlaceholder: string;
    forgotPasswordHref?: string;
    status?: string | null;
    /** True while this form is the visible panel; drives the staggered reveal. */
    active: boolean;
};

/** Email + password sign-in form that posts to an existing login endpoint. */
export function InlineLoginForm({
    form,
    emailPlaceholder,
    forgotPasswordHref,
    status,
    active,
}: Props) {
    const { t } = useTranslation();
    const id = useId();
    const tab = active ? 0 : -1;

    return (
        <Form
            {...form}
            resetOnSuccess={['password']}
            className="grid w-full gap-4 text-left"
        >
            {({ processing, errors }) => (
                <>
                    {status && (
                        <p className="text-center text-xs font-medium text-green-600">
                            {status}
                        </p>
                    )}

                    <Reveal on={active} index={0} className="grid gap-2">
                        <Label htmlFor={`${id}-email`}>
                            {t('Email address')}
                        </Label>
                        <Input
                            id={`${id}-email`}
                            type="email"
                            name="email"
                            required
                            tabIndex={tab}
                            autoComplete="email"
                            placeholder={emailPlaceholder}
                            className="h-11"
                        />
                        <InputError message={errors.email} />
                    </Reveal>

                    <Reveal on={active} index={1} className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor={`${id}-password`}>
                                {t('Password')}
                            </Label>
                            {forgotPasswordHref && (
                                <TextLink
                                    href={forgotPasswordHref}
                                    className="ml-auto text-sm"
                                    tabIndex={tab}
                                >
                                    {t('Forgot password?')}
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id={`${id}-password`}
                            name="password"
                            required
                            tabIndex={tab}
                            autoComplete="current-password"
                            placeholder={t('Password')}
                            className="h-11"
                        />
                        <InputError message={errors.password} />
                    </Reveal>

                    <Reveal on={active} index={2}>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id={`${id}-remember`}
                                name="remember"
                                tabIndex={tab}
                            />
                            <Label htmlFor={`${id}-remember`}>
                                {t('Remember me')}
                            </Label>
                        </div>
                    </Reveal>

                    <Reveal on={active} index={3}>
                        <Button
                            type="submit"
                            className="h-11 w-full"
                            disabled={processing}
                            tabIndex={tab}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {t('Log in')}
                        </Button>
                    </Reveal>
                </>
            )}
        </Form>
    );
}
