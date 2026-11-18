import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades and lifts its children into place once `on` turns true, staggered by
 * `index`, using the iOS ease. Reduced-motion users get no movement.
 */
export function Reveal({
    on,
    index = 0,
    className,
    children,
}: {
    on: boolean;
    index?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'transition-[opacity,transform,filter] duration-700 ease-apple motion-reduce:transition-none',
                on
                    ? 'blur-0 translate-y-0 opacity-100'
                    : 'translate-y-3 opacity-0 blur-[4px]',
                className,
            )}
            style={{ transitionDelay: on ? `${120 + index * 70}ms` : '0ms' }}
        >
            {children}
        </div>
    );
}
