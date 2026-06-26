import {
    addMonths,
    format,
    isValid,
    parse,
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
    if (!value) {
        return undefined;
    }

    const parsed = parseISO(value);

    if (isValid(parsed)) {
        return parsed;
    }

    const fallback = new Date(value);

    return isValid(fallback) ? fallback : undefined;
}

function normalizeTypedDate(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy'];

    for (const dateFormat of formats) {
        const parsed = parse(trimmed, dateFormat, new Date());

        if (isValid(parsed)) {
            return format(parsed, 'yyyy-MM-dd');
        }
    }

    return trimmed;
}

function isCanonicalDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
        setOpen(false);
    }

    function handleBlur() {
        const normalized = normalizeTypedDate(value);
        const parsed = parseDateValue(normalized);

        if (parsed && min && parsed < min) {
            onChange(minDate ?? '');

            return;
        }

        if (parsed && max && parsed > max) {
            onChange(maxDate ?? '');

            return;
        }

        onChange(normalized);
    }

    function clearDate() {
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
                value={displayDateValue(value)}
                disabled={disabled}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                placeholder={placeholder ?? 'dd/mm/yyyy'}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    const normalized = normalizeTypedDate(nextValue);

                    onChange(isCanonicalDate(normalized) ? normalized : nextValue);
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
                <PopoverContent className="w-[296px] p-0" align="end">
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
