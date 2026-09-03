import { router, useForm } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Check, Download, FileWarning, Minus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import MemberImportController from '@/actions/App/Http/Controllers/MemberImportController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { errors as importErrorsUrl } from '@/routes/imports';

type RowResult = 'created' | 'updated' | 'skipped' | 'failed';

type ImportRow = {
    row: number;
    pno: string | null;
    name: string;
    result: RowResult;
    errors: string[];
};

type RowEvent = {
    import_id: number;
    row: number;
    pno: string | null;
    name: string;
    result: RowResult;
    errors: string[];
    processed: number;
};

type FinishedEvent = {
    import_id: number;
    filename: string;
    status: string;
    uploaded_by: number;
    counts: {
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    };
    error_count: number;
    template_error: string | null;
};

type ImportSession = {
    importId: number;
    filename: string;
    rows: ImportRow[];
    status: 'importing' | 'finished';
    result: FinishedEvent | null;
};

function resultIcon(result: RowResult, errors: string[]) {
    switch (result) {
        case 'created':
        case 'updated':
            return (
                <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            );
        case 'skipped':
            return (
                <Minus
                    className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-label="Skipped"
                />
            );
        case 'failed':
            return (
                <X
                    className="size-4 shrink-0 text-red-600 dark:text-red-400"
                    aria-label={errors.join(' · ')}
                />
            );
    }
}

/**
 * Member import dialog with row-wise live sync. Uploading starts a background
 * job whose per-row outcomes stream back over Reverb (MemberImportRowProcessed)
 * and tick off rows in this dialog; MemberImportFinished ends the session with
 * a summary. Events are correlated to the dialog by the import_id flashed by
 * the store redirect — other users' imports keep the global toast behavior.
 */
