import { useHttp } from '@inertiajs/react';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import MemberSearchController from '@/actions/App/Http/Controllers/Api/V1/MemberSearchController';
import type { MemberOption } from '@/components/member-picker';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type SearchResponse = {
    data: MemberOption[];
};

type Props = {
    value: MemberOption[];
    onValueChange: (value: MemberOption[]) => void;
    className?: string;
};

export function MembersMultiSelect({ value, onValueChange, className }: Props) {
    const { t } = useTranslation();
    const [results, setResults] = useState<MemberOption[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const { get, cancel, processing } = useHttp<
        Record<string, never>,
        SearchResponse
    >({});

    function handleSearch(query: string) {
        clearTimeout(timerRef.current);

        if (query.trim() === '') {
            cancel();
            setResults([]);

            return;
        }

        timerRef.current = setTimeout(() => {
            cancel();
            get(MemberSearchController.url({ query: { q: query } }), {
                onSuccess: (response) => {
                    setResults(
                        (response as unknown as SearchResponse).data ?? [],
                    );
                },
                onError: () => {
                    setResults([]);
                },
            });
        }, 250);
    }

    function toggle(member: MemberOption) {
        onValueChange(
            value.some((selected) => selected.id === member.id)
                ? value.filter((selected) => selected.id !== member.id)
                : [...value, member],
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
                        value.length === 0 && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-1.5">
                        {value.length === 0 ? (
                            <span className="truncate">
                                {t('Select members')}
                            </span>
                        ) : (
                            <>
                                <span className="truncate">
                                    {value
                                        .slice(0, 2)
                                        .map((member) => member.full_name)
                                        .join(', ')}
                                </span>
                                {value.length > 2 && (
                                    <Badge
                                        variant="secondary"
                                        className="shrink-0 px-1.5 py-0 text-[10px]"
                                    >
                                        +{value.length - 2}
                                    </Badge>
                                )}
                            </>
                        )}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder={t('Search by name or PNO…')}
                        onValueChange={handleSearch}
                    />
                    <CommandList className="max-h-72">
                        {value.length > 0 && (
                            <div className="flex flex-wrap gap-1 border-b p-2">
                                {value.map((member) => (
                                    <Badge
                                        key={member.id}
                                        variant="secondary"
                                        className="gap-1 pr-1"
                                    >
                                        <span className="max-w-36 truncate">
                                            {member.full_name}
                                        </span>
                                        <button
                                            type="button"
                                            className="rounded-sm p-0.5 hover:bg-muted"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                toggle(member);
                                            }}
                                        >
                                            <XIcon className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {processing && (
                            <div className="space-y-1 p-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        )}

                        {!processing && results.length === 0 && (
                            <CommandEmpty>{t('No results.')}</CommandEmpty>
                        )}

                        <CommandGroup>
                            {results.map((member) => {
                                const selected = value.some(
                                    (item) => item.id === member.id,
                                );

                                return (
                                    <CommandItem
                                        key={member.id}
                                        value={`${member.full_name} ${member.pno ?? ''}`}
                                        onSelect={() => toggle(member)}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                'mr-2 size-4',
                                                selected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">
                                                {member.full_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {[
                                                    member.pno,
                                                    member.member_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' / ')}
                                            </div>
                                        </div>
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
