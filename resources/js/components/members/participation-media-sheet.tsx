import { Camera, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { store as storeMedia, destroy as destroyMedia } from '@/actions/App/Http/Controllers/MediaFileController';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTranslation } from '@/hooks/use-translation';
import { Lightbox } from './media-lightbox';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaFile = {
    id: number;
    url: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    caption_hi: string | null;
    uploaded_by: { id: number; name: string };
    created_at: string;
};

type Props = {
    participationId: number;
    memberName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canUpload: boolean;
    canDelete: boolean;
    initialMedia?: MediaFile[];
};

// ---------------------------------------------------------------------------
// Upload Dropzone
// ---------------------------------------------------------------------------

function UploadDropzone({
    participationId,
    onUploaded,
}: {
    participationId: number;
    onUploaded: (file: MediaFile) => void;
}) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function uploadFile(file: File) {
        const MAX_BYTES = 10 * 1024 * 1024;
        const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

        if (!ALLOWED.includes(file.type)) {
            setError(t('Only JPEG, PNG, and WebP images are allowed.'));

            return;
        }

        if (file.size > MAX_BYTES) {
            setError(t('File must be under 10 MB.'));

            return;
        }

        setError(null);
        setUploading(true);

        const fd = new FormData();
        fd.append('file', file);

        try {
            const res = await fetch(storeMedia.url(participationId), {
                method: 'POST',
                body: fd,
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });

            if (res.ok) {
                const data: MediaFile = await res.json();
                onUploaded(data);
            } else {
                const body = await res.json().catch(() => ({}));
                setError((body as { message?: string }).message ?? t('Upload failed.'));
            }
        } catch {
            setError(t('Upload failed.'));
        } finally {
            setUploading(false);
        }
    }

    function handleFiles(files: FileList | null) {
        if (!files) {
return;
}

        for (const file of files) {
            void uploadFile(file);
        }
    }

    return (
        <div className="space-y-2">
            <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={(e) => {
 e.preventDefault(); setDragOver(true);
}}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
 e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files);
}}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors cursor-pointer select-none ${dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-muted-foreground/50 hover:bg-muted/30'}`}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm text-muted-foreground">{t('Uploading…')}</span>
                    </div>
                ) : (
                    <>
                        <Upload className="size-6 text-muted-foreground" />
                        <div className="text-center">
                            <p className="text-sm font-medium">{t('Drop photos here or click to browse')}</p>
                            <p className="text-xs text-muted-foreground">{t('JPEG, PNG, WebP — max 10 MB')}</p>
                        </div>
                    </>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
            />

            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Participation Media Sheet
// ---------------------------------------------------------------------------

export function ParticipationMediaSheet({
    participationId,
    memberName,
    open,
    onOpenChange,
    canUpload,
    canDelete,
    initialMedia = [],
}: Props) {
    const { t } = useTranslation();
    const [media, setMedia] = useState<MediaFile[]>(initialMedia);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    function handleUploaded(file: MediaFile) {
        setMedia((prev) => [...prev, file]);
    }

    async function handleDelete(mediaFileId: number) {
        setDeleting(mediaFileId);

        try {
            const res = await fetch(destroyMedia.url({ participation: participationId, mediaFile: mediaFileId }), {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });

            if (res.ok || res.status === 204) {
                setMedia((prev) => prev.filter((f) => f.id !== mediaFileId));
            }
        } finally {
            setDeleting(null);
        }
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Camera className="size-4" />
                            {t('Photos')}
                        </SheetTitle>
                        <SheetDescription>{memberName}</SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {canUpload && (
                            <UploadDropzone
                                participationId={participationId}
                                onUploaded={handleUploaded}
                            />
                        )}

                        {media.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-center">
                                <Camera className="size-10 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">{t('No photos yet.')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {media.map((file, idx) => (
                                    <div key={file.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                                        <img
                                            src={file.url}
                                            alt={file.caption_hi ?? file.original_name}
                                            className="size-full cursor-pointer object-cover transition-opacity group-hover:opacity-80"
                                            onClick={() => setLightboxIdx(idx)}
                                        />
                                        {canDelete && (
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                disabled={deleting === file.id}
                                                onClick={() => void handleDelete(file.id)}
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        )}
                                        {file.caption_hi && (
                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                                                <p className="text-[10px] text-white truncate">{file.caption_hi}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {lightboxIdx !== null && (
                <Lightbox
                    files={media}
                    index={lightboxIdx}
                    onClose={() => setLightboxIdx(null)}
                />
            )}
        </>
    );
}
