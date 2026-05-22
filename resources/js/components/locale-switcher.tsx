import { router, usePage } from '@inertiajs/react';
import { update } from '@/routes/locale';

type Locale = 'hi' | 'en';

const LOCALES: { value: Locale; label: string }[] = [
    { value: 'hi', label: 'हिंदी' },
    { value: 'en', label: 'English' },
];

export function LocaleSwitcher() {
    const { locale } = usePage().props;

    const handleSwitch = (next: Locale) => {
        if (next === locale) {
            return;
        }

        router.patch(update.url(), { locale: next }, { preserveScroll: true });
    };

    return (
        <div className="flex items-center gap-1 rounded-md border px-1 py-0.5">
            {LOCALES.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => handleSwitch(value)}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        locale === value
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-pressed={locale === value}
                    data-test={`locale-${value}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
