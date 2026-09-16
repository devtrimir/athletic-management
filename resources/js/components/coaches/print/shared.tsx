import React from 'react';
import { hasValue } from './helpers';

export function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="break-inside-avoid rounded-lg border bg-white p-3 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase print:mb-1 print:text-[10px] print:text-black">
                {title}
            </h2>
            {children}
        </section>
    );
}

export function DetailsTable({
    rows,
}: {
    rows: { label: string; value: React.ReactNode }[];
}) {
    const visibleRows = rows.filter((row) => hasValue(row.value));

    if (visibleRows.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-md border print:rounded-sm">
            <table className="w-full border-collapse text-xs">
                <tbody className="print:text-[10px]">
                    {visibleRows.map((row) => (
                        <tr
                            key={row.label}
                            className="border-t first:border-t-0"
                        >
                            <th className="w-1/3 border bg-muted/30 p-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase print:py-0.5 print:text-[9px]">
                                {row.label}
                            </th>
                            <td className="border p-1.5 text-foreground print:py-0.5">
                                {row.value}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DetailStack({
    items,
}: {
    items: { label: string; value: React.ReactNode; muted?: boolean }[];
}) {
    const visibleItems = items.filter((item) => hasValue(item.value));

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <table className="w-full border-collapse overflow-hidden rounded-sm border border-border/70 bg-background text-xs leading-4 print:text-[9px]">
            <tbody>
                {visibleItems.map((item) => (
                    <tr key={item.label} className="border-b last:border-b-0">
                        <th className="w-36 border border-r bg-muted/30 px-1.5 py-1 text-left align-middle font-medium text-muted-foreground print:w-28 print:px-1.5 print:py-0.5">
                            {item.label}
                        </th>
                        <td
                            className={
                                item.muted
                                    ? 'border px-1.5 py-1 align-middle break-words text-muted-foreground print:px-1.5 print:py-0.5'
                                    : 'border px-1.5 py-1 align-middle break-words text-foreground print:px-1.5 print:py-0.5'
                            }
                        >
                            {item.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
