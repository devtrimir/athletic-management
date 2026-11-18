import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { WelcomeSignIn } from '@/components/auth/welcome-sign-in';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';

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
        image: '/images/home-bg/tennis-1.png',
    },
    'multi-sport': {
        label: 'Stadium',
        image: '/images/home-bg/multi-sport-1.png',
    },
};

export default function Welcome({
    panel = null,
    status = null,
    signedInAs = null,
}: {
    panel?: 'user' | 'coach' | null;
    status?: string | null;
    signedInAs?: 'user' | 'coach' | null;
}) {
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
                <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden rounded-none bg-white p-4 shadow-none min-[1921px]:aspect-[16/9] min-[1921px]:max-h-[calc(100vh-4rem)] min-[1921px]:min-h-0 min-[1921px]:max-w-[1920px] min-[1921px]:rounded-3xl min-[1921px]:shadow-2xl sm:p-6 lg:p-8">
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
                        className={`relative z-10 w-full max-w-xs transition-transform duration-700 ease-in-out motion-safe:animate-apple-rise sm:max-w-sm lg:max-w-md xl:max-w-lg ${
                            isTennis
                                ? 'lg:translate-x-[8vw] xl:translate-x-[12vw] 2xl:translate-x-[16vw]'
                                : 'translate-x-0'
                        }`}
                    >
                        <div className="absolute -top-8 left-1/2 z-20 -translate-x-1/2 motion-safe:animate-in motion-safe:delay-100 motion-safe:zoom-in-95 motion-safe:fade-in sm:-top-10 lg:-top-12 xl:-top-14">
                            <div className="rounded-full bg-white p-1.5 shadow-xl sm:p-2">
                                <img
                                    src="/logo.jpg"
                                    alt="UP Police Sports Control Board"
                                    className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20 sm:h-16 sm:w-16 lg:h-20 lg:w-20 xl:h-24 xl:w-24"
                                />
                            </div>
                        </div>

                        <WelcomeSignIn
                            initialView={panel ?? 'choose'}
                            status={status}
                            signedInAs={signedInAs}
                        />

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
