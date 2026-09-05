import { Download, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';

export type ConfidentialDocument = {
    preview_url: string;
    download_url: string;
    original_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
};

type ConfidentialDocumentPreviewProps = {
    document: ConfidentialDocument;
    title?: string | null;
    subtitle?: string | null;
    triggerLabel?: string;
    sizeLabel?: string | null;
};

function isImageDocument(mimeType: string | null): boolean {
    return mimeType?.startsWith('image/') ?? false;
}

export function ConfidentialDocumentPreview({
    document,
    title,
    subtitle,
    triggerLabel,
    sizeLabel,
}: ConfidentialDocumentPreviewProps) {
    const { t } = useTranslation();
    const documentName = document.original_name ?? title ?? t('Document');

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8">
                    <FileText className="mr-1.5 size-3.5" />
                    {triggerLabel ?? t('Preview')}
                </Button>
            </DialogTrigger>
            <DialogContent className="h-dvh max-h-dvh w-screen max-w-none sm:max-w-none !gap-0 overflow-hidden rounded-none !p-0">
                <DialogHeader className="border-b px-4 py-3 pr-12">
                    <DialogTitle className="truncate text-base">
                        {documentName}
                    </DialogTitle>
                    {subtitle || sizeLabel ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {subtitle ? <span>{subtitle}</span> : null}
                            {sizeLabel ? <span>{sizeLabel}</span> : null}
                        </div>
                    ) : null}
                </DialogHeader>
                <div className="min-h-0 flex-1 bg-muted/30">
                    {isImageDocument(document.mime_type) ? (
                        <div className="flex h-full items-center justify-center overflow-auto rounded-md bg-background p-3">
                            <img
                                src={document.preview_url}
                                alt={documentName}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    ) : (
                        <iframe
                            src={document.preview_url}
                            title={documentName}
                            className="h-full w-full rounded-md border bg-background"
                        />
                    )}
                </div>
                <div className="flex justify-end gap-2 border-t px-4 py-3">
                    <Button asChild variant="outline">
                        <a href={document.download_url}>
                            <Download className="mr-1.5 size-4" />
                            {t('Download')}
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
