import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ProfilePhotoLightboxProps {
    src: string;
    alt: string;
    open: boolean;
    onClose: () => void;
}

export function ProfilePhotoLightbox({
    src,
    alt,
    open,
    onClose,
}: ProfilePhotoLightboxProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt}
        >
            <button
                type="button"
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                onClick={onClose}
                aria-label="Close"
            >
                <X className="size-5" />
            </button>

            <div
                className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt}
                    className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
                />
                <p className="text-sm text-white/60">{alt}</p>
            </div>
        </div>
    );
}
