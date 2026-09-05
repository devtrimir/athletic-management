import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import {
    destroy as destroyTeamIncharge,
    store as storeTeamIncharge,
    update as updateTeamIncharge,
} from '@/actions/App/Http/Controllers/TeamInchargeController';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type CurrentAssignment = {
    id: number;
    incharge_id: number | null;
    full_name: string;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    assigned_at: string | null;
    assignment_reason: string | null;
    remarks: string | null;
} | null;

type HistoryRow = {
    id: number;
    incharge_id: number | null;
    full_name: string;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    assigned_at: string | null;
    removed_at: string | null;
    assignment_reason: string | null;
    removal_reason: string | null;
    remarks: string | null;
    is_current: boolean;
    assigned_by: { id: number; name: string } | null;
    removed_by: { id: number; name: string } | null;
};

type InchargeOption = {
    id: number;
    full_name: string;
    pno: string;
    rank: string | null;
    mobile: string | null;
    email: string | null;
};

type ErrorValue = string | string[];
type ErrorMap = Record<string, ErrorValue>;
type GenericErrors = unknown;

type DialogMode = 'assign' | 'change' | 'remove' | null;

type InchargeErrors = {
    assignIncharge?: ErrorMap;
    changeIncharge?: ErrorMap;
    removeIncharge?: ErrorMap;
    [key: string]: ErrorMap | string | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function valueToMessage(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const next = value.trim();

        return next.length > 0 ? next : undefined;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
        const next = value[0].trim();

        return next.length > 0 ? next : undefined;
    }

    return undefined;
}

function normalizeErrorMap(value: unknown): ErrorMap {
    if (!isRecord(value)) {
        return {};
    }

    const next: ErrorMap = {};

    for (const [field, raw] of Object.entries(value)) {
        const message = valueToMessage(raw);

        if (message !== undefined) {
            next[field] = message;
        }
    }

    return next;
}

function collectBagErrors(
    source: GenericErrors,
    bag: 'assignIncharge' | 'changeIncharge' | 'removeIncharge',
): ErrorMap {
    if (!isRecord(source)) {
        return {};
    }

    const bagValue = source[bag];

    if (isRecord(bagValue)) {
        return normalizeErrorMap(bagValue);
    }

    if (isRecord(source.errors) && isRecord(source.errors[bag])) {
        return normalizeErrorMap(source.errors[bag]);
    }

    if (
        isRecord(source.errors) &&
        !isRecord((source.errors as Record<string, unknown>)[bag])
    ) {
        return normalizeErrorMap(source.errors);
    }

    return {};
}

function fieldMessage(
    formErrors: ErrorMap,
    pageErrors: ErrorMap,
    serverErrors: ErrorMap,
    field: string,
): string | undefined {
    return (
        valueToMessage(formErrors[field]) ??
        valueToMessage(pageErrors[field]) ??
        valueToMessage(serverErrors[field])
    );
}

function detailValue(value: string | null | undefined): string {
    return value && value.length > 0 ? value : '';
}

function displayDate(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const [datePart] = value.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);

    if (!year || !month || !day) {
        return value;
    }

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function inchargeLabel(incharge: InchargeOption): string {
    return [incharge.full_name, incharge.pno].filter(Boolean).join(' · ');
}

