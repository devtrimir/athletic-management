import {
    addMonths,
    format,
    isValid,
    parseISO,
    setMonth,
    setYear,
} from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Props = {
    value: string; // yyyy-MM-dd or empty string
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string;
    maxDate?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
};

function parseDateValue(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return undefined;
    }

    const parsed = parseISO(value);

    return isValid(parsed) ? parsed : undefined;
}

function strictParseTypedDate(value: string): Date | undefined {
    const trimmed = value.trim();

    // Accept only fully-formed dates; partial input must never parse.
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    const dmySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);
    // Bare 8 digits: ddmmyyyy (placeholder format dd/mm/yyyy).
    const dmyCompact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);

    const parts = iso ?? dmySlash ?? dmyDash ?? dmyCompact;

    if (!parts) {
        return undefined;
    }

    const [, first, second, third] = parts;
    const [year, month, day] = iso
        ? [Number(first), Number(second), Number(third)]
        : [Number(third), Number(second), Number(first)];

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return undefined;
    }

    const parsed = new Date(year, month - 1, day);

    // Reject overflows like 31/02/2026 rolling into March.
    return parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
        ? parsed
        : undefined;
}

function displayDateValue(value: string): string {
    const parsed = parseDateValue(value);

    if (parsed) {
        return format(parsed, 'dd/MM/yyyy');
    }

    return value;
}

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index),
    label: format(new Date(2026, index, 1), 'MMM'),
}));

const yearOptions = Array.from({ length: 101 }, (_, index) =>
    String(1950 + index),
);

function maskTypedDate(value: string): string {
    // Pasted ISO dates pass through untouched.
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) {
        return value.trim();
    }

    // Digits-only input: auto-insert the dd/mm/yyyy separators.
    if (/^\d+$/.test(value)) {
        const digits = value.slice(0, 8);

        if (digits.length <= 2) {
            return digits;
        }

        if (digits.length <= 4) {
            return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        }

        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    // Input already contains separators (e.g. editing an existing date):
    // keep the user's cursor-level edit, only strip invalid characters.
    return value.replace(/[^\d/-]/g, '').slice(0, 10);
}

export function DatePicker({
    value,
    onChange,
    placeholder,
    id,
    className,
    disabled,
    minDate,
    maxDate,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState<string | null>(null);
    const [displayMonth, setDisplayMonth] = React.useState(
        parseDateValue(value) ?? new Date(),
    );

    const selected = parseDateValue(value);
    const min = minDate ? parseDateValue(minDate) : undefined;
    const max = maxDate ? parseDateValue(maxDate) : undefined;
    const disabledDays = [
        ...(min ? [{ before: min }] : []),
        ...(max ? [{ after: max }] : []),
    ];

    function handleSelect(day: Date | undefined) {
        onChange(day ? format(day, 'yyyy-MM-dd') : '');
        setDraft(null);
        setOpen(false);
    }

    function commitParsed(parsed: Date) {
        if (min && parsed < min) {
            onChange(minDate ?? '');

            return;
        }

        if (max && parsed > max) {
            onChange(maxDate ?? '');

            return;
        }

        onChange(format(parsed, 'yyyy-MM-dd'));
    }

    function handleBlur() {
        const text = draft;
        setDraft(null);

        if (text === null) {
            return;
        }

        if (!text.trim()) {
            onChange('');

            return;
        }

        const parsed = strictParseTypedDate(text);

        // Invalid input: revert to the last committed value rather than
        // storing garbage; server-side validation flags bad dates on submit.
        if (parsed) {
            commitParsed(parsed);
        }
    }

    function clearDate() {
        setDraft(null);
        onChange('');
        setOpen(false);
    }

    function changeMonth(month: string) {
        setDisplayMonth((current) => setMonth(current, Number(month)));
    }

    function changeYear(year: string) {
        setDisplayMonth((current) => setYear(current, Number(year)));
    }

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);

        if (nextOpen && selected) {
            setDisplayMonth(selected);
        }
    }

    return (
        <div className={cn('flex w-full items-center gap-1.5', className)}>
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                value={draft ?? displayDateValue(value)}
                disabled={disabled}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                placeholder={placeholder ?? 'dd/mm/yyyy'}
                onChange={(event) => {
                    const nextValue = maskTypedDate(event.target.value);
                    setDraft(nextValue);

                    if (!nextValue.trim()) {
                        onChange('');

                        return;
                    }

                    // Only fully-formed dates commit; partial input stays
                    // local so the user can keep typing.
                    const parsed = strictParseTypedDate(nextValue);

                    if (parsed) {
                        commitParsed(parsed);
                    }
                }}
                onBlur={handleBlur}
                className="h-9 min-w-0 flex-1"
            />
            {value && !disabled && (
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={clearDate}
                    aria-label={t('Clear date')}
                >
                    <X className="size-4" />
                </Button>
            )}
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className="size-9 shrink-0 px-0"
                        aria-label={placeholder ?? t('Pick a date')}
                    >
                        <CalendarIcon className="size-4 opacity-70" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[296px] max-w-[calc(100vw-1rem)] p-0"
                    align="end"
                >
                    <div className="flex items-center gap-2 border-b p-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() =>
                                setDisplayMonth((current) =>
                                    addMonths(current, -1),
                                )
                            }
                            aria-label={t('Previous month')}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Select
                            value={String(displayMonth.getMonth())}
                            onValueChange={changeMonth}
                        >
                            <SelectTrigger className="h-8 min-w-0 flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((month) => (
                                    <SelectItem
                                        key={month.value}
                                        value={month.value}
                                    >
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(displayMonth.getFullYear())}
                            onValueChange={changeYear}
                        >
                            <SelectTrigger className="h-8 w-24 shrink-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() =>
                                setDisplayMonth((current) =>
                                    addMonths(current, 1),
                                )
                            }
                            aria-label={t('Next month')}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={handleSelect}
                        month={displayMonth}
                        onMonthChange={setDisplayMonth}
                        startMonth={new Date(1950, 0, 1)}
                        endMonth={new Date(2050, 11, 31)}
                        disabled={disabledDays}
                        hideNavigation
                        className="p-2"
                        classNames={{
                            month_caption: 'hidden',
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
