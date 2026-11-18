import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Medal, ShieldCheck } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { InlineLoginForm } from '@/components/auth/inline-login-form';
import { Reveal } from '@/components/auth/reveal';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { dashboard as coachDashboard } from '@/routes/external-coach';
import { store as coachLoginStore } from '@/routes/external-coach/login';
import { store as loginStore } from '@/routes/login';
import { request } from '@/routes/password';

export type SignInView = 'choose' | 'user' | 'coach';

type Props = {
    initialView: SignInView;
    status: string | null;
    signedInAs: 'user' | 'coach' | null;
};

const EASE = 'ease-apple motion-reduce:transition-none';

/** A swappable pane: the active one is in focus, the others sit blurred to one side. */
function Pane({
    active,
    side,
    paneRef,
    children,
}: {
    active: boolean;
    side: 'left' | 'right';
    paneRef: (node: HTMLDivElement | null) => void;
    children: ReactNode;
}) {
    return (
        <div
            ref={paneRef}
            inert={!active}
            aria-hidden={!active}
            className={cn(
                'absolute inset-x-0 top-0 transition-[opacity,transform,filter] duration-[650ms]',
                EASE,
                active
                    ? 'blur-0 translate-x-0 scale-100 opacity-100'
                    : cn(
                          'pointer-events-none scale-[0.96] opacity-0 blur-[6px]',
                          side === 'left'
                              ? '-translate-x-10'
                              : 'translate-x-10',
                      ),
            )}
        >
            {children}
        </div>
    );
}

const PRIMARY =
    'group flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0b1e6b] px-4 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(11,30,107,0.7)] transition-[transform,box-shadow] duration-300 ease-apple hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgba(11,30,107,0.75)] active:translate-y-0 active:scale-[0.97]';
const SECONDARY =
    'group flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-white/80 px-4 text-[15px] font-semibold text-[#0b1e6b] shadow-sm ring-1 ring-black/[0.06] transition-[transform,box-shadow,background-color] duration-300 ease-apple hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0 active:scale-[0.97]';

export function WelcomeSignIn({ initialView, status, signedInAs }: Props) {
    const { t } = useTranslation();
    const [view, setView] = useState<SignInView>(initialView);
    const [panes, setPanes] = useState<
        Partial<Record<SignInView, HTMLDivElement | null>>
    >({});
    const [height, setHeight] = useState<number | undefined>(undefined);

    // Morph the card height to the active pane (like a sheet resizing).
    useLayoutEffect(() => {
        const node = panes[view];

        if (!node) {
            return;
        }

        const measure = () => setHeight(node.offsetHeight);

        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, [view, panes]);

    const pane = (key: SignInView) => (node: HTMLDivElement | null) =>
        setPanes((prev) =>
            prev[key] === node ? prev : { ...prev, [key]: node },
        );

    return (
        <div className="relative overflow-hidden rounded-[28px] bg-white/70 p-5 pt-12 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 sm:p-6 sm:pt-14 lg:p-8 lg:pt-16">
            <div className="text-center">
                <p className="text-xs font-medium text-[#0b1e6b] sm:text-sm">
                    {t('UP Police Sports Control Board (UPPSCB)')}
                </p>
                <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl lg:text-2xl">
                    {t(
                        'Sports records, teams, and performance in one secure system.',
                    )}
                </h1>
            </div>

            <div
                className={cn(
                    'relative mt-5 overflow-hidden transition-[height] duration-[650ms] lg:mt-6',
                    EASE,
                )}
                style={height === undefined ? undefined : { height }}
            >
                <Pane
                    active={view === 'choose'}
                    side="left"
                    paneRef={pane('choose')}
                >
                    <div className="grid gap-3 pb-4">
                        {signedInAs ? (
                            <Link
                                href={
                                    signedInAs === 'coach'
                                        ? coachDashboard().url
                                        : dashboard()
                                }
                                className={PRIMARY}
                            >
                                {t('Go to Dashboard')}
                            </Link>
                        ) : (
                            <>
                                <p className="text-center text-sm text-neutral-600">
                                    {t(
                                        'Choose the sign-in area for your role.',
                                    )}
                                </p>
                                <Reveal on={view === 'choose'} index={0}>
                                    <button
                                        type="button"
                                        className={PRIMARY}
                                        onClick={() => setView('user')}
                                    >
                                        <ShieldCheck className="size-[18px]" />
                                        {t('Log in to continue')}
                                        <ChevronRight className="size-4 opacity-70 transition-transform duration-300 ease-apple group-hover:translate-x-1" />
                                    </button>
                                </Reveal>
                                <Reveal on={view === 'choose'} index={1}>
                                    <button
                                        type="button"
                                        className={SECONDARY}
                                        onClick={() => setView('coach')}
                                    >
                                        <Medal className="size-[18px]" />
                                        {t('External coach login')}
                                        <ChevronRight className="size-4 opacity-60 transition-transform duration-300 ease-apple group-hover:translate-x-1" />
                                    </button>
                                </Reveal>
                            </>
                        )}
                        <p className="mt-1 text-center text-xs leading-relaxed text-neutral-500">
                            {t(
                                'Use this portal to manage members, coaches, teams, tournaments, attendance, and reports.',
                            )}
                        </p>
                    </div>
                </Pane>

                {(['user', 'coach'] as const).map((key) => (
                    <Pane
                        key={key}
                        active={view === key}
                        side="right"
                        paneRef={pane(key)}
                    >
                        <div className="pb-4">
                            <button
                                type="button"
                                className="mb-3 -ml-1 inline-flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-sm font-medium text-[#0b1e6b] transition-[transform,opacity] duration-300 ease-apple hover:-translate-x-0.5 active:scale-95"
                                onClick={() => setView('choose')}
                                tabIndex={view === key ? 0 : -1}
                            >
                                <ChevronLeft className="size-5" />
                                {t('Back')}
                            </button>
                            <Reveal on={view === key} index={0}>
                                <h2 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-900">
                                    {key === 'user'
                                        ? t('Log in to your account')
                                        : t('External coach login')}
                                </h2>
                            </Reveal>
                            <InlineLoginForm
                                form={
                                    key === 'user'
                                        ? loginStore.form()
                                        : coachLoginStore.form()
                                }
                                emailPlaceholder={
                                    key === 'user'
                                        ? 'email@example.com'
                                        : 'coach@example.com'
                                }
                                forgotPasswordHref={
                                    key === 'user' ? request().url : undefined
                                }
                                status={key === 'user' ? status : null}
                                active={view === key}
                            />
                        </div>
                    </Pane>
                ))}
            </div>
        </div>
    );
}
