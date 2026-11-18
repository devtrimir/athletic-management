import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    id?: string;
    className?: string;
};

/** Searchable single select that can be cleared (X on the trigger and a "Clear selection" row). */
export function ClearableSelect({
    value,
    onValueChange,
    options,
    placeholder,
    id,
    className,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => option.value === value);

    function choose(next: string) {
        onValueChange(next);
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                        'h-9 w-full min-w-0 justify-between px-3 font-normal',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="truncate">
                        {selected?.label ?? placeholder}
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-1">
                        {selected && (
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={t('Clear selection')}
                                className="rounded-sm p-0.5 opacity-60 hover:opacity-100"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onValueChange('');
                                }}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.stopPropagation();
                                        onValueChange('');
                                    }
                                }}
                            >
                                <XIcon className="size-3.5" />
                            </span>
                        )}
                        <ChevronsUpDownIcon className="size-4 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder={t('Search…')} />
                    <CommandList className="max-h-60">
                        <CommandEmpty>{t('No results.')}</CommandEmpty>
                        <CommandGroup>
                            {selected && (
                                <CommandItem
                                    value="__clear__"
                                    onSelect={() => choose('')}
                                    className="text-muted-foreground"
                                >
                                    <XIcon className="mr-2 size-4" />
                                    {t('Clear selection')}
                                </CommandItem>
                            )}
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => choose(option.value)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            'mr-2 size-4',
                                            option.value === value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
