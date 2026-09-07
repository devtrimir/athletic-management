import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, login } from '@/routes';
import externalCoach from '@/routes/external-coach';

type HomeBackgroundPreset = 'tennis' | 'multi-sport';

const STORAGE_KEY = 'home-background-preset-v2';

const PRESETS: Record<
    HomeBackgroundPreset,
    {
        label: string;
        image: string;
    }
> = {
    tennis: {
        label: 'Court',
        image: '/images/home-bg/tennis.png',
    },
    'multi-sport': {
        label: 'Stadium',
        image: '/images/home-bg/multi-sport.png',
    },
};

export default function Welcome() {
    const { auth } = usePage().props;
    const { t } = useTranslation();
    const [preset, setPreset] = useState<HomeBackgroundPreset>(() => {
        if (typeof window === 'undefined') {
            return 'multi-sport';
        }

        const stored = localStorage.getItem(
            STORAGE_KEY,
        ) as HomeBackgroundPreset | null;

        return stored && PRESETS[stored] ? stored : 'multi-sport';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, preset);
    }, [preset]);

    const handlePresetChange = (value: HomeBackgroundPreset) => {
        if (!value) {
            return;
        }

        setPreset(value);
    };

    const isTennis = preset === 'tennis';

    return (
        <>
            <Head title={t('UP Police Sports Management System')} />

            <div
                className="flex min-h-svh items-center justify-center p-0 transition-colors duration-700 min-[1921px]:p-8"
                style={{
                    backgroundColor: isTennis ? '#1685c6' : '#f8fafc',
                }}
            >
                <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden rounded-none bg-white p-6 shadow-none min-[1921px]:aspect-[2100/1536] min-[1921px]:max-h-[calc(100vh-4rem)] min-[1921px]:min-h-0 min-[1921px]:max-w-[1920px] min-[1921px]:rounded-3xl min-[1921px]:shadow-2xl sm:p-8">
                    {/* Crossfading full-screen backgrounds */}
                    {(Object.keys(PRESETS) as HomeBackgroundPreset[]).map(
                        (key) => (
                            <div
                                key={key}
                                aria-hidden
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
                                style={{
                                    backgroundImage: `url(${PRESETS[key].image})`,
                                    opacity: preset === key ? 1 : 0,
                                    imageRendering: '-webkit-optimize-contrast',
                                }}
                            />
                        ),
                    )}

                    {/* Dynamic vignette overlay */}
                    <div
                        aria-hidden
                        className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                        style={{
                            background:
                                'radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.45) 100%)',
                            opacity: isTennis ? 1 : 0.55,
                        }}
                    />

                    {/* Content card */}
                    <div
                        className={`relative z-10 w-full max-w-xl transition-transform duration-700 ease-in-out motion-safe:animate-in motion-safe:duration-1000 motion-safe:slide-in-from-bottom-10 motion-safe:zoom-in-95 motion-safe:fade-in ${
                            isTennis ? 'lg:translate-x-[18vw]' : 'translate-x-0'
                        }`}
                    >
                        <div className="relative rounded-[2rem] bg-white p-8 pb-10 shadow-2xl sm:p-10 sm:pb-12 lg:p-12 lg:pb-14">
                            <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2 motion-safe:animate-in motion-safe:delay-100 motion-safe:zoom-in-95 motion-safe:fade-in sm:-top-16">
                                <div className="rounded-full bg-white p-2 shadow-xl">
                                    <img
                                        src="/logo.jpg"
                                        alt="UP Police Sports Control Board"
                                        className="h-24 w-24 rounded-full object-cover ring-2 ring-white/20 sm:h-28 sm:w-28"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-center pt-14 text-center sm:pt-16">
                                <p className="text-base font-medium text-[#0b1e6b] motion-safe:animate-in motion-safe:delay-200 motion-safe:fade-in motion-safe:slide-in-from-bottom-3 sm:text-lg">
                                    {t(
                                        'UP Police Sports Control Board (UPPSCB)',
                                    )}
                                </p>

                                <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 motion-safe:animate-in motion-safe:delay-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:text-3xl lg:text-4xl">
                                    {t(
                                        'Sports records, teams, and performance in one secure system.',
                                    )}
                                </h1>

                                <p className="mt-5 text-base text-neutral-600 motion-safe:animate-in motion-safe:delay-400 motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:text-lg">
                                    {t(
                                        'Choose the sign-in area for your role.',
                                    )}
                                </p>

                                <div className="mt-6 grid w-full gap-4 motion-safe:animate-in motion-safe:delay-500 motion-safe:fade-in motion-safe:slide-in-from-bottom-6">
                                    {auth.user ? (
                                        <Button
                                            asChild
                                            className="h-14 w-full rounded-xl bg-[#0b1e6b] text-base hover:bg-[#0b1e6b]/90"
                                            size="lg"
                                        >
                                            <Link href={dashboard()}>
                                                {t('Go to Dashboard')}
                                            </Link>
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                asChild
                                                className="h-14 w-full rounded-xl bg-[#0b1e6b] text-base hover:bg-[#0b1e6b]/90"
                                                size="lg"
                                            >
                                                <Link href={login()}>
                                                    {t('Log in to continue')}
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                className="h-14 w-full rounded-xl border-2 border-[#0b1e6b] bg-white text-base text-[#0b1e6b] hover:bg-[#0b1e6b]/5"
                                                size="lg"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={externalCoach.login()}
                                                >
                                                    {t('External coach login')}
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <div className="mt-8 w-full motion-safe:animate-in motion-safe:delay-600 motion-safe:fade-in">
                                    <div className="border-t border-neutral-200" />
                                </div>

                                <p className="mt-6 max-w-lg text-sm leading-relaxed text-neutral-500 motion-safe:animate-in motion-safe:delay-700 motion-safe:fade-in sm:text-base">
                                    {t(
                                        'Use this portal to manage members, coaches, teams, tournaments, attendance, and reports.',
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Background selector */}
                        <div className="mt-6 flex flex-col items-center gap-4 motion-safe:animate-in motion-safe:delay-700 motion-safe:fade-in">
                            <ToggleGroup
                                type="single"
                                value={preset}
                                onValueChange={(value) =>
                                    handlePresetChange(
                                        value as HomeBackgroundPreset,
                                    )
                                }
                                variant="outline"
                                size="sm"
                                aria-label={t('Select home background')}
                            >
                                {(
                                    Object.keys(
                                        PRESETS,
                                    ) as HomeBackgroundPreset[]
                                ).map((key) => (
                                    <ToggleGroupItem
                                        key={key}
                                        value={key}
                                        className="bg-white/90 text-xs text-neutral-700 capitalize shadow-sm transition-transform duration-200 hover:scale-105 data-[state=on]:bg-white data-[state=on]:text-[#0b1e6b]"
                                    >
                                        {t(PRESETS[key].label)}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>

                            <p className="text-xs text-white/80">
                                {t('Uttar Pradesh Police Sports Control Board')}{' '}
                                · {t('UPPSCB')}
                            </p>
                        </div>
                    </div>

                    {/* Locale switcher */}
                    <div className="absolute top-4 right-4 z-10 motion-safe:animate-in motion-safe:delay-300 motion-safe:fade-in motion-safe:slide-in-from-top-2">
                        <LocaleSwitcher />
                    </div>
                </div>
            </div>
        </>
    );
}
