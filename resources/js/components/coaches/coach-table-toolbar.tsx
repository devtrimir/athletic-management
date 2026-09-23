import type { Column, RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { CoachTableFeatures } from '@/components/coaches/coach-table-features';

type AnyColumn<TData extends RowData> = Column<CoachTableFeatures, TData, any>;

export function SortableHeaderLabel<TData extends RowData>({
    label,
    column,
}: {
    label: string;
    column: AnyColumn<TData>;
}) {
    if (!column.getCanSort()) {
        return <>{label}</>;
    }

    const sorted = column.getIsSorted();

    return (
        <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 hover:text-foreground"
        >
            {label}
            {sorted === 'asc' ? (
                <ArrowUp className="size-3" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="size-3" />
            ) : (
                <ArrowUpDown className="size-3 opacity-40" />
            )}
        </button>
    );
}
