import { router } from '@inertiajs/react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    checkPno,
    restore as restoreCoach,
} from '@/actions/App/Http/Controllers/CoachController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export interface CoachPnoConflictNoticeProps {
    pno: string;
    onRestoreSuccess?: (coachId: number) => void;
    /** Exclude this coach's own id from the active-conflict check (edit forms). */
    ignoreCoachId?: number;
    /**
     * Exclude this member's own id from the active-conflict check — the
     * "Register as Coach" flow prefills the PNO from the linked member, so
     * that member is always an "active conflict" against itself otherwise.
     */
    ignoreMemberId?: number;
}

interface ConflictData {
    status: 'empty' | 'available' | 'active_conflict' | 'deleted_coach';
    entity?: 'member' | 'coach' | 'incharge';
    name?: string;
    coach?: {
        id: number;
        full_name: string;
        pno: string | null;
        deleted_at: string | null;
        can_purge: boolean;
        summary: {
            active_assignments_count: number;
            sports_count: number;
            promotions_count: number;
            playing_achievements_count: number;
        };
    };
}

export function CoachPnoConflictNotice({
    pno,
    onRestoreSuccess,
    ignoreCoachId,
    ignoreMemberId,
}: CoachPnoConflictNoticeProps) {
    const { t } = useTranslation();
    const [conflict, setConflict] = useState<ConflictData | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [dismissedId, setDismissedId] = useState<number | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const trimmed = pno.trim();

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (trimmed.length < 3) {
            debounceRef.current = setTimeout(() => {
                setConflict(null);
                setIsChecking(false);
            }, 0);

            return;
        }

        debounceRef.current = setTimeout(() => {
            setIsChecking(true);
            fetch(
                checkPno.url({
                    query: {
                        pno: trimmed,
                        ...(ignoreCoachId ? { ignore_coach_id: ignoreCoachId } : {}),
                        ...(ignoreMemberId ? { ignore_member_id: ignoreMemberId } : {}),
                    },
                }),
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            )
                .then(async (res) => {
                    if (!res.ok) {
                        return null;
                    }

                    return res.json();
                })
                .then((data: ConflictData | null) => {
                    setConflict(data);
                    setIsChecking(false);
                })
                .catch(() => {
                    setIsChecking(false);
                });
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [pno, ignoreCoachId, ignoreMemberId]);

    const handleRestore = (coachId: number) => {
        setIsRestoring(true);
        router.post(
            restoreCoach.url(coachId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRestoring(false),
                onSuccess: () => {
                    setConflict(null);
                    onRestoreSuccess?.(coachId);
                },
            },
        );
    };

    if (isChecking) {
        return (
            <div className="col-span-full flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('Checking…')}</span>
            </div>
        );
    }

    if (!conflict) {
        return null;
    }

    if (conflict.status === 'active_conflict') {
        return (
            <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-destructive dark:border-destructive/40">
                <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1 text-xs">
                        <p className="font-semibold">
                            {t('This PNO is currently in use by an active :role (:name).')
                                .replace(':role', conflict.entity ?? t('person'))
                                .replace(':name', conflict.name ?? '')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (
        conflict.status === 'deleted_coach' &&
        conflict.coach &&
        conflict.coach.id !== dismissedId
    ) {
        const c = conflict.coach;

        return (
            <div className="col-span-full rounded-lg border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                            <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                                    {t('Archived Coach Found with this PNO')}
                                </h4>
                            </div>
                            <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                                <span className="font-medium">{c.full_name}</span>
                                {c.deleted_at && ` • ${t('Archived on')} ${c.deleted_at}`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-amber-800 dark:text-amber-300">
                                <span>{t('Sports')}: {c.summary?.sports_count ?? 0}</span>
                                <span>•</span>
                                <span>{t('Promotions')}: {c.summary?.promotions_count ?? 0}</span>
                                <span>•</span>
                                <span>{t('Active assignments')}: {c.summary?.active_assignments_count ?? 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 sm:shrink-0">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                                    disabled={isRestoring}
                                >
                                    {isRestoring ? (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    {t('Restore Coach')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t('Restore :name?').replace(':name', c.full_name)}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t(
                                            'This will restore the archived coach back to active status. Their historical records (sports, promotions, achievements) will be re-linked. This action can be reversed by archiving the coach again.',
                                        )}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                                        onClick={() => handleRestore(c.id)}
                                    >
                                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Yes, Restore Coach')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-amber-900 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
                                >
                                    {t('Proceed as New Coach')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t('Proceed as a new coach?')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t(
                                            'You are about to create a new coach record with the same PNO as the archived coach (:name). The archived record will remain in the system. Are you sure you want to continue?',
                                        ).replace(':name', c.full_name)}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setDismissedId(c.id)}>
                                        {t('Yes, Proceed as New Coach')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
