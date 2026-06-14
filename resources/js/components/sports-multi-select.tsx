import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type SportOption = { id: number; name: string };

type Props = {
    value: string[];
    onValueChange: (value: string[]) => void;
    sports: SportOption[];
    locale: unknown;
    placeholder?: string;
    id?: string;
};

export function SportsMultiSelect({ value, onValueChange, sports, locale, placeholder, id }: Props) {
    const { t } = useTranslation();

    const selectedSports = sports.filter((sport) => value.includes(String(sport.id)));
    const sportLabel = (sport: SportOption) => (locale === 'en' ? sport.name : sport.name);

    function toggleSport(sportId: string) {
        onValueChange(
            value.includes(sportId)
                ? value.filter((id) => id !== sportId)
                : [...value, sportId],
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn('h-9 w-full justify-between px-3 font-normal', selectedSports.length === 0 && 'text-muted-foreground')}
                >
                    <span className="flex min-w-0 items-center gap-1.5">
                        {selectedSports.length === 0 ? (
                            <span className="truncate">{placeholder ?? t('Select sports')}</span>
                        ) : (
                            <>
                                <span className="truncate">{selectedSports.slice(0, 2).map(sportLabel).join(', ')}</span>
                                {selectedSports.length > 2 && (
                                    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                                        +{selectedSports.length - 2}
                                    </Badge>
                                )}
                            </>
                        )}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={t('Search sports…')} />
                    <CommandList className="max-h-64">
                        <CommandEmpty>{t('No results.')}</CommandEmpty>
                        <CommandGroup>
                            {sports.map((sport) => {
                                const sportId = String(sport.id);
                                const selected = value.includes(sportId);

                                return (
                                    <CommandItem
                                        key={sport.id}
                                        value={sportLabel(sport)}
                                        onSelect={() => toggleSport(sportId)}
                                    >
                                        <CheckIcon className={cn('mr-2 size-4', selected ? 'opacity-100' : 'opacity-0')} />
                                        <span className="truncate">{sportLabel(sport)}</span>
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
