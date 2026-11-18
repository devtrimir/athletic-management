import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

/** Compact popover filter trigger used in listing filter bars. */
export function FilterPill({
    label,
    activeLabel,
    onClear,
    children,
}: {
    label: string;
    activeLabel?: string;
    onClear: () => void;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const isActive = !!activeLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={[
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                        isActive
                            ? 'border-primary/40 bg-primary/8 text-primary hover:bg-primary/12'
                            : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')}
                >
                    <span>{label}</span>
                    {isActive && (
                        <span className="inline-flex animate-in items-center gap-1.5 duration-150 fade-in-0">
                            <span className="text-primary/50">·</span>
                            <span className="max-w-24 truncate font-semibold">
                                {activeLabel}
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Clear ${label}`}
                                className="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                    setOpen(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        onClear();
                                        setOpen(false);
                                    }
                                }}
                            >
                                <X className="size-3" />
                            </span>
                        </span>
                    )}
                    {!isActive && <ChevronDown className="size-3 opacity-50" />}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                {children}
            </PopoverContent>
        </Popover>
    );
}

export function OptionList({
    options,
    value,
    onSelect,
}: {
    options: { value: string; label: string }[];
    value: string | undefined;
    onSelect: (v: string | undefined) => void;
}) {
    return (
        <div className="py-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() =>
                        onSelect(value === opt.value ? undefined : opt.value)
                    }
                >
                    <Check
                        className={[
                            'size-3.5 shrink-0',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                        ].join(' ')}
                    />
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function SearchableOptionList({
    options,
    value,
    onSelect,
    searchPlaceholder,
}: {
    options: { value: string; label: string }[];
    value: string | undefined;
    onSelect: (v: string | undefined) => void;
    searchPlaceholder: string;
}) {
    return (
        <Command className="w-56">
            <CommandInput
                placeholder={searchPlaceholder}
                className="h-8 text-sm"
            />
            <CommandList className="max-h-52">
                <CommandEmpty>—</CommandEmpty>
                <CommandGroup>
                    {options.map((opt) => (
                        <CommandItem
                            key={opt.value}
                            value={opt.label}
                            onSelect={() =>
                                onSelect(
                                    value === opt.value ? undefined : opt.value,
                                )
                            }
                            className="gap-2"
                        >
                            <Check
                                className={[
                                    'size-3.5 shrink-0',
                                    value === opt.value
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                ].join(' ')}
                            />
                            {opt.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

/** Searchable list where several options can be ticked at once. */
export function MultiOptionList({
    options,
    value,
    onChange,
    searchPlaceholder,
}: {
    options: { value: string; label: string }[];
    value: string[];
    onChange: (v: string[]) => void;
    searchPlaceholder: string;
}) {
    return (
        <Command className="w-60">
            <CommandInput
                placeholder={searchPlaceholder}
                className="h-8 text-sm"
            />
            <CommandList className="max-h-56">
                <CommandEmpty>—</CommandEmpty>
                <CommandGroup>
                    {options.map((opt) => {
                        const selected = value.includes(opt.value);

                        return (
                            <CommandItem
                                key={opt.value}
                                value={opt.label}
                                onSelect={() =>
                                    onChange(
                                        selected
                                            ? value.filter(
                                                  (v) => v !== opt.value,
                                              )
                                            : [...value, opt.value],
                                    )
                                }
                                className="gap-2"
                            >
                                <Check
                                    className={[
                                        'size-3.5 shrink-0',
                                        selected ? 'opacity-100' : 'opacity-0',
                                    ].join(' ')}
                                />
                                {opt.label}
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

/**
 * Pill with a free-text input inside. Applies automatically ~400ms after the
 * user stops typing (and immediately on Enter or when focus leaves the box).
 */
export function TextFilterPill({
    label,
    value,
    placeholder,
    onApply,
}: {
    label: string;
    value: string;
    placeholder: string;
    onApply: (value: string) => void;
}) {
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        // Keep the box in sync when the filter is changed or cleared elsewhere.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(value);
    }, [value]);

    useEffect(() => {
        if (draft.trim() === value) {
            return;
        }

        const timer = setTimeout(() => onApply(draft.trim()), 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    return (
        <FilterPill
            label={label}
            activeLabel={value || undefined}
            onClear={() => {
                setDraft('');
                onApply('');
            }}
        >
            <div className="p-3">
                <Input
                    autoFocus
                    value={draft}
                    placeholder={placeholder}
                    className="h-8 w-52 text-sm"
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() =>
                        draft.trim() !== value && onApply(draft.trim())
                    }
                    onKeyDown={(event) =>
                        event.key === 'Enter' && onApply(draft.trim())
                    }
                />
            </div>
        </FilterPill>
    );
}

/** Date range pill with optional quick presets (inclusive ISO dates). */
export function DateRangePill({
    label,
    from,
    to,
    onChange,
    presets = [],
}: {
    label: string;
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    presets?: { label: string; range: () => [string, string] }[];
}) {
    return (
        <FilterPill
            label={label}
            activeLabel={
                from || to ? `${from || '…'} – ${to || '…'}` : undefined
            }
            onClear={() => onChange('', '')}
        >
            <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        className="h-8 w-36 text-sm"
                        value={from}
                        max={to || undefined}
                        onChange={(event) => onChange(event.target.value, to)}
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                        type="date"
                        className="h-8 w-36 text-sm"
                        value={to}
                        min={from || undefined}
                        onChange={(event) => onChange(from, event.target.value)}
                    />
                </div>
                {presets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                className="rounded-md border px-2 py-0.5 text-xs hover:bg-accent"
                                onClick={() => onChange(...preset.range())}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </FilterPill>
    );
}

/** YYYY-MM-DD in local time (toISOString would shift the day for IST). */
export function isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

export function dateRangePresets(t: (key: string) => string) {
    const daysBack = (days: number): [string, string] => {
        const start = new Date();
        start.setDate(start.getDate() - days);

        return [isoDate(start), isoDate(new Date())];
    };

    return [
        { label: t('Today'), range: () => daysBack(0) },
        { label: t('Last 7 days'), range: () => daysBack(6) },
        { label: t('Last 30 days'), range: () => daysBack(29) },
        {
            label: t('This month'),
            range: (): [string, string] => {
                const now = new Date();

                return [
                    isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
                    isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
                ];
            },
        },
    ];
}
