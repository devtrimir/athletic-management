import { Form } from '@inertiajs/react';
import type { ComponentProps } from 'react';
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
};

const FIELD =
    'h-10 rounded-lg border-[#0b1e6b]/15 bg-white px-3 text-sm lg:h-11';

/** Email + password sign-in form that posts to an existing login endpoint. */
export function InlineLoginForm({
    form,
    emailPlaceholder,
    forgotPasswordHref,
    status,
}: Props) {
    const { t } = useTranslation();

    return (
        <Form
            {...form}
            resetOnSuccess={['password']}
            className="grid w-full gap-3 text-left"
        >
            {({ processing, errors }) => (
                <>
                    {status && (
                        <p className="text-center text-xs font-medium text-green-600">
                            {status}
                        </p>
                    )}

                    <div className="grid gap-1.5 motion-safe:animate-in motion-safe:delay-100 motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
                        <Label htmlFor="email" className="text-xs">
                            {t('Email address')}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoFocus
                            autoComplete="email"
                            placeholder={emailPlaceholder}
                            className={FIELD}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5 motion-safe:animate-in motion-safe:delay-200 motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
                        <div className="flex items-center">
                            <Label htmlFor="password" className="text-xs">
                                {t('Password')}
                            </Label>
                            {forgotPasswordHref && (
                                <TextLink
                                    href={forgotPasswordHref}
                                    className="ml-auto text-xs"
                                    tabIndex={5}
                                >
                                    {t('Forgot password?')}
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id="password"
                            name="password"
                            required
                            autoComplete="current-password"
                            placeholder={t('Password')}
                            className={FIELD}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-2.5 motion-safe:animate-in motion-safe:delay-300 motion-safe:fade-in">
                        <Checkbox id="remember" name="remember" />
                        <Label htmlFor="remember" className="text-xs">
                            {t('Remember me')}
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="h-10 w-full rounded-lg bg-[#0b1e6b] text-sm hover:bg-[#0b1e6b]/90 motion-safe:animate-in motion-safe:delay-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 lg:h-11"
                        disabled={processing}
                        data-test="login-button"
                    >
                        {processing && <Spinner />}
                        {t('Log in')}
                    </Button>
                </>
            )}
        </Form>
    );
}
