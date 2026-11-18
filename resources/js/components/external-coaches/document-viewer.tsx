import { Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { documentTypeLabel } from '@/lib/external-coach-documents';

export type CoachDocument = {
    id: number;
    type: string;
    original_name: string;
    mime_type?: string;
};

/**
 * Eye button that previews a document in a dialog (image or PDF) without
 * leaving the page. The file is only requested once the dialog opens, so each
 * view is recorded in the audit log.
 */
export function DocumentViewer({
    coachId,
    document,
}: {
    coachId: number;
    document: CoachDocument;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const url = `/external-coaches/${coachId}/documents/${document.id}`;
    const isImage = document.mime_type?.startsWith('image/') ?? false;
    const isPdf = document.mime_type === 'application/pdf';

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t('View')}
                onClick={() => setOpen(true)}
            >
                <Eye className="size-4" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="flex h-[88vh] flex-col gap-3 sm:max-w-5xl"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="pr-8">
                        <DialogTitle className="flex items-center justify-between gap-3 text-base">
                            <span className="truncate">
                                {documentTypeLabel(document.type, t)} ·{' '}
                                {document.original_name}
                            </span>
                            <Button asChild variant="outline" size="sm">
                                <a href={`${url}?download=1`}>
                                    <Download className="size-4" />
                                    {t('Download')}
                                </a>
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30">
                        {open && isImage && (
                            <img
                                src={url}
                                alt={document.original_name}
                                className="mx-auto max-h-full object-contain"
                            />
                        )}
                        {open && isPdf && (
                            <iframe
                                src={url}
                                title={document.original_name}
                                className="h-full w-full"
                            />
                        )}
                        {open && !isImage && !isPdf && (
                            <p className="p-6 text-sm text-muted-foreground">
                                {t('Preview is not available for this file.')}
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
