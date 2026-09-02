import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { home } from '@/routes';
import type { AuthBackgroundPreset, AuthLayoutProps } from '@/types';

const STORAGE_KEY = 'auth-background-preset';

const PRESETS: Record<
    AuthBackgroundPreset,
    {
        label: string;
        image: string;
    }
> = {
    logo: {
        label: 'Logo',
        image: '/images/auth/first-bg.jpg',
    },
    training: {
        label: 'Training',
        image: '/images/auth/training-bg.jpg',
    },
};

export default function AuthSplitLayout({
    children,
    title,
    description,
    defaultBackground = 'logo',
}: AuthLayoutProps) {
    const { name } = usePage().props;
    const [preset, setPreset] = useState<AuthBackgroundPreset>(() => {
        if (typeof window === 'undefined') {
            return defaultBackground;
        }

        const stored = localStorage.getItem(
            STORAGE_KEY,
        ) as AuthBackgroundPreset | null;

        return stored && PRESETS[stored] ? stored : defaultBackground;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, preset);
    }, [preset]);

    const handlePresetChange = (value: AuthBackgroundPreset) => {
        if (!value) {
            return;
        }

        setPreset(value);
    };

    const isLogo = preset === 'logo';

    return (
        <div className="relative flex min-h-svh items-center justify-center p-4 sm:p-8">
            {/* Crossfading full-screen backgrounds (all preloaded for smooth switching) */}
            {(Object.keys(PRESETS) as AuthBackgroundPreset[]).map((key) => (
                <div
                    key={key}
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
                    style={{
                        backgroundImage: `url(${PRESETS[key].image})`,
                        opacity: preset === key ? 1 : 0,
                    }}
                />
            ))}

            {/* Crossfading overlays: dark vignette for photos, soft white wash for logo */}
            <div
                aria-hidden
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                    background:
                        'radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.45) 100%)',
                    opacity: isLogo ? 0 : 1,
                }}
            />
            <div
                aria-hidden
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                    background:
                        'linear-gradient(to left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0) 100%)',
                    opacity: isLogo ? 1 : 0,
                }}
            />

            {/* Auth card: centered by default, slides right for the logo preset */}
            <div
                className={`relative z-10 w-full max-w-md transition-transform duration-700 ease-in-out ${
                    isLogo ? 'lg:translate-x-[22vw]' : 'translate-x-0'
                }`}
            >
                <div
                    className="absolute -top-1 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full shadow-lg"
                    style={{
                        background:
                            'linear-gradient(to right, #c8962b, #f0c55a, #c8962b)',
                    }}
                />
                <Card
                    className={`overflow-hidden rounded-2xl shadow-2xl backdrop-blur-2xl transition-colors duration-700 ${
                        isLogo
                            ? 'border-[#0b1e6b]/10 bg-white/80'
                            : 'border-white/40 bg-gradient-to-br from-white/45 via-white/30 to-white/15'
                    }`}
                >
                    <CardHeader className="pb-2 text-center">
                        <div className="mx-auto mb-4 flex flex-col items-center gap-3">
                            <div className="relative">
                                {/* Gold ring around logo */}
                                <div
                                    className="absolute -inset-1 rounded-full opacity-60"
                                    style={{
                                        background:
                                            'conic-gradient(from 0deg, #c8962b, #f0c55a, #c8962b, #8a6010, #c8962b)',
                                    }}
                                />
                                <img
                                    src="/logo.jpg"
                                    alt="UP Police Sports Control Board"
                                    className="relative h-20 w-20 rounded-full object-cover shadow-xl ring-2 ring-white/20"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-sm font-bold tracking-widest text-[#0b1e6b] uppercase">
                                    UP Police
                                </h1>
                                <h2 className="text-xs font-bold tracking-wider text-[#0b1e6b] uppercase drop-shadow-sm">
                                    Sports Control Board
                                </h2>
                            </div>
                        </div>

                        <CardTitle className="text-xl font-medium">
                            {title}
                        </CardTitle>
                        <CardDescription className="text-[#0b1e6b]/90">
                            {description}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>{children}</CardContent>
                </Card>

                {/* Background selector and home link */}
                <div className="mt-6 flex flex-col items-center gap-4">
                    <ToggleGroup
                        type="single"
                        value={preset}
                        onValueChange={(value) =>
                            handlePresetChange(value as AuthBackgroundPreset)
                        }
                        variant="outline"
                        size="sm"
                        aria-label="Select login background"
                    >
                        {(Object.keys(PRESETS) as AuthBackgroundPreset[]).map(
                            (key) => (
                                <ToggleGroupItem
                                    key={key}
                                    value={key}
                                    className="bg-white/80 text-xs capitalize data-[state=on]:bg-white data-[state=on]:text-[#0b1e6b]"
                                >
                                    {PRESETS[key].label}
                                </ToggleGroupItem>
                            ),
                        )}
                    </ToggleGroup>

                    <Link
                        href={home()}
                        className={`text-xs transition-colors ${
                            isLogo
                                ? 'text-[#0b1e6b]/80 hover:text-[#0b1e6b]'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        {name}
                    </Link>
                </div>
            </div>

            {/* Locale switcher */}
            <div className="absolute top-4 right-4 z-10">
                <LocaleSwitcher />
            </div>
        </div>
    );
}
