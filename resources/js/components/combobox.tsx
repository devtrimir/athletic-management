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
    disabled,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);

    const selected = items.find((item) => item.value === value);

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
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder ?? t('Search…')} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage ?? t('No results.')}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={item.label}
                                    onSelect={() => {
                                        onValueChange(item.value === value ? '' : item.value);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <span className="truncate">
                                            {item.label}
                                        </span>
                                        {item.badge ? (
                                            <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                                                {item.badge}
                                            </span>
                                        ) : null}
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
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
