import { Form } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useId, useState } from 'react';
import { Reveal } from '@/components/auth/reveal';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Props = {
    /** Wayfinder form target (action + method) of the login endpoint. */
    form: Pick<ComponentProps<typeof Form>, 'action' | 'method'>;
    emailPlaceholder: string;
    forgotPasswordHref?: string;
    status?: string | null;
    /** True while this form is the visible panel; drives the staggered reveal. */
    active: boolean;
};

const INPUT =
    'peer w-full bg-transparent text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400';

/** One row of the grouped field: icon, small caption and the input itself. */
function FieldRow({
    icon: Icon,
    label,
    htmlFor,
    trailing,
    children,
}: {
    icon: typeof Mail;
    label: string;
    htmlFor: string;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="group/row flex items-center gap-3 px-4 py-2 transition-colors duration-300 ease-apple focus-within:bg-[#0b1e6b]/[0.03]">
            <Icon className="size-[18px] shrink-0 text-neutral-400 transition-colors duration-300 group-focus-within/row:text-[#0b1e6b]" />
            <div className="min-w-0 flex-1">
                <label
                    htmlFor={htmlFor}
                    className="block text-[11px] leading-4 font-medium text-neutral-500"
                >
                    {label}
                </label>
                {children}
            </div>
            {trailing}
        </div>
    );
}

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
    const [showPassword, setShowPassword] = useState(false);
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

                    <Reveal on={active} index={0} className="grid gap-1.5">
                        <div
                            className={cn(
                                'divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-white/90 ring-1 ring-black/10 transition-[box-shadow] duration-300 ease-apple focus-within:shadow-[0_0_0_5px_rgba(11,30,107,0.08)] focus-within:ring-2 focus-within:ring-[#0b1e6b]/50',
                                (errors.email || errors.password) &&
                                    'ring-red-400/70 focus-within:ring-red-500/70',
                            )}
                        >
                            <FieldRow
                                icon={Mail}
                                label={t('Email address')}
                                htmlFor={`${id}-email`}
                            >
                                <input
                                    id={`${id}-email`}
                                    type="email"
                                    name="email"
                                    required
                                    tabIndex={tab}
                                    autoComplete="email"
                                    placeholder={emailPlaceholder}
                                    className={INPUT}
                                />
                            </FieldRow>
                            <FieldRow
                                icon={LockKeyhole}
                                label={t('Password')}
                                htmlFor={`${id}-password`}
                                trailing={
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color,transform] duration-200 ease-apple hover:bg-black/5 hover:text-neutral-700 active:scale-90"
                                        aria-label={
                                            showPassword
                                                ? t('Hide password')
                                                : t('Show password')
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                }
                            >
                                <input
                                    id={`${id}-password`}
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    tabIndex={tab}
                                    autoComplete="current-password"
                                    placeholder={t('Password')}
                                    className={INPUT}
                                />
                            </FieldRow>
                        </div>
                        <InputError message={errors.email} />
                        <InputError message={errors.password} />
                    </Reveal>

                    <Reveal on={active} index={1}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                                <Checkbox
                                    id={`${id}-remember`}
                                    name="remember"
                                    tabIndex={tab}
                                />
                                <Label
                                    htmlFor={`${id}-remember`}
                                    className="text-xs text-neutral-600"
                                >
                                    {t('Remember me')}
                                </Label>
                            </div>
                            {forgotPasswordHref && (
                                <TextLink
                                    href={forgotPasswordHref}
                                    className="text-xs text-[#0b1e6b] no-underline hover:underline"
                                    tabIndex={tab}
                                >
                                    {t('Forgot password?')}
                                </TextLink>
                            )}
                        </div>
                    </Reveal>

                    <Reveal on={active} index={2}>
                        <Button
                            type="submit"
                            className="h-12 w-full rounded-2xl bg-[#0b1e6b] text-[15px] font-semibold shadow-[0_10px_24px_-10px_rgba(11,30,107,0.7)] transition-[transform,box-shadow,background-color] duration-300 ease-apple hover:-translate-y-0.5 hover:bg-[#0b1e6b] hover:shadow-[0_14px_28px_-10px_rgba(11,30,107,0.75)] active:translate-y-0 active:scale-[0.97]"
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
