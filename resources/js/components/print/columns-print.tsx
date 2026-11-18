import { useState } from 'react';
import type { ReactNode } from 'react';
import { PrintSheet } from '@/components/print/print-sheet';
import type { PrintOrientation } from '@/components/print/print-sheet';
import { useTranslation } from '@/hooks/use-translation';

export type PrintColumn<T> = {
    key: string;
    label: string;
    cell: (row: T, t: (key: string) => string) => ReactNode;
    /** Hidden by default (can be ticked in the toolbar). */
    optional?: boolean;
};

/**
 * Standard print page for a listing: toggleable columns, orientation, S.No.
 * and an A4 table inside the shared PrintSheet.
 */
export function ColumnsPrint<T extends { id: number | string }>({
    title,
    printedAt,
    info = [],
    rows,
    columns,
    emptyText,
    defaultOrientation = 'landscape',
}: {
    title: string;
    printedAt: string;
    info?: (string | null)[];
    rows: T[];
    columns: PrintColumn<T>[];
    emptyText: string;
    defaultOrientation?: PrintOrientation;
}) {
    const { t } = useTranslation();
    const [orientation, setOrientation] =
        useState<PrintOrientation>(defaultOrientation);
    const [visible, setVisible] = useState<string[]>(
        columns.filter((column) => !column.optional).map((c) => c.key),
    );
    const shown = columns.filter((column) => visible.includes(column.key));

    function toggle(key: string) {
        setVisible((current) =>
            current.includes(key)
                ? current.length > 1
                    ? current.filter((item) => item !== key)
                    : current
                : [...current, key],
        );
    }

    return (
        <PrintSheet
            title={title}
            printedAt={printedAt}
            info={[
                `${t('Total')}: ${rows.length}`,
                ...info.filter((line): line is string => line !== null),
            ]}
            orientation={orientation}
            onOrientationChange={setOrientation}
            controls={
                <div className="print-control-card">
                    <span className="print-label">{t('Columns')}:</span>
                    {columns.map((column) => (
                        <label key={column.key} className="print-option">
                            <input
                                type="checkbox"
                                checked={visible.includes(column.key)}
                                onChange={() => toggle(column.key)}
                            />
                            <span>{t(column.label)}</span>
                        </label>
                    ))}
                </div>
            }
        >
            {rows.length === 0 ? (
                <div className="print-empty">{emptyText}</div>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>{t('S.No.')}</th>
                            {shown.map((column) => (
                                <th key={column.key}>{t(column.label)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td>{index + 1}</td>
                                {shown.map((column) => (
                                    <td key={column.key}>
                                        {column.cell(row, t)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </PrintSheet>
    );
}
