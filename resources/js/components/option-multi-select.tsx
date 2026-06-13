import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

export type MultiSelectOption = {
    value: string;
    label: string;
};

type Props = {
    value: string[];
    onValueChange: (value: string[]) => void;
    options: MultiSelectOption[];
    placeholder: string;
    searchPlaceholder?: string;
    className?: string;
};

export function OptionMultiSelect({
    value,
    onValueChange,
    options,
    placeholder,
    searchPlaceholder,
    className,
}: Props) {
    const { t } = useTranslation();
    const selectedOptions = options.filter((option) =>
        value.includes(option.value),
    );

    function toggle(nextValue: string) {
        onValueChange(
            value.includes(nextValue)
                ? value.filter((item) => item !== nextValue)
                : [...value, nextValue],
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                        'h-9 min-w-0 justify-between px-3 font-normal',
                        selectedOptions.length === 0 && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-1.5">
                        {selectedOptions.length === 0 ? (
                            <span className="truncate">{placeholder}</span>
                        ) : (
                            <>
                                <span className="truncate">
                                    {selectedOptions
                                        .slice(0, 2)
                                        .map((option) => option.label)
                                        .join(', ')}
                                </span>
                                {selectedOptions.length > 2 && (
                                    <Badge
                                        variant="secondary"
                                        className="shrink-0 px-1.5 py-0 text-[10px]"
                                    >
                                        +{selectedOptions.length - 2}
                                    </Badge>
                                )}
                            </>
                        )}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput
                        placeholder={searchPlaceholder ?? t('Search…')}
                    />
                    <CommandList className="max-h-64">
                        <CommandEmpty>{t('No results.')}</CommandEmpty>
                        <CommandGroup>
                            {selectedOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1 border-b p-2">
                                    {selectedOptions.map((option) => (
                                        <Badge
                                            key={option.value}
                                            variant="secondary"
                                            className="gap-1 pr-1"
                                        >
                                            <span className="max-w-32 truncate">
                                                {option.label}
                                            </span>
                                            <button
                                                type="button"
                                                className="rounded-sm p-0.5 hover:bg-muted"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    toggle(option.value);
                                                }}
                                            >
                                                <XIcon className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {options.map((option) => {
                                const selected = value.includes(option.value);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => toggle(option.value)}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                'mr-2 size-4',
                                                selected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