function InchargeSnapshot({ incharge }: { incharge: InchargeOption }) {
    const { t } = useTranslation();

    return (
        <div className="rounded-lg border bg-muted/30">
            <div className="border-b px-3 py-2">
                <p className="text-sm font-medium">{incharge.full_name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                    {incharge.pno}
                </p>
            </div>
            <dl className="grid gap-3 p-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-xs text-muted-foreground">
                        {t('Rank')}
                    </dt>
                    <dd className="font-medium">
                        {detailValue(incharge.rank)}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        {t('Mobile')}
                    </dt>
                    <dd className="font-medium">
                        {detailValue(incharge.mobile)}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        {t('Email')}
                    </dt>
                    <dd className="truncate font-medium">
                        {detailValue(incharge.email)}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

export function TeamInchargePanel({
    teamId,
    teamIsActive,
    currentAssignment,
    history = [],
    incharges,
}: {
    teamId: number;
    teamIsActive: boolean;
    currentAssignment: CurrentAssignment;
    history?: HistoryRow[];
    incharges: InchargeOption[];
}) {
    const { t } = useTranslation();
    const page = usePage<{ errors?: InchargeErrors }>();
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [assignServerErrors, setAssignServerErrors] = useState<ErrorMap>({});
    const [changeServerErrors, setChangeServerErrors] = useState<ErrorMap>({});
    const [removeServerErrors, setRemoveServerErrors] = useState<ErrorMap>({});
    const assignForm = useForm({
        incharge_id: '',
        assigned_at: '',
        assignment_reason: '',
        remarks: '',
    });

    const changeForm = useForm({
        incharge_id: '',
        assigned_at: '',
        assignment_reason: '',
        removal_reason: '',
        remarks: '',
    });

    const removeForm = useForm({
        removed_at: '',
        removal_reason: '',
        remarks: '',
    });

    const pageAssignErrors = collectBagErrors(
        page.props.errors,
        'assignIncharge',
    );
    const pageChangeErrors = collectBagErrors(
        page.props.errors,
        'changeIncharge',
    );
    const pageRemoveErrors = collectBagErrors(
        page.props.errors,
        'removeIncharge',
    );

    const clearAssignErrors = () => {
        assignForm.clearErrors();
        setAssignServerErrors({});
    };

    const clearChangeErrors = () => {
        changeForm.clearErrors();
        setChangeServerErrors({});
    };

    const clearRemoveErrors = () => {
        removeForm.clearErrors();
        setRemoveServerErrors({});
    };

    const initializeChangeForm = () => {
        if (!currentAssignment) {
            changeForm.reset();

            return;
        }

        changeForm.setData({
            incharge_id: currentAssignment.incharge_id
                ? String(currentAssignment.incharge_id)
                : '',
            assigned_at: '',
            assignment_reason: '',
            removal_reason: '',
            remarks: '',
        });
    };

    const closeAssign = () => {
        setDialogMode(null);
        assignForm.reset();
        clearAssignErrors();
    };

    const closeChange = () => {
        setDialogMode(null);
        changeForm.reset();
        clearChangeErrors();
    };

    const closeRemove = () => {
        setDialogMode(null);
        removeForm.reset();
        clearRemoveErrors();
    };

    const openAssign = () => {
        setDialogMode('assign');
        assignForm.reset();
        assignForm.clearErrors();
        clearAssignErrors();
    };

    const selectedAssignIncharge = incharges.find(
        (incharge) => String(incharge.id) === assignForm.data.incharge_id,
    );
    const selectedChangeIncharge = incharges.find(
        (incharge) => String(incharge.id) === changeForm.data.incharge_id,
    );
    const inchargeItems: ComboboxItem[] = incharges.map((incharge) => ({
        value: String(incharge.id),
        label: inchargeLabel(incharge),
        badge: incharge.rank ?? undefined,
    }));

    const openChange = () => {
        setDialogMode('change');
        initializeChangeForm();
        clearChangeErrors();
    };

    const openRemove = () => {
        setDialogMode('remove');
        removeForm.reset();
        clearRemoveErrors();
    };

    const handleReloadAfterSubmit = async () => {
        await router.reload({
            only: ['team', 'inchargeHistory'],
        });
    };

    const handleAssignSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearAssignErrors();

        setDialogMode('assign');

        assignForm.post(storeTeamIncharge.url(teamId), {
            errorBag: 'assignIncharge',
            preserveScroll: true,
            onError: (errors) => {
                const nextErrors = collectBagErrors(errors, 'assignIncharge');

                setAssignServerErrors(
                    Object.keys(nextErrors).length > 0
                        ? nextErrors
                        : {
                              team: t(
                                  'Unable to save the team prabhari record.',
                              ),
                          },
                );
                setDialogMode('assign');
            },
            onSuccess: async () => {
                try {
                    await handleReloadAfterSubmit();
                    closeAssign();
                } catch {
                    setAssignServerErrors({
                        team: t('Unable to refresh the team after save.'),
                    });
                    setDialogMode('assign');
                }
            },
        });
    };

    const handleChangeSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearChangeErrors();

        setDialogMode('change');

        changeForm.patch(updateTeamIncharge.url(teamId), {
            errorBag: 'changeIncharge',
            preserveScroll: true,
            onError: (errors) => {
                const nextErrors = collectBagErrors(errors, 'changeIncharge');

                setChangeServerErrors(
                    Object.keys(nextErrors).length > 0
                        ? nextErrors
                        : {
                              team: t(
                                  'Unable to save the team prabhari record.',
                              ),
                          },
                );
                setDialogMode('change');
            },
            onSuccess: async () => {
                try {
                    await handleReloadAfterSubmit();
                    closeChange();
                } catch {
                    setChangeServerErrors({
                        team: t('Unable to refresh the team after save.'),
                    });
                    setDialogMode('change');
                }
            },
        });
    };

    const handleRemoveSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearRemoveErrors();

        setDialogMode('remove');

        removeForm.delete(destroyTeamIncharge.url(teamId), {
            errorBag: 'removeIncharge',
            preserveScroll: true,
            onError: (errors) => {
                const nextErrors = collectBagErrors(errors, 'removeIncharge');

                setRemoveServerErrors(
                    Object.keys(nextErrors).length > 0
                        ? nextErrors
                        : {
                              team: t(
                                  'Unable to save the team prabhari record.',
                              ),
                          },
                );
                setDialogMode('remove');
            },
            onSuccess: async () => {
                try {
                    await handleReloadAfterSubmit();
                    closeRemove();
                } catch {
                    setRemoveServerErrors({
                        team: t('Unable to refresh the team after save.'),
                    });
                    setDialogMode('remove');
                }
            },
        });
    };

    const currentHistoryCount = history.length;
    const currentIncharge = history.find((row) => row.is_current) ?? null;

    const panelActionFooter = (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
            {teamIsActive
                ? t(
                      'Use assign, change, or remove actions to keep the incharge history accurate.',
                  )
                : t(
                      'This team is inactive. No assignment actions are allowed.',
                  )}
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border bg-gradient-to-br from-card via-card/95 to-muted/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold">
                                {t('Current team prabhari')}
                            </h3>
                            <Badge
                                variant={
                                    currentAssignment ? 'default' : 'secondary'
                                }
                            >
                                {currentAssignment
                                    ? t('Assigned')
                                    : t('Unassigned')}
                            </Badge>
                        </div>

                        {currentAssignment ? (
                            <dl className="grid gap-2 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Name')}
                                    </dt>
                                    <dd className="font-medium">
                                        {currentAssignment.incharge_id ? (
                                            <Link
                                                href={InchargeController.show.url(
                                                    currentAssignment.incharge_id,
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {detailValue(
                                                    currentAssignment.full_name,
                                                )}
                                            </Link>
                                        ) : (
                                            detailValue(
                                                currentAssignment.full_name,
                                            )
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('PNO')}
                                    </dt>
                                    <dd className="font-medium">
                                        {currentAssignment.incharge_id &&
                                        currentAssignment.pno ? (
                                            <Link
                                                href={InchargeController.show.url(
                                                    currentAssignment.incharge_id,
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {detailValue(
                                                    currentAssignment.pno,
                                                )}
                                            </Link>
                                        ) : (
                                            detailValue(currentAssignment.pno)
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Rank')}
                                    </dt>
                                    <dd className="font-medium">
                                        {detailValue(currentAssignment.rank)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Mobile')}
                                    </dt>
                                    <dd className="font-medium">
                                        {detailValue(currentAssignment.mobile)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Assigned on')}
                                    </dt>
                                    <dd className="font-medium">
                                        {displayDate(
                                            currentAssignment.assigned_at,
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {teamIsActive
                                    ? t(
                                          'No incharge is assigned to this team yet.',
                                      )
                                    : t(
                                          'Inactive teams cannot receive a new incharge assignment.',
                                      )}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {currentAssignment ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={openChange}
                                    disabled={!teamIsActive}
                                >
                                    {t('Change team prabhari')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={openRemove}
                                >
                                    {t('Remove team prabhari')}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={openAssign}
                                disabled={!teamIsActive}
                            >
                                {t('Assign team prabhari')}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background/70 p-3">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                            {t('Total records')}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                            {currentHistoryCount}
                        </p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-3">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                            {t('Current team prabhari')}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            {currentIncharge
                                ? currentIncharge.full_name
                                : t('Unassigned')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-card/70 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">
                            {t('Team prabhari history')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Track every incharge assignment, replacement, and removal for this team.',
                            )}
                        </p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-14 text-center">
                                    {t('S. No.')}
                                </TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead className="w-32">
                                    {t('PNO')}
                                </TableHead>
                                <TableHead className="w-36">
                                    {t('Assigned on')}
                                </TableHead>
                                <TableHead className="w-36">
                                    {t('Removed on')}
                                </TableHead>
                                <TableHead className="w-40">
                                    {t('Assigned by')}
                                </TableHead>
                                <TableHead className="w-40">
                                    {t('Removed by')}
                                </TableHead>
                                <TableHead className="w-28">
                                    {t('Status')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="py-10 text-center text-sm text-muted-foreground"
                                    >
                                        {t(
                                            'No team prabhari history recorded yet.',
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {row.incharge_id ? (
                                                    <Link
                                                        href={InchargeController.show.url(
                                                            row.incharge_id,
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        {detailValue(
                                                            row.full_name,
                                                        )}
                                                    </Link>
                                                ) : (
                                                    detailValue(row.full_name)
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {row.rank}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {row.incharge_id && row.pno ? (
                                                <Link
                                                    href={InchargeController.show.url(
                                                        row.incharge_id,
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    {detailValue(row.pno)}
                                                </Link>
                                            ) : (
                                                detailValue(row.pno)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {displayDate(row.assigned_at)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {displayDate(row.removed_at)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {row.assigned_by?.name ?? ''}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {row.removed_by?.name ?? ''}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.is_current
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {row.is_current
                                                    ? t('Current')
                                                    : t('Past')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {panelActionFooter}

            <Dialog
                open={dialogMode === 'assign'}
                onOpenChange={(open) => {
                    if (!open && !assignForm.processing) {
                        closeAssign();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('Assign team prabhari')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Provide official incharge details for this team.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-5" onSubmit={handleAssignSubmit}>
                        <InputError
                            message={fieldMessage(
                                assignForm.errors,
                                pageAssignErrors,
                                assignServerErrors,
                                'team',
                            )}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="assign-incharge">
                                {t('Team Prabhari')}
                            </Label>
                            <Combobox
                                id="assign-incharge"
                                value={assignForm.data.incharge_id}
                                onValueChange={(value) => {
                                    assignForm.setData('incharge_id', value);
                                    assignForm.clearErrors('incharge_id');
                                }}
                                items={inchargeItems}
                                placeholder={t('Select team prabhari')}
                                searchPlaceholder={t(
                                    'Search team prabhari by name, PNO, or rank',
                                )}
                                emptyMessage={t('No team prabhari found.')}
                            />
                            <InputError
                                message={fieldMessage(
                                    assignForm.errors,
                                    pageAssignErrors,
                                    assignServerErrors,
                                    'incharge_id',
                                )}
                            />
                        </div>
                        {selectedAssignIncharge ? (
                            <InchargeSnapshot
                                incharge={selectedAssignIncharge}
                            />
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="assign-assigned-at">
                                    {t('Assigned on')}
                                </Label>
                                <DatePicker
                                    id="assign-assigned-at"
                                    value={assignForm.data.assigned_at}
                                    onChange={(value) => {
                                        assignForm.setData(
                                            'assigned_at',
                                            value,
                                        );
                                        assignForm.clearErrors('assigned_at');
                                    }}
                                    placeholder={t('Select date')}
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'assigned_at',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-reason">
                                    {t('Assignment reason')}
                                </Label>
                                <Input
                                    id="assign-reason"
                                    value={assignForm.data.assignment_reason}
                                    onChange={(event) =>
                                        assignForm.setData(
                                            'assignment_reason',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'assignment_reason',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="assign-remarks">
                                    {t('Remarks')}
                                </Label>
                                <Input
                                    id="assign-remarks"
                                    value={assignForm.data.remarks}
                                    onChange={(event) =>
                                        assignForm.setData(
                                            'remarks',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'remarks',
                                    )}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeAssign}
                                disabled={assignForm.processing}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={assignForm.processing}
                            >
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={dialogMode === 'change'}
                onOpenChange={(open) => {
                    if (!open && !changeForm.processing) {
                        closeChange();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('Change team prabhari')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Update this team prabhari record and keep history.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-5" onSubmit={handleChangeSubmit}>
                        <InputError
                            message={fieldMessage(
                                changeForm.errors,
                                pageChangeErrors,
                                changeServerErrors,
                                'team',
                            )}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="change-incharge">
                                {t('Team Prabhari')}
                            </Label>
                            <Combobox
                                id="change-incharge"
                                value={changeForm.data.incharge_id}
                                onValueChange={(value) => {
                                    changeForm.setData('incharge_id', value);
                                    changeForm.clearErrors('incharge_id');
                                }}
                                items={inchargeItems}
                                placeholder={t('Select team prabhari')}
                                searchPlaceholder={t(
                                    'Search team prabhari by name, PNO, or rank',
                                )}
                                emptyMessage={t('No team prabhari found.')}
                            />
                            <InputError
                                message={fieldMessage(
                                    changeForm.errors,
                                    pageChangeErrors,
                                    changeServerErrors,
                                    'incharge_id',
                                )}
                            />
                        </div>
                        {selectedChangeIncharge ? (
                            <InchargeSnapshot
                                incharge={selectedChangeIncharge}
                            />
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="change-assigned-at">
                                    {t('Change effective on')}
                                </Label>
                                <DatePicker
                                    id="change-assigned-at"
                                    value={changeForm.data.assigned_at}
                                    onChange={(value) => {
                                        changeForm.setData(
                                            'assigned_at',
                                            value,
                                        );
                                        changeForm.clearErrors('assigned_at');
                                    }}
                                    placeholder={t('Select date')}
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'assigned_at',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-assignment-reason">
                                    {t('Assignment reason')}
                                </Label>
                                <Input
                                    id="change-assignment-reason"
                                    value={changeForm.data.assignment_reason}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'assignment_reason',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'assignment_reason',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-removal-reason">
                                    {t('Removal reason')}
                                </Label>
                                <Input
                                    id="change-removal-reason"
                                    value={changeForm.data.removal_reason}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'removal_reason',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'removal_reason',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-remarks">
                                    {t('Remarks')}
                                </Label>
                                <Input
                                    id="change-remarks"
                                    value={changeForm.data.remarks}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'remarks',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'remarks',
                                    )}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeChange}
                                disabled={changeForm.processing}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={changeForm.processing}
                            >
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={dialogMode === 'remove'}
                onOpenChange={(open) => {
                    if (!open && !removeForm.processing) {
                        closeRemove();
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Remove team prabhari')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Remove the active incharge with a removal reason and date.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-5" onSubmit={handleRemoveSubmit}>
                        <InputError
                            message={fieldMessage(
                                removeForm.errors,
                                pageRemoveErrors,
                                removeServerErrors,
                                'team',
                            )}
                        />
                        {currentAssignment ? (
                            <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                <p className="text-sm font-medium">
                                    {currentAssignment.incharge_id ? (
                                        <Link
                                            href={InchargeController.show.url(
                                                currentAssignment.incharge_id,
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {currentAssignment.full_name}
                                        </Link>
                                    ) : (
                                        currentAssignment.full_name
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {[currentAssignment.pno, currentAssignment.rank]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="remove-removed-at">
                                    {t('Removed on')}
                                </Label>
                                <DatePicker
                                    id="remove-removed-at"
                                    value={removeForm.data.removed_at}
                                    onChange={(value) => {
                                        removeForm.setData('removed_at', value);
                                        removeForm.clearErrors('removed_at');
                                    }}
                                    placeholder={t('Select date')}
                                />
                                <InputError
                                    message={fieldMessage(
                                        removeForm.errors,
                                        pageRemoveErrors,
                                        removeServerErrors,
                                        'removed_at',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="remove-removal-reason">
                                    {t('Removal reason')}
                                </Label>
                                <Input
                                    id="remove-removal-reason"
                                    value={removeForm.data.removal_reason}
                                    onChange={(event) =>
                                        removeForm.setData(
                                            'removal_reason',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        removeForm.errors,
                                        pageRemoveErrors,
                                        removeServerErrors,
                                        'removal_reason',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="remove-remarks">
                                    {t('Remarks')}
                                </Label>
                                <Input
                                    id="remove-remarks"
                                    value={removeForm.data.remarks}
                                    onChange={(event) =>
                                        removeForm.setData(
                                            'remarks',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        removeForm.errors,
                                        pageRemoveErrors,
                                        removeServerErrors,
                                        'remarks',
                                    )}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeRemove}
                                disabled={removeForm.processing}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={removeForm.processing}
                            >
                                {t('Confirm')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