export function MemberImportDialog({
    open,
    onOpenChange,
    organizationId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: number;
}) {
    const { t } = useTranslation();
    const importForm = useForm<{ file: File | null }>({ file: null });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [session, setSession] = useState<ImportSession | null>(null);
    const sessionRef = useRef<ImportSession | null>(null);
    const openRef = useRef(open);

    useEffect(() => {
        sessionRef.current = session;
        openRef.current = open;
    }, [session, open]);

    useEcho<RowEvent>(
        `organization.${organizationId}`,
        'MemberImportRowProcessed',
        (event) => {
            setSession((prev) => {
                if (
                    !prev ||
                    prev.importId !== event.import_id ||
                    prev.status !== 'importing' ||
                    prev.rows.some((row) => row.row === event.row)
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    rows: [
                        ...prev.rows,
                        {
                            row: event.row,
                            pno: event.pno,
                            name: event.name,
                            result: event.result,
                            errors: event.errors,
                        },
                    ],
                };
            });
        },
        [organizationId],
    );

    useEcho<FinishedEvent>(
        `organization.${organizationId}`,
        'MemberImportFinished',
        (event) => {
            const active = sessionRef.current;
            const isActiveImport = active?.importId === event.import_id;

            if (isActiveImport) {
                setSession({ ...active, status: 'finished', result: event });
                router.reload({ only: ['members', 'totalCount'] });

                if (!openRef.current) {
                    toast.success(
                        t('Import of :file finished.').replace(
                            ':file',
                            event.filename,
                        ),
                    );
                }

                return;
            }

            const total =
                event.counts.created +
                event.counts.updated +
                event.counts.skipped +
                event.counts.failed;
            const errorReportAction = {
                label: t('Download error report'),
                onClick: () => {
                    window.location.href = importErrorsUrl.url({
                        import: event.import_id,
                    });
                },
            };

            if (event.template_error !== null || event.status === 'FAILED') {
                toast.error(
                    event.template_error ??
                        t(
                            'Import failed. Download the error report for details.',
                        ),
                    event.error_count > 0
                        ? { action: errorReportAction }
                        : undefined,
                );
            } else if (total === 0) {
                toast.warning(
                    t(
                        'No data rows found in the uploaded file. Fill the Members sheet (starting at row 2) and re-upload.',
                    ),
                );
            } else {
                const message = t(
                    'Import finished: :created created, :updated updated, :skipped skipped, :failed failed.',
                )
                    .replace(':created', String(event.counts.created))
                    .replace(':updated', String(event.counts.updated))
                    .replace(':skipped', String(event.counts.skipped))
                    .replace(':failed', String(event.counts.failed));

                if (event.counts.failed > 0) {
                    toast.warning(message, { action: errorReportAction });
                } else {
                    toast.success(message);
                }
            }

            router.reload({ only: ['members', 'totalCount'] });
        },
        [organizationId],
    );

    // Keep the row list pinned to the latest row as events stream in.
    useEffect(() => {
        const list = listRef.current;

        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [session?.rows.length]);

    function resetSession() {
        setSession(null);
        importForm.setData('file', null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function submit() {
        importForm.post(MemberImportController.store.url(), {
            forceFormData: true,
            onSuccess: (page) => {
                const importId = page.props.flash?.import_id;

                if (typeof importId !== 'number') {
                    return;
                }

                setSession({
                    importId,
                    filename: importForm.data.file?.name ?? '',
                    rows: [],
                    status: 'importing',
                    result: null,
                });
                importForm.setData('file', null);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    }

    const counts = session?.result?.counts;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && session?.status === 'importing') {
                    // Closing mid-import only hides the dialog — the session
                    // keeps streaming and reopens where it left off.
                    onOpenChange(false);

                    return;
                }

                if (!next) {
                    resetSession();
                }

                onOpenChange(next);
            }}
        >
            <DialogContent className="max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        {session
                            ? t('Import members — :file').replace(
                                  ':file',
                                  session.filename,
                              )
                            : t('Import members')}
                    </DialogTitle>
                </DialogHeader>

                {!session && (
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                            <li>
                                {t(
                                    'Download the sample template and fill in member data. Do not rename, reorder, or delete columns.',
                                )}
                            </li>
                            <li>
                                {t(
                                    'Upload the filled file. Each row is imported in the background and ticked off here as it completes.',
                                )}
                            </li>
                        </ol>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                window.location.href =
                                    MemberImportController.template.url();
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download sample template')}
                        </Button>

                        <div className="space-y-2">
                            <Label htmlFor="member-import-file">
                                {t('Filled template file')}
                            </Label>
                            <Input
                                id="member-import-file"
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(event) =>
                                    importForm.setData(
                                        'file',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            {importForm.errors.file && (
                                <p className="text-sm text-destructive">
                                    {importForm.errors.file}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {session && (
                    <div className="space-y-3">
                        {session.status === 'importing' && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner className="size-4" />
                                {t(':n rows processed').replace(
                                    ':n',
                                    String(session.rows.length),
                                )}
                            </div>
                        )}

                        {session.status === 'finished' && session.result && (
                            <div className="space-y-2">
                                {session.result.template_error !== null ||
                                session.result.status === 'FAILED' ? (
                                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        <FileWarning className="mt-0.5 size-4 shrink-0" />
                                        <span>
                                            {session.result.template_error ??
                                                t(
                                                    'Import failed. Download the error report for details.',
                                                )}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span>
                                            {t('Created')}:{' '}
                                            <span className="font-semibold">
                                                {counts?.created ?? 0}
                                            </span>
                                        </span>
                                        <span>
                                            {t('Updated')}:{' '}
                                            <span className="font-semibold">
                                                {counts?.updated ?? 0}
                                            </span>
                                        </span>
                                        <span>
                                            {t('Skipped')}:{' '}
                                            <span className="font-semibold">
                                                {counts?.skipped ?? 0}
                                            </span>
                                        </span>
                                        <span>
                                            {t('Failed')}:{' '}
                                            <span className="font-semibold text-red-600 dark:text-red-400">
                                                {counts?.failed ?? 0}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div
                            ref={listRef}
                            className="max-h-72 min-h-16 space-y-1 overflow-y-auto rounded-md border p-2"
                        >
                            {session.rows.length === 0 ? (
                                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                                    {t('Reading the file…')}
                                </p>
                            ) : (
                                session.rows.map((row) => (
                                    <div
                                        key={row.row}
                                        className="flex items-center gap-2 rounded px-2 py-1 text-sm"
                                        title={
                                            row.errors.length > 0
                                                ? row.errors.join(' · ')
                                                : undefined
                                        }
                                    >
                                        {resultIcon(row.result, row.errors)}
                                        <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                            {row.row}
                                        </span>
                                        <span className="w-24 shrink-0 truncate font-mono text-xs">
                                            {row.pno ?? '—'}
                                        </span>
                                        <span className="truncate">
                                            {row.name}
                                        </span>
                                        {row.result === 'failed' &&
                                            row.errors.length > 0 && (
                                                <span className="shrink-0 truncate text-xs text-red-600 dark:text-red-400">
                                                    {row.errors[0]}
                                                </span>
                                            )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!session && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                {t('Close')}
                            </Button>
                            <Button
                                disabled={
                                    importForm.data.file === null ||
                                    importForm.processing
                                }
                                onClick={submit}
                            >
                                <Upload className="mr-1.5 h-4 w-4" />
                                {importForm.processing
                                    ? t('Importing…')
                                    : t('Upload and import')}
                            </Button>
                        </>
                    )}

                    {session?.status === 'importing' && (
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Run in background')}
                        </Button>
                    )}

                    {session?.status === 'finished' && (
                        <>
                            {(session.result?.error_count ?? 0) > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        window.location.href =
                                            importErrorsUrl.url({
                                                import: session.importId,
                                            });
                                    }}
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Download error report')}
                                </Button>
                            )}
                            <Button onClick={() => onOpenChange(false)}>
                                {t('Done')}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
