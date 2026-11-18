import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Diff = Record<string, unknown>;

const isRecord = (value: unknown): value is Diff =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

function label(key: string): string {
    const text = key.replaceAll('_', ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function format(value: unknown, t: (key: string) => string): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? t('Yes') : t('No');
    }

    if (Array.isArray(value)) {
        return value.length === 0 ? '—' : value.map(String).join(', ');
    }

    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * Readable table for an audit diff, with a switch to the raw JSON.
 * Handles { old, new } updates and flat attribute snapshots.
 */
export function DiffView({ diff }: { diff: Diff | null }) {
    const { t } = useTranslation();
    const [raw, setRaw] = useState(false);

    if (!diff || Object.keys(diff).length === 0) {
        return <p className="text-muted-foreground">{t('No details')}</p>;
    }

    const isUpdate = isRecord(diff.old) && isRecord(diff.new);
    const rows: [string, unknown, unknown][] = isUpdate
        ? Object.keys({ ...(diff.old as Diff), ...(diff.new as Diff) }).map(
              (key) => [key, (diff.old as Diff)[key], (diff.new as Diff)[key]],
          )
        : Object.entries(diff).map(([key, value]) => [key, undefined, value]);

    return (
        <div className="space-y-2">
            <div className="inline-flex rounded-md border bg-background p-0.5">
                {[
                    [false, t('Readable')],
                    [true, t('Raw JSON')],
                ].map(([value, text]) => (
                    <button
                        key={String(value)}
                        type="button"
                        onClick={() => setRaw(value as boolean)}
                        className={cn(
                            'rounded px-2 py-0.5 text-xs',
                            raw === value
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {text as string}
                    </button>
                ))}
            </div>

            {raw ? (
                <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 break-words whitespace-pre-wrap">
                    {JSON.stringify(diff, null, 2)}
                </pre>
            ) : (
                <div className="max-h-64 overflow-auto rounded-md border bg-background">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                                <th className="px-2 py-1 font-medium">
                                    {t('Field')}
                                </th>
                                {isUpdate && (
                                    <th className="px-2 py-1 font-medium">
                                        {t('Before')}
                                    </th>
                                )}
                                <th className="px-2 py-1 font-medium">
                                    {isUpdate ? t('After') : t('Value')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(([key, before, after]) => (
                                <tr key={key} className="border-t align-top">
                                    <td className="px-2 py-1 font-medium">
                                        {label(key)}
                                    </td>
                                    {isUpdate && (
                                        <td className="px-2 py-1 break-words text-muted-foreground line-through decoration-muted-foreground/40">
                                            {format(before, t)}
                                        </td>
                                    )}
                                    <td className="px-2 py-1 break-words">
                                        {format(after, t)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
