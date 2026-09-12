import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type ConfirmationVariant = 'destructive' | 'warning' | 'info' | 'default';

export interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmationVariant;
    icon?: React.ReactNode;
    onConfirm: () => void | Promise<void>;
    processing?: boolean;
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = 'default',
    icon,
    onConfirm,
    processing = false,
}: ConfirmationDialogProps) {
    const { t } = useTranslation();

    const resolvedConfirmLabel =
        confirmLabel ??
        (variant === 'destructive' ? t('Delete') : t('Confirm'));
    const resolvedCancelLabel = cancelLabel ?? t('Cancel');

    const defaultIcon = () => {
        if (icon) {
            return icon;
        }

        switch (variant) {
            case 'destructive':
                return <AlertTriangle className="h-5 w-5 text-destructive" />;
            case 'warning':
                return (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                );
            case 'info':
                return <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
            default:
                return null;
        }
    };

    const iconBgClass = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-destructive/10 text-destructive';
            case 'warning':
                return 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400';
            case 'info':
                return 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400';
            default:
                return 'bg-primary/10 text-primary';
        }
    };

    const renderedIcon = defaultIcon();

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!processing) {
                    onOpenChange(val);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-2 sm:gap-3">
                    <div className="flex items-start gap-3">
                        {renderedIcon && (
                            <div
                                className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                    iconBgClass(),
                                )}
                            >
                                {renderedIcon}
                            </div>
                        )}
                        <div className="space-y-1 text-left">
                            <DialogTitle className="text-base font-semibold leading-6">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => onOpenChange(false)}
                        >
                            {resolvedCancelLabel}
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        disabled={processing}
                        onClick={onConfirm}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('Please wait…')}
                            </>
                        ) : (
                            resolvedConfirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
