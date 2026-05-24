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
import CoachSearchController from '@/actions/App/Http/Controllers/Api/V1/CoachSearchController';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type CoachOption = {
    id: number;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    nis_certified: boolean;
};

type SearchResponse = {
    data: CoachOption[];
    meta: { q: string; count: number };
};

interface CoachPickerProps {
    value: CoachOption | null;
    onChange: (coach: CoachOption | null) => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
}

export function CoachPicker({ value, onChange, placeholder, disabled = false, id }: CoachPickerProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CoachOption[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const { get, cancel, processing } = useHttp<Record<string, never>, SearchResponse>({});

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
                get(CoachSearchController.url({ query: { q } }), {
                    onSuccess: (res) => {
                        const response = res as unknown as SearchResponse;
                        setResults(response?.data ?? []);
                    },
                    onError: () => setResults([]),
                });
            }, 300);
        },
        [cancel, get],
    );

    const displayValue = (coach: CoachOption | null) => {
        if (!coach) {
            return '';
        }

        return coach.pno ? `${coach.full_name_hi} · ${coach.pno}` : coach.full_name_hi;
    };

    return (
        <Combobox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ComboboxInput
                    id={id}
                    className={cn(
                        'border-input placeholder:text-muted-foreground flex h-9 w-full rounded-md border bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none',
                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                        'md:text-sm',
                    )}
                    displayValue={displayValue}
                    onChange={handleInputChange}
                    placeholder={placeholder ?? t('Search coach…')}
                    autoComplete="off"
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDown className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                </ComboboxButton>

                <ComboboxOptions className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md outline-none">
                    {processing && (
                        <div className="space-y-1 p-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-3/4" />
                        </div>
                    )}

                    {!processing && query.trim().length > 0 && results.length === 0 && (
                        <p className="text-muted-foreground px-3 py-2 text-sm">{t('No coach found.')}</p>
                    )}

                    {!processing &&
                        results.map((coach) => (
                            <ComboboxOption
                                key={coach.id}
                                value={coach}
                                className={({ focus }) =>
                                    cn(
                                        'relative cursor-pointer select-none px-3 py-2 text-sm',
                                        focus ? 'bg-accent text-accent-foreground' : '',
                                    )
                                }
                            >
                                {({ selected }) => (
                                    <div className="flex items-start gap-2">
                                        <Check
                                            className={cn('mt-0.5 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{coach.full_name_hi}</span>
                                                {coach.pno && (
                                                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                                                        {coach.pno}
                                                    </span>
                                                )}
                                            </div>
                                            {coach.full_name_en && (
                                                <p className="text-muted-foreground truncate text-xs">{coach.full_name_en}</p>
                                            )}
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
