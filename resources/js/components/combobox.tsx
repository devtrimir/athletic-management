import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type ComboboxItem = {
    value: string;
    label: string;
    badge?: string;
    badgeTone?: 'team' | 'individual' | 'neutral';
    group?: string;
    description?: string;
};

type Props = {
    value: string;
    onValueChange: (value: string) => void;
    items: ComboboxItem[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    id?: string;
    className?: string;
    popoverClassName?: string;
    disabled?: boolean;
};

export function Combobox({
    value,
    onValueChange,
    items,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    id,
    className,
    popoverClassName,
    disabled,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);

    const selected = items.find((item) => item.value === value);
    const groupedItems = React.useMemo(() => {
        const groups = new Map<string, ComboboxItem[]>();

        for (const item of items) {
            const group = item.group ?? '';
            groups.set(group, [...(groups.get(group) ?? []), item]);
        }

        return Array.from(groups.entries());
    }, [items]);
    const badgeClassName = (tone: ComboboxItem['badgeTone']): string => {
        switch (tone) {
            case 'team':
                return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300';
            case 'individual':
                return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300';
            default:
                return 'text-muted-foreground';
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'border-input h-9 w-full min-w-0 justify-between px-3 font-normal',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="min-w-0 flex-1 truncate text-left">
                        {selected?.label ?? (placeholder ?? t('Select…'))}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className={cn('w-[--radix-popover-trigger-width] p-0', popoverClassName)}
                align="start"
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder ?? t('Search…')} />
                    <CommandList className="max-h-96">
                        <CommandEmpty>{emptyMessage ?? t('No results.')}</CommandEmpty>
                        {groupedItems.map(([group, groupItems]) => (
                            <CommandGroup key={group || 'default'} heading={group || undefined}>
                                {groupItems.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        className="items-start gap-3 border-b py-2.5 last:border-b-0"
                                        value={[item.group, item.label, item.badge, item.description].filter(Boolean).join(' ')}
                                        onSelect={() => {
                                            onValueChange(item.value === value ? '' : item.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex min-w-0 flex-1 items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="min-w-0 font-medium leading-snug">
                                                        {item.label}
                                                    </span>
                                                    {item.badge ? (
                                                        <span
                                                            className={cn(
                                                                'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
                                                                badgeClassName(item.badgeTone),
                                                            )}
                                                        >
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {item.description ? (
                                                    <p className="mt-1 whitespace-normal text-xs leading-5 text-muted-foreground">
                                                        {item.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <CheckIcon
                                            className={cn(
                                                'ml-auto size-4',
                                                value === item.value ? 'opacity-100' : 'opacity-0',
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
