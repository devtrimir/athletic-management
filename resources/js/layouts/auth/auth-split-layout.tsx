import { Link, usePage } from '@inertiajs/react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left brand panel */}
            <div
                className="relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0b1e6b 0%, #152a8a 45%, #0a1650 100%)' }}
            >
                {/* Gold radial glows */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(ellipse at 15% 85%, rgba(200,150,40,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(200,150,40,0.12) 0%, transparent 50%)',
                    }}
                />

                {/* Centered branding */}
                <div className="relative z-20 flex flex-1 flex-col items-center justify-center gap-8">
                    <div className="relative">
                        {/* Gold ring around logo */}
                        <div
                            className="absolute -inset-2 rounded-full opacity-60"
                            style={{ background: 'conic-gradient(from 0deg, #c8962b, #f0c55a, #c8962b, #8a6010, #c8962b)' }}
                        />
                        <img
                            src="/logo.jpg"
                            alt="UP Police Sports Control Board"
                            className="relative w-44 h-44 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
                        />
                    </div>

                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-bold tracking-widest uppercase text-white">
                            UP Police
                        </h1>
                        <h2
                            className="text-lg font-semibold tracking-wider uppercase"
                            style={{ color: '#f0c55a' }}
                        >
                            Sports Control Board
                        </h2>
                        <div
                            className="mx-auto my-3 h-px w-24 opacity-50"
                            style={{ background: 'linear-gradient(to right, transparent, #c8962b, transparent)' }}
                        />
                        <p className="text-sm leading-relaxed text-blue-200 max-w-xs mx-auto">
                            Athlete, coach, team &amp; tournament management system for the Uttar Pradesh Police organisation.
                        </p>
                    </div>
                </div>

                {/* Bottom site name */}
                <Link
                    href={home()}
                    className="relative z-20 flex items-center text-sm text-blue-300 hover:text-white transition-colors"
                >
                    {name}
                </Link>
            </div>

            {/* Right form panel */}
            <div className="relative w-full lg:p-8">
                <div className="absolute right-4 top-4 z-10">
                    <LocaleSwitcher />
                </div>
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    {/* Mobile: logo */}
                    <div className="flex flex-col items-center gap-3 lg:hidden">
                        <img
                            src="/logo.jpg"
                            alt="UP Police Sports Control Board"
                            className="w-16 h-16 rounded-full object-cover ring-2"
                            style={{ ringColor: '#0b1e6b' }}
                        />
                        <span className="text-sm font-semibold tracking-wider uppercase text-primary">
                            UP Police Sports Control Board
                        </span>
                    </div>

                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
