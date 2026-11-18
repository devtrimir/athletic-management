import { useState } from 'react';
import { MemberAvatar } from '@/components/members/member-table-cells';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';

/**
 * Member avatar for table rows. When the member has a photo it is clickable
 * and opens a large view; without one it is a plain placeholder.
 */
export function MemberPhotoPreview({
    photoPath,
    name,
}: {
    photoPath?: string | null;
    name: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [broken, setBroken] = useState(false);

    if (!photoPath) {
        return <MemberAvatar photoPath={null} name={name} />;
    }

    return (
        <>
            <button
                type="button"
                title={t('View photo')}
                aria-label={`${t('View photo')}: ${name}`}
                className="block cursor-zoom-in rounded-full ring-offset-background transition hover:ring-2 hover:ring-primary/40"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen(true);
                }}
            >
                <MemberAvatar photoPath={photoPath} name={name} />
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="sm:max-w-2xl"
                    aria-describedby={undefined}
                    onClick={(event) => event.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle>{name}</DialogTitle>
                    </DialogHeader>
                    {broken ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {t('Photo not available')}
                        </p>
                    ) : (
                        <img
                            src={`/storage/${photoPath}`}
                            alt={name}
                            onError={() => setBroken(true)}
                            className="mx-auto max-h-[75vh] w-auto rounded-md object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
