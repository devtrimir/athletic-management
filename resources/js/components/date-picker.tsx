import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Props = {
    value: string; // yyyy-MM-dd or empty string
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
};

export function DatePicker({ value, onChange, placeholder, id, className, disabled }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);

    const selected = value ? parseISO(value) : undefined;
    const display = selected ? format(selected, 'dd/MM/yyyy') : null;

    function handleSelect(day: Date | undefined) {
        onChange(day ? format(day, 'yyyy-MM-dd') : '');
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'border-input h-9 w-full justify-start gap-2 px-3 font-normal',
                        !display && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className="size-4 shrink-0 opacity-50" />
                    {display ?? (placeholder ?? t('Pick a date'))}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                />
            </PopoverContent>
        </Popover>
    );
}
