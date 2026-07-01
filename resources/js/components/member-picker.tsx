import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import { useHttp } from '@inertiajs/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import MemberSearchController from '@/actions/App/Http/Controllers/Api/V1/MemberSearchController';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type MemberOption = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name: string;
    player_category: string;
    player_level: string;
    current_status: string;
    active_team?: {
        id: number | null;
        name: string | null;
        role: string | null;
        joined_on: string | null;
    } | null;
};

type SearchResponse = {
    data: MemberOption[];
    meta: { q: string; count: number };
};

interface MemberPickerProps {
    value: MemberOption | null;
    onChange: (member: MemberOption | null) => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    extraFilters?: Record<string, string>;
}

export function MemberPicker({
    value,
    onChange,
    placeholder,
    disabled = false,
    id,
    extraFilters = {},
}: MemberPickerProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MemberOption[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );
    const { get, cancel, processing } = useHttp<
        Record<string, never>,
        SearchResponse
    >({});

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const q = e.target.value;
            setQuery(q);
            clearTimeout(timerRef.current);

            if (q.trim().length === 0) {
                cancel();
                setResults([]);

                return;
            }

            timerRef.current = setTimeout(() => {
                cancel();
                get(
                    MemberSearchController.url({
                        query: { q, ...extraFilters },
                    }),
                    {
                        onSuccess: (res) => {
                            const response = res as unknown as SearchResponse;
                            setResults(response?.data ?? []);
                        },
                        onError: () => setResults([]),
                    },
                );
            }, 300);
        },
        [cancel, get, extraFilters],
    );

    const displayValue = (member: MemberOption | null) => {
        if (!member) {
            return '';
        }

        return member.pno
            ? `${member.full_name} · ${member.pno}`
            : member.full_name;
    };

    const statusTone = (status: string): string =>
        status === 'ACTIVE'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300';

    return (
        <Combobox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ComboboxInput
                    id={id}
                    className={cn(
                        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground',
                        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                        'md:text-sm',
                    )}
                    displayValue={displayValue}
                    onChange={handleInputChange}
                    placeholder={placeholder ?? t('Search athlete…')}
                    autoComplete="off"
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDown
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                    />
                </ComboboxButton>

                <ComboboxOptions className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                    {processing && (
                        <div className="space-y-1 p-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-3/4" />
                        </div>
                    )}

                    {!processing &&
                        query.trim().length > 0 &&
                        results.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                {t('No athlete found.')}
                            </p>
                        )}

                    {!processing &&
                        results.map((member) => (
                            <ComboboxOption
                                key={member.id}
                                value={member}
                                className={({ focus }) =>
                                    cn(
                                        'relative cursor-pointer px-3 py-2 text-sm select-none',
                                        focus
                                            ? 'bg-accent text-accent-foreground'
                                            : '',
                                    )
                                }
                            >
                                {({ selected }) => (
                                    <div className="flex items-start gap-2">
                                        <Check
                                            className={cn(
                                                'mt-0.5 h-4 w-4 shrink-0',
                                                selected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {member.full_name}
                                                </span>
                                                {member.pno && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                                                        {member.pno}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <span
                                                    className={cn(
                                                        'rounded-full border px-2 py-0.5 text-[11px] leading-none font-medium',
                                                        statusTone(
                                                            member.current_status,
                                                        ),
                                                    )}
                                                >
                                                    {t(member.current_status)}
                                                </span>
                                                <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] leading-none font-medium text-muted-foreground">
                                                    {member.active_team?.name
                                                        ? `${t('Team')}: ${member.active_team.name}`
                                                        : t('No active team')}
                                                </span>
                                                {member.active_team?.role ? (
                                                    <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] leading-none font-medium text-muted-foreground">
                                                        {t(
                                                            member.active_team
                                                                .role,
                                                        )}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ComboboxOption>
                        ))}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
}
