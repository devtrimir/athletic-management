import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Shield,
    Trash2,
    Trophy,
    UserMinus,
    Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    deletionImpact,
    destroy as destroyMember,
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

export interface DeleteMemberDialogProps {
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
    active_teams: Array<{
        id: number | null;
        name: string | null;
        sport: string | null;
        session: string | null;
        role: string | null;
    }>;
    active_external_coaching: Array<{
        id: number;
        coach_name: string | null;
        sport_name: string | null;
    }>;
}

export function DeleteMemberDialog({
    member,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
}: DeleteMemberDialogProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

    const [loadingImpact, setLoadingImpact] = useState(false);
    const [impact, setImpact] = useState<DeletionImpactData | null>(null);
    const [typedConfirm, setTypedConfirm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const expectedConfirm = member.pno?.trim() || member.member_code;
    const confirmPromptField = member.pno ? t('PNO') : t('Member Code');

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setLoadingImpact(true);
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
                    setLoadingImpact(false);
                }
            })
            .catch((err: Error) => {
                if (isMounted) {
                    setFetchError(err.message);
                    setLoadingImpact(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, member.id, t]);

    const isConfirmValid =
        !impact?.has_connections ||
        typedConfirm.trim().toLowerCase() ===
            expectedConfirm.trim().toLowerCase();

    const handleDelete = () => {
        if (!isConfirmValid || isDeleting) {
            return;
        }

        setIsDeleting(true);
        router.delete(destroyMember.url(member.id), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
            },
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
                    <div className="flex items-center gap-2 text-destructive font-semibold text-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>
                            {t('Delete Member')}: {member.full_name}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {t(
                            'This will safely archive the member using soft delete. Historical competition records and achievements are retained, while active squad rosters and coach associations will be disengaged.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {loadingImpact ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full rounded-md" />
                            <Skeleton className="h-24 w-full rounded-md" />
                            <Skeleton className="h-14 w-full rounded-md" />
                        </div>
                    ) : fetchError ? (
                        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            {fetchError}
                        </div>
                    ) : impact ? (
                        <>
                            {/* Active Teams Impact */}
                            {impact.active_teams.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <div className="flex items-start gap-2.5">
                                        <Users className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                                    {t('Active Team Rosters')}{' '}
                                                    ({impact.active_teams.length})
                                                </h4>
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-400 text-amber-800 dark:text-amber-300 text-xs"
                                                >
                                                    {t('Will be removed')}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                                                {t(
                                                    'The member will be marked as departed today from the following active squads:',
                                                )}
                                            </p>
                                            <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-1 font-mono">
                                                {impact.active_teams.map(
                                                    (team, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 rounded"
                                                        >
                                                            <span>
                                                                {team.name} (
                                                                {team.sport ||
                                                                    t('Sport')}
                                                                )
                                                            </span>
                                                            <span className="text-[11px] text-amber-700 dark:text-amber-400">
                                                                {team.session}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Linked Coach Impact */}
                            {impact.summary.linked_coach && (
                                <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20">
                                    <div className="flex items-start gap-2.5">
                                        <UserMinus className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-sky-900 dark:text-sky-200">
                                                    {t('Linked Coach Record')}
                                                </h4>
                                                <Badge
                                                    variant="outline"
                                                    className="border-sky-400 text-sky-800 dark:text-sky-300 text-xs"
                                                >
                                                    {t('Will be unlinked')}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-sky-800/90 dark:text-sky-300/80">
                                                {t(
                                                    'Coach profile :name (PNO: :pno) will remain in the system, but its link to this member will be safely severed.',
                                                )
                                                    .replace(
                                                        ':name',
                                                        impact.summary
                                                            .linked_coach.name,
                                                    )
                                                    .replace(
                                                        ':pno',
                                                        impact.summary
                                                            .linked_coach.pno ||
                                                            '-',
                                                    )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active External Coaching Impact */}
                            {impact.active_external_coaching.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <div className="flex items-start gap-2.5">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                                    {t(
                                                        'External Coaching Assignments',
                                                    )}{' '}
                                                    (
                                                    {
                                                        impact
                                                            .active_external_coaching
                                                            .length
                                                    }
                                                    )
                                                </h4>
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-400 text-amber-800 dark:text-amber-300 text-xs"
                                                >
                                                    {t('Will be concluded')}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                                                {t(
                                                    'Active external coaching programs will be marked as ended/cancelled.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preserved Historical Records Card */}
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex items-start gap-2.5">
                                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            {t(
                                                'Historical Records Preserved in Archive',
                                            )}
                                        </h4>
                                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {
                                                    impact.summary
                                                        .participations_count
                                                }{' '}
                                                {t('Participations')}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1"
                                            >
                                                <Trophy className="h-3 w-3" />
                                                {
                                                    impact.summary.medals.total
                                                }{' '}
                                                {t('Medals')} (🥇
                                                {impact.summary.medals.gold} 🥈
                                                {impact.summary.medals.silver} 🥉
                                                {impact.summary.medals.bronze})
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {
                                                    impact.summary
                                                        .special_achievements_count
                                                }{' '}
                                                {t('Special Recognitions')}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            >
                                                {impact.summary.promotions_count}{' '}
                                                {t('Promotions')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Safety Confirmation Prompt if member has connections */}
                            {impact.has_connections && (
                                <div className="space-y-2 pt-1">
                                    <Label
                                        htmlFor="confirm-input"
                                        className="text-xs font-medium text-foreground"
                                    >
                                        {t(
                                            'To confirm deletion, please type the member :field (:expected):',
                                        )
                                            .replace(
                                                ':field',
                                                confirmPromptField,
                                            )
                                            .replace(
                                                ':expected',
                                                expectedConfirm,
                                            )}
                                    </Label>
                                    <Input
                                        id="confirm-input"
                                        type="text"
                                        value={typedConfirm}
                                        onChange={(e) =>
                                            setTypedConfirm(e.target.value)
                                        }
                                        placeholder={expectedConfirm}
                                        autoComplete="off"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isDeleting}>
                            {t('Cancel')}
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        disabled={
                            loadingImpact || !isConfirmValid || isDeleting
                        }
                        onClick={handleDelete}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('Deleting…')}
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('Delete Member')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
