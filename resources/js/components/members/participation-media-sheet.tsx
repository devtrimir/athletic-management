import { Camera, CheckCircle2, Images, Loader2, Plus, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { destroy as destroyMedia, index as indexMedia, store as storeMedia } from '@/actions/App/Http/Controllers/MediaFileController';
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
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCsrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

// ---------------------------------------------------------------------------
// Upload Queue
// ---------------------------------------------------------------------------

type UploadItem = {
    localId: string;
    file: File;
    progress: number;
    status: 'uploading' | 'done' | 'error';
    error?: string;
};

function UploadQueue({
    participationId,
    onUploaded,
}: {
    participationId: number;
    onUploaded: (file: MediaFile) => void;
}) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<UploadItem[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const startUpload = useCallback(
        (localId: string, file: File) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
                    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, progress: pct } : i)));
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    const json = JSON.parse(xhr.responseText) as { data: MediaFile } | MediaFile;
                    const data = 'data' in json ? json.data : json;
                    setItems((prev) =>
                        prev.map((i) => (i.localId === localId ? { ...i, status: 'done', progress: 100 } : i)),
                    );
                    onUploaded(data);
                } else {
                    let msg = t('Upload failed.');

                    try {
                        const body = JSON.parse(xhr.responseText) as { message?: string };

                        if (body.message) {
msg = body.message;
}
                    } catch { /* ignore parse errors */ }

                    setItems((prev) =>
                        prev.map((i) => (i.localId === localId ? { ...i, status: 'error', error: msg } : i)),
                    );
                }
            };

            xhr.onerror = () => {
                setItems((prev) =>
                    prev.map((i) =>
                        i.localId === localId ? { ...i, status: 'error', error: t('Upload failed.') } : i,
                    ),
                );
            };

            xhr.open('POST', storeMedia.url(participationId));
            xhr.setRequestHeader('X-CSRF-TOKEN', getCsrfToken());
            const fd = new FormData();
            fd.append('file', file);
            xhr.send(fd);
        },
        [participationId, onUploaded, t],
    );

    const addFiles = useCallback(
        (files: FileList | null) => {
            if (!files) {
return;
}

            const MAX_BYTES = 10 * 1024 * 1024;
            const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
            Array.from(files).forEach((file) => {
                if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
return;
}

                const localId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                setItems((prev) => [...prev, { localId, file, progress: 0, status: 'uploading' }]);
                startUpload(localId, file);
            });

            if (inputRef.current) {
inputRef.current.value = '';
}
        },
        [startUpload],
    );

    function removeItem(localId: string) {
        setItems((prev) => prev.filter((i) => i.localId !== localId));
    }

    return (
        <div className="space-y-3">
            {/* Drop zone / trigger */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    addFiles(e.dataTransfer.files);
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors cursor-pointer select-none ${
                    dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:border-muted-foreground/50 hover:bg-muted/30'
                }`}
            >
                <Plus className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('Add photos')}</span>
                <span className="text-xs text-muted-foreground/60">— {t('JPEG, PNG, WebP — max 10 MB')}</span>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
            />

            {/* Queue items */}
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.localId}
                            className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                        >
                            {/* Status icon */}
                            <div className="shrink-0">
                                {item.status === 'done' ? (
                                    <CheckCircle2 className="size-4 text-green-500" />
                                ) : item.status === 'error' ? (
                                    <XCircle className="size-4 text-destructive" />
                                ) : (
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {/* Filename + progress */}
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="truncate text-xs font-medium">{item.file.name}</p>
                                {item.status === 'uploading' && (
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-150"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                )}
                                {item.status === 'done' && (
                                    <p className="text-[11px] text-green-600">{t('Upload complete')}</p>
                                )}
                                {item.status === 'error' && item.error && (
                                    <p className="text-[11px] text-destructive">{item.error}</p>
                                )}
                            </div>

                            {/* Dismiss when not actively uploading */}
                            {item.status !== 'uploading' && (
                                <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => removeItem(item.localId)}
                                    aria-label={t('Dismiss')}
                                >
                                    <XCircle className="size-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Sheet
// ---------------------------------------------------------------------------

export function ParticipationMediaSheet({
    participationId,
    memberName,
    open,
    onOpenChange,
    canUpload,
    canDelete,
}: Props) {
    const { t } = useTranslation();
    const [media, setMedia] = useState<MediaFile[] | null>(null);
    const loading = media === null;
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    // Fetch existing media when sheet opens
    useEffect(() => {
        if (!open) {
return;
}

        let cancelled = false;
        fetch(indexMedia.url(participationId), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((json: { data: MediaFile[] }) => {
                if (!cancelled) {
                    setMedia(json.data ?? []);
                    setLightboxIdx(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMedia([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, participationId]);

    function handleUploaded(file: MediaFile) {
        setMedia((prev) => [file, ...(prev ?? [])]);
    }

    async function handleDelete(mediaFileId: number) {
        setDeleting(mediaFileId);

        try {
            const res = await fetch(
                destroyMedia.url({ participation: participationId, mediaFile: mediaFileId }),
                {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': getCsrfToken() },
                    credentials: 'same-origin',
                },
            );

            if (res.ok || res.status === 204) {
                setMedia((prev) => (prev ?? []).filter((f) => f.id !== mediaFileId));
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
                            {canUpload ? <Camera className="size-4" /> : <Images className="size-4" />}
                            {t('Photos')}
                        </SheetTitle>
                        <SheetDescription>{memberName}</SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {canUpload && (
                            <UploadQueue participationId={participationId} onUploaded={handleUploaded} />
                        )}

                        {/* Gallery */}
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : media.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-center">
                                <Camera className="size-10 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">{t('No photos yet.')}</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    {media.length} {t('photos')}
                                </p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {media.map((file, idx) => (
                                        <div
                                            key={file.id}
                                            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                                        >
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
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {lightboxIdx !== null && (
                <Lightbox files={media ?? []} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
            )}
        </>
    );
}
