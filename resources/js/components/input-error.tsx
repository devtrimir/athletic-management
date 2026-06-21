import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p
            {...props}
            aria-live="polite"
            className={cn('text-sm text-red-600 dark:text-red-400', className)}
        >
            {message}
        </p>
    );
}
