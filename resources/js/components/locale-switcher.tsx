import { router, usePage } from '@inertiajs/react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { update } from '@/routes/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type Locale = 'hi' | 'en';

const LOCALES: { value: Locale; label: string }[] = [
    { value: 'hi', label: 'हिंदी' },
    { value: 'en', label: 'English' },
];

type Props = {
    className?: string;
    collapsed?: boolean;
};

export function LocaleSwitcher({ className, collapsed = false }: Props) {
    const { locale } = usePage().props;

    const handleSwitch = (next: Locale) => {
        if (next === locale) {
            return;
        }

        router.patch(update.url(), { locale: next }, { preserveScroll: true });
    };

    if (collapsed) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn('h-8 w-8 rounded-md border border-sidebar-border bg-sidebar-accent/30', className)}
                        aria-label="Change language"
                    >
                        <Languages className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="min-w-32">
                    {LOCALES.map(({ value, label }) => (
                        <DropdownMenuItem
                            key={value}
                            onClick={() => handleSwitch(value)}
                            data-test={`locale-${value}`}
                        >
                            {label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div
            className={cn(
                'flex items-center gap-1 rounded-md border px-1 py-0.5',
                className,
            )}
        >
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
