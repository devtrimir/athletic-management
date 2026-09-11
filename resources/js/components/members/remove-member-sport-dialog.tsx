import { AlertTriangle, ShieldAlert, Trash2, Users } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';

export interface ConnectedTeamInfo {
    team_id: number;
    team_name: string;
    session_name?: string | null;
    role?: string | null;
    sport_id?: number;
    sport_name?: string | null;
}

export interface RemoveMemberSportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sportName: string;
    connectedTeams?: ConnectedTeamInfo[];
    onConfirm: () => void;
    entityType?: 'member' | 'coach';
}

export function RemoveMemberSportDialog({
    open,
    onOpenChange,
    sportName,
    connectedTeams = [],
    onConfirm,
    entityType = 'member',
}: RemoveMemberSportDialogProps) {
    const { t } = useTranslation();
    const isBlocked = connectedTeams.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                {isBlocked ? (
                    <>
                        <DialogHeader className="gap-2 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                                    <ShieldAlert className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-semibold">
                                        {t('Cannot Remove Sport')}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        {entityType === 'coach'
                                            ? t(
                                                  'Coach is currently active in team assignments',
                                              )
                                            : t(
                                                  'Member is currently active in team rosters',
                                              )}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-left">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {entityType === 'coach'
                                    ? t(
                                          'This coach is currently assigned to one or more active teams playing :sport. Coaches must have this sport specialization to remain eligible for these teams.',
                                      ).replace(
                                          ':sport',
                                          sportName || t('this sport'),
                                      )
                                    : t(
                                          'This member is currently assigned to one or more active teams playing :sport. Members must have this sport to remain eligible for these teams.',
                                      ).replace(
                                          ':sport',
                                          sportName || t('this sport'),
                                      )}
                            </p>

                            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('Connected Active Teams')}
                                </div>
                                <div className="divide-y rounded-md border bg-background text-sm">
                                    {connectedTeams.map((team) => (
                                        <div
                                            key={team.team_id}
                                            className="flex items-center justify-between p-2.5"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Users className="h-4 w-4 shrink-0 text-primary" />
                                                <span className="truncate font-medium text-foreground">
                                                    {team.team_name}
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {team.session_name && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {team.session_name}
                                                    </Badge>
                                                )}
                                                {team.role && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {team.role}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    {entityType === 'coach'
                                        ? t(
                                              'To remove this sport, first remove or transfer the coach from the above team assignment(s).',
                                          )
                                        : t(
                                              'To remove this sport, first remove or transfer the member from the above team roster(s).',
                                          )}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => onOpenChange(false)}
                            >
                                {t('Close')}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader className="gap-2 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-semibold">
                                        {t('Remove Sport')}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        {entityType === 'coach'
                                            ? t(
                                                  'Confirm removing this sport specialization from the coach profile',
                                              )
                                            : t(
                                                  'Confirm removing this sport from the member profile',
                                              )}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-left">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {entityType === 'coach'
                                    ? t(
                                          'Are you sure you want to remove :sport from this coach’s sport specializations?',
                                      ).replace(
                                          ':sport',
                                          sportName || t('this sport'),
                                      )
                                    : t(
                                          'Are you sure you want to remove :sport from this member’s playable sports?',
                                      ).replace(
                                          ':sport',
                                          sportName || t('this sport'),
                                      )}
                            </p>

                            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                {entityType === 'coach'
                                    ? t(
                                          'Any level, sport event, dates, or notes recorded for this sport specialization will also be removed.',
                                      )
                                    : t(
                                          'Any role, position, sport event, weight, or notes recorded for this sport will also be removed.',
                                      )}
                            </div>
                        </div>

                        <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    onConfirm();
                                    onOpenChange(false);
                                }}
                            >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                {t('Remove sport')}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
