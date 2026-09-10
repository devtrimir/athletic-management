import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RotateCcw,
    Shield,
    ShieldAlert,
    Trash2,
    Trophy,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    deletionImpact,
    forceDestroy as forceDestroyMember,
    restore as restoreMember,
} from '@/actions/App/Http/Controllers/MemberController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

export interface ArchivedMemberActionDialogProps {
    member: {
        id: number;
        full_name: string;
        member_code: string;
        pno?: string | null;
    };
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

interface DeletionImpactData {
    can_delete: boolean;
    has_connections: boolean;
    summary: {
        active_teams_count: number;
        past_teams_count: number;
        linked_coach: { id: number; name: string; pno: string | null } | null;
        participations_count: number;
        medals: {
            total: number;
            gold: number;
            silver: number;
            bronze: number;
        };
        active_external_coaching_count: number;
        special_achievements_count: number;
        promotions_count: number;
    };
}

export function ArchivedMemberActionDialog({
    member,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
}: ArchivedMemberActionDialogProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

    const [loading, setLoading] = useState(false);
    const [impact, setImpact] = useState<DeletionImpactData | null>(null);
    const [typedConfirm, setTypedConfirm] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const expectedConfirm = member.pno?.trim() || member.member_code;
    const confirmPromptField = member.pno ? t('PNO') : t('Member Code');

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setLoading(true);
            setFetchError(null);
        } else {
            setTypedConfirm('');
            setFetchError(null);
        }
        setIsOpen(newOpen);
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let isMounted = true;

        fetch(deletionImpact.url(member.id), {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(
                        t('Failed to fetch member connection impact'),
                    );
                }
                return response.json();
            })
            .then((data: DeletionImpactData) => {
                if (isMounted) {
                    setImpact(data);
                    setLoading(false);
                }
            })
            .catch((err: Error) => {
                if (isMounted) {
                    setFetchError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, member.id, t]);

    const isForceConfirmValid =
        typedConfirm.trim().toLowerCase() ===
        expectedConfirm.trim().toLowerCase();

    const handleRestore = () => {
        if (isRestoring || isPurging) {
            return;
        }

        setIsRestoring(true);
        router.post(
            restoreMember.url(member.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRestoring(false),
                onSuccess: () => {
                    setIsOpen(false);
                    onSuccess?.();
                },
            },
        );
    };

    const handlePurge = () => {
        if (
            !isForceConfirmValid ||
            isPurging ||
            isRestoring ||
            impact?.has_connections
        ) {
            return;
        }

        setIsPurging(true);
        router.delete(forceDestroyMember.url(member.id), {
            preserveScroll: true,
            onFinish: () => setIsPurging(false),
            onSuccess: () => {
                setIsOpen(false);
                onSuccess?.();
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-lg text-amber-900 dark:text-amber-100">
                            <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <DialogTitle>
                                {t('Archived Member')}: {member.full_name}
                            </DialogTitle>
                        </div>
                        <Badge
                            variant="outline"
                            className="border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold"
                        >
                            {t('Archived')}
                        </Badge>
                    </div>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {t(
                            'This member is currently archived (soft-deleted). You can restore this member back to active status, or permanently purge this record if there are no historical connections.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full rounded-md" />
                            <Skeleton className="h-20 w-full rounded-md" />
                        </div>
                    ) : fetchError ? (
                        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            {fetchError}
                        </div>
                    ) : impact ? (
                        <>
                            {/* Preserved Records Card */}
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex items-start gap-2.5">
                                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            {t('Historical Records Preserved in Archive')}
                                        </h4>
                                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {impact.summary.participations_count} {t('Participations')}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1"
                                            >
                                                <Trophy className="h-3 w-3" />
                                                {impact.summary.medals.total} {t('Medals')} (🥇{impact.summary.medals.gold} 🥈{impact.summary.medals.silver} 🥉{impact.summary.medals.bronze})
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {impact.summary.special_achievements_count} {t('Special Recognitions')}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {impact.summary.promotions_count} {t('Promotions')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Alert: Blocked vs Clean */}
                            {impact.has_connections ? (
                                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                                    <div className="space-y-1">
                                        <p className="font-semibold text-xs">
                                            {t('Permanent deletion is blocked')}
                                        </p>
                                        <p>
                                            {t(
                                                'This athlete has historical records (:medals medals, :participations participations, or past rosters). To preserve official police sports records, permanent purge is disabled. You can restore the athlete instead.',
                                            )
                                                .replace(':medals', String(impact.summary.medals.total))
                                                .replace(':participations', String(impact.summary.participations_count))}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">
                                            {t('Zero Connections Found')}
                                        </p>
                                        <p className="mt-0.5">
                                            {t(
                                                'This record has no linked tournament participations, medals, or coaching assignments. It can be safely restored or permanently purged.',
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Purge Safety Input if clean */}
                            {!impact.has_connections && (
                                <div className="space-y-1.5 pt-1">
                                    <Label htmlFor="purge-confirm-input" className="text-xs font-medium text-foreground">
                                        {t('To permanently delete, type the member :field (:expected):')
                                            .replace(':field', confirmPromptField)
                                            .replace(':expected', expectedConfirm)}
                                    </Label>
                                    <Input
                                        id="purge-confirm-input"
                                        type="text"
                                        value={typedConfirm}
                                        onChange={(e) => setTypedConfirm(e.target.value)}
                                        placeholder={expectedConfirm}
                                        autoComplete="off"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 justify-end">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            disabled={isRestoring || isPurging}
                        >
                            {t('Cancel')}
                        </Button>
                    </DialogClose>

                    <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-600/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950/40 font-medium"
                        disabled={isRestoring || isPurging}
                        onClick={handleRestore}
                    >
                        {isRestoring ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('Restoring…')}
                            </>
                        ) : (
                            <>
                                <RotateCcw className="mr-2 h-4 w-4 text-emerald-600" />
                                {t('Restore Member')}
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        disabled={
                            loading ||
                            impact?.has_connections ||
                            !isForceConfirmValid ||
                            isPurging ||
                            isRestoring
                        }
                        title={
                            impact?.has_connections
                                ? t('Cannot permanently delete member with historical records')
                                : undefined
                        }
                        onClick={handlePurge}
                    >
                        {isPurging ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('Deleting…')}
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('Permanently Delete')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
