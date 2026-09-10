import { router } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
    checkPno,
    restore as restoreMember,
} from '@/actions/App/Http/Controllers/MemberController';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { ArchivedMemberActionDialog } from './archived-member-action-dialog';

export interface PnoConflictNoticeProps {
    pno: string;
    onRestoreSuccess?: (memberId: number) => void;
}

interface ConflictData {
    status: 'empty' | 'available' | 'active_conflict' | 'deleted_member';
    entity?: 'member' | 'coach' | 'incharge';
    name?: string;
    rank?: string | null;
    code?: string;
    id?: number;
    member?: {
        id: number;
        full_name: string;
        pno: string | null;
        rank: string | null;
        member_code: string;
        deleted_at: string | null;
        can_purge: boolean;
        summary: {
            active_teams_count: number;
            past_teams_count: number;
            participations_count: number;
            medals: { total: number };
        };
    };
}

export function PnoConflictNotice({
    pno,
    onRestoreSuccess,
}: PnoConflictNoticeProps) {
    const { t } = useTranslation();
    const [conflict, setConflict] = useState<ConflictData | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [dismissedId, setDismissedId] = useState<number | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const trimmed = pno.trim();
        if (trimmed.length < 3) {
            setConflict(null);
            setIsChecking(false);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        setIsChecking(true);
        debounceRef.current = setTimeout(() => {
            fetch(checkPno.url({ query: { pno: trimmed } }), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
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
    }, [pno]);

    const handleRestore = (memberId: number) => {
        setIsRestoring(true);
        router.post(
            restoreMember.url(memberId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRestoring(false),
                onSuccess: () => {
                    setConflict(null);
                    onRestoreSuccess?.(memberId);
                },
            },
        );
    };

    if (isChecking) {
        return (
            <div className="col-span-full flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('Checking…')}</span>
            </div>
        );
    }

    if (!conflict) {
        return null;
    }

    // Active conflict banner
    if (conflict.status === 'active_conflict') {
        return (
            <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-destructive dark:border-destructive/40">
                <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
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

    // Soft-deleted member conflict banner
    if (
        conflict.status === 'deleted_member' &&
        conflict.member &&
        conflict.member.id !== dismissedId
    ) {
        const m = conflict.member;
        return (
            <div className="col-span-full rounded-lg border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                            <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-amber-950 dark:text-amber-100 text-sm">
                                    {t('Archived Member Found with this PNO')}
                                </h4>
                                <Badge
                                    variant="outline"
                                    className="border-amber-400 bg-amber-100/60 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                                >
                                    {m.member_code}
                                </Badge>
                            </div>
                            <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                                <span className="font-medium">{m.full_name}</span>
                                {m.rank && ` (${m.rank})`}
                                {m.deleted_at && ` • ${t('Archived on')} ${m.deleted_at}`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-amber-800 dark:text-amber-300">
                                <span>{t('Medals')}: {m.summary?.medals?.total ?? 0}</span>
                                <span>•</span>
                                <span>{t('Participations')}: {m.summary?.participations_count ?? 0}</span>
                                <span>•</span>
                                <span>
                                    {t('Teams')}: {(m.summary?.active_teams_count ?? 0) + (m.summary?.past_teams_count ?? 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 sm:shrink-0">
                        {/* Restore Member — requires confirmation */}
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
                                    {t('Restore Member')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t('Restore :name?').replace(':name', m.full_name)}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t(
                                            'This will restore the archived member back to active status. Their historical records (participations, medals, promotions) will be re-linked. This action can be reversed by archiving the member again.',
                                        )}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                                        onClick={() => handleRestore(m.id)}
                                    >
                                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Yes, Restore Member')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <ArchivedMemberActionDialog
                            member={{
                                id: m.id,
                                full_name: m.full_name,
                                member_code: m.member_code,
                                pno: m.pno,
                            }}
                            trigger={
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Permanently Delete / Manage')}
                                </Button>
                            }
                            onSuccess={() => {
                                setConflict(null);
                            }}
                        />

                        {/* Proceed as New Member — requires confirmation */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-amber-900 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
                                >
                                    {t('Proceed as New Member')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t('Proceed as a new member?')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t(
                                            'You are about to create a new member record with the same PNO as the archived member (:name). The archived record will remain in the system. Are you sure you want to continue?',
                                        ).replace(':name', m.full_name)}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => setDismissedId(m.id)}
                                    >
                                        {t('Yes, Proceed as New Member')}
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
