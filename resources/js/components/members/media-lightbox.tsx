import { X } from 'lucide-react';
import { useState } from 'react';
import type { MediaFile } from './participation-media-sheet';

export function Lightbox({ files, index, onClose }: { files: MediaFile[]; index: number; onClose: () => void }) {
    const [current, setCurrent] = useState(index);
    const file = files[current];

    function prev() {
 setCurrent((i) => (i - 1 + files.length) % files.length); 
}
    function next() {
 setCurrent((i) => (i + 1) % files.length); 
}

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={onClose}
        >
            <button
                type="button"
                className="absolute top-4 right-4 text-white/80 hover:text-white"
                onClick={onClose}
            >
                <X className="size-6" />
            </button>

            {files.length > 1 && (
                <>
                    <button
                        type="button"
                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-xl text-white hover:bg-black/70"
                        onClick={(e) => {
 e.stopPropagation(); prev(); 
}}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-xl text-white hover:bg-black/70"
                        onClick={(e) => {
 e.stopPropagation(); next(); 
}}
                    >
                        ›
                    </button>
                </>
            )}

            <div
                className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={file?.url}
                    alt={file?.caption_hi ?? file?.original_name}
                    className="max-h-[80vh] max-w-full rounded-lg object-contain"
                />
                {file?.caption_hi && (
                    <p className="text-center text-sm text-white/80">{file.caption_hi}</p>
                )}
                <p className="text-xs text-white/50">{current + 1} / {files.length}</p>
            </div>
        </div>
    );
}
