import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    destroy as destroyTeamIncharge,
    store as storeTeamIncharge,
    update as updateTeamIncharge,
} from '@/actions/App/Http/Controllers/TeamInchargeController';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    full_name: string;
    pno: string | null;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    assigned_at: string | null;
    assignment_reason: string | null;
    remarks: string | null;
} | null;

type HistoryRow = {
    id: number;
    full_name: string;
    pno: string | null;
    rank: string | null;
    designation: string | null;
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

type MasterOption = {
    code: string;
    name: string;
    short_name: string | null;
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

const OTHER_OPTION = '__other__';

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

function masterLabel(option: MasterOption): string {
    return option.short_name
        ? `${option.short_name} - ${option.name}`
        : option.name;
}

function resolveMasterSelection(
    value: string,
    options: MasterOption[],
): string {
    if (!value) {
        return '';
    }

    const match = options.find(
        (option) =>
            option.code === value ||
            option.name === value ||
            option.short_name === value,
    );

    return match ? match.code : OTHER_OPTION;
}

function selectedMasterValue(selection: string, customValue: string): string {
    return selection === OTHER_OPTION ? customValue : selection;
}

function detailValue(value: string | null | undefined): string {
    return value && value.length > 0 ? value : '—';
}

export function TeamInchargePanel({
    teamId,
    teamIsActive,
    currentAssignment,
    history = [],
    ranks,
    designations,
}: {
    teamId: number;
    teamIsActive: boolean;
    currentAssignment: CurrentAssignment;
    history?: HistoryRow[];
    ranks: MasterOption[];
    designations: MasterOption[];
}) {
    const { t } = useTranslation();
    const page = usePage<{ errors?: InchargeErrors }>();
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [assignServerErrors, setAssignServerErrors] = useState<ErrorMap>({});
    const [changeServerErrors, setChangeServerErrors] = useState<ErrorMap>({});
    const [removeServerErrors, setRemoveServerErrors] = useState<ErrorMap>({});
    const [assignRankSelection, setAssignRankSelection] = useState('');
    const [assignRankCustom, setAssignRankCustom] = useState('');
    const [assignDesignationSelection, setAssignDesignationSelection] =
        useState('');
    const [assignDesignationCustom, setAssignDesignationCustom] = useState('');
    const [changeRankSelection, setChangeRankSelection] = useState('');
    const [changeRankCustom, setChangeRankCustom] = useState('');
    const [changeDesignationSelection, setChangeDesignationSelection] =
        useState('');
    const [changeDesignationCustom, setChangeDesignationCustom] = useState('');

    const assignForm = useForm({
        full_name: '',
        pno: '',
        rank: '',
        designation: '',
        mobile: '',
        email: '',
        assigned_at: '',
        assignment_reason: '',
        remarks: '',
    });

    const changeForm = useForm({
        full_name: '',
        pno: '',
        rank: '',
        designation: '',
        mobile: '',
        email: '',
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
            full_name: currentAssignment.full_name ?? '',
            pno: currentAssignment.pno ?? '',
            rank: currentAssignment.rank ?? '',
            designation: currentAssignment.designation ?? '',
            mobile: currentAssignment.mobile ?? '',
            email: currentAssignment.email ?? '',
            assigned_at: '',
            assignment_reason: '',
            removal_reason: '',
            remarks: '',
        });

        const resolvedRank = resolveMasterSelection(
            currentAssignment.rank ?? '',
            ranks,
        );
        const resolvedDesignation = resolveMasterSelection(
            currentAssignment.designation ?? '',
            designations,
        );

        setChangeRankSelection(resolvedRank);
        setChangeDesignationSelection(resolvedDesignation);
        setChangeRankCustom(
            resolvedRank === OTHER_OPTION ? (currentAssignment.rank ?? '') : '',
        );
        setChangeDesignationCustom(
            resolvedDesignation === OTHER_OPTION
                ? (currentAssignment.designation ?? '')
                : '',
        );
    };

    const closeAssign = () => {
        setDialogMode(null);
        assignForm.reset();
        setAssignRankSelection('');
        setAssignRankCustom('');
        setAssignDesignationSelection('');
        setAssignDesignationCustom('');
        clearAssignErrors();
    };

    const closeChange = () => {
        setDialogMode(null);
        changeForm.reset();
        setChangeRankSelection('');
        setChangeRankCustom('');
        setChangeDesignationSelection('');
        setChangeDesignationCustom('');
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
        setAssignRankSelection('');
        setAssignRankCustom('');
        setAssignDesignationSelection('');
        setAssignDesignationCustom('');
        clearAssignErrors();
    };

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
                        : { team: t('Unable to save the incharge record.') },
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
                        : { team: t('Unable to save the incharge record.') },
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
                        : { team: t('Unable to save the incharge record.') },
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
                                {t('Current incharge')}
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
                                        {detailValue(
                                            currentAssignment.full_name,
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('PNO')}
                                    </dt>
                                    <dd className="font-medium">
                                        {detailValue(currentAssignment.pno)}
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
                                        {t('Designation')}
                                    </dt>
                                    <dd className="font-medium">
                                        {detailValue(
                                            currentAssignment.designation,
                                        )}
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
                                        {detailValue(
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
                                    {t('Change incharge')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={openRemove}
                                >
                                    {t('Remove incharge')}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={openAssign}
                                disabled={!teamIsActive}
                            >
                                {t('Assign incharge')}
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
                            {t('Current incharge')}
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
                            {t('Incharge history')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Track every incharge assignment, replacement, and removal for this team.',
                            )}
                        </p>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Name')}</TableHead>
                            <TableHead>{t('PNO')}</TableHead>
                            <TableHead>{t('Assigned on')}</TableHead>
                            <TableHead>{t('Removed on')}</TableHead>
                            <TableHead>{t('Assigned by')}</TableHead>
                            <TableHead>{t('Removed by')}</TableHead>
                            <TableHead>{t('Status')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="py-10 text-center text-sm text-muted-foreground"
                                >
                                    {t('No incharge history recorded yet.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            history.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {detailValue(row.full_name)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {[row.rank, row.designation]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {detailValue(row.pno)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {detailValue(row.assigned_at)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {detailValue(row.removed_at)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {row.assigned_by?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {row.removed_by?.name ?? '—'}
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

            {panelActionFooter}

            <Dialog
                open={dialogMode === 'assign'}
                onOpenChange={(open) => {
                    if (!open && !assignForm.processing) {
                        closeAssign();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Assign incharge')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Provide official incharge details for this team.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleAssignSubmit}>
                        <InputError
                            message={fieldMessage(
                                assignForm.errors,
                                pageAssignErrors,
                                assignServerErrors,
                                'team',
                            )}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="assign-full-name">
                                {t('Officer name')}
                            </Label>
                            <Input
                                id="assign-full-name"
                                value={assignForm.data.full_name}
                                onChange={(event) =>
                                    assignForm.setData(
                                        'full_name',
                                        event.target.value,
                                    )
                                }
                                onFocus={() =>
                                    assignForm.clearErrors('full_name')
                                }
                                required
                            />
                            <InputError
                                message={fieldMessage(
                                    assignForm.errors,
                                    pageAssignErrors,
                                    assignServerErrors,
                                    'full_name',
                                )}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="assign-pno">{t('PNO')}</Label>
                                <Input
                                    id="assign-pno"
                                    value={assignForm.data.pno}
                                    onChange={(event) =>
                                        assignForm.setData(
                                            'pno',
                                            event.target.value,
                                        )
                                    }
                                    onFocus={() =>
                                        assignForm.clearErrors('pno')
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'pno',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-rank">{t('Rank')}</Label>
                                <Select
                                    value={assignRankSelection}
                                    onValueChange={(value) => {
                                        setAssignRankSelection(value);

                                        if (value === OTHER_OPTION) {
                                            assignForm.setData(
                                                'rank',
                                                assignRankCustom,
                                            );

                                            return;
                                        }

                                        setAssignRankCustom('');
                                        assignForm.setData(
                                            'rank',
                                            selectedMasterValue(
                                                value,
                                                assignRankCustom,
                                            ),
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        id="assign-rank"
                                        className="h-9 w-full"
                                    >
                                        <SelectValue
                                            placeholder={t('Select rank')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ranks.map((rank) => (
                                            <SelectItem
                                                key={rank.code}
                                                value={rank.code}
                                            >
                                                {masterLabel(rank)}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={OTHER_OPTION}>
                                            {t('Other')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {assignRankSelection === OTHER_OPTION && (
                                    <Input
                                        value={assignRankCustom}
                                        onChange={(event) => {
                                            const nextValue =
                                                event.target.value;

                                            setAssignRankCustom(nextValue);
                                            assignForm.setData(
                                                'rank',
                                                nextValue,
                                            );
                                        }}
                                        maxLength={100}
                                        placeholder={t('Enter rank')}
                                    />
                                )}
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'rank',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-designation">
                                    {t('Designation')}
                                </Label>
                                <Select
                                    value={assignDesignationSelection}
                                    onValueChange={(value) => {
                                        setAssignDesignationSelection(value);

                                        if (value === OTHER_OPTION) {
                                            assignForm.setData(
                                                'designation',
                                                assignDesignationCustom,
                                            );

                                            return;
                                        }

                                        setAssignDesignationCustom('');
                                        assignForm.setData(
                                            'designation',
                                            selectedMasterValue(
                                                value,
                                                assignDesignationCustom,
                                            ),
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        id="assign-designation"
                                        className="h-9 w-full"
                                    >
                                        <SelectValue
                                            placeholder={t(
                                                'Select designation',
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {designations.map((designation) => (
                                            <SelectItem
                                                key={designation.code}
                                                value={designation.code}
                                            >
                                                {masterLabel(designation)}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={OTHER_OPTION}>
                                            {t('Other')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {assignDesignationSelection ===
                                    OTHER_OPTION && (
                                    <Input
                                        value={assignDesignationCustom}
                                        onChange={(event) => {
                                            const nextValue =
                                                event.target.value;

                                            setAssignDesignationCustom(
                                                nextValue,
                                            );
                                            assignForm.setData(
                                                'designation',
                                                nextValue,
                                            );
                                        }}
                                        maxLength={100}
                                        placeholder={t('Enter designation')}
                                    />
                                )}
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'designation',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-mobile">
                                    {t('Mobile')}
                                </Label>
                                <Input
                                    id="assign-mobile"
                                    value={assignForm.data.mobile}
                                    onChange={(event) =>
                                        assignForm.setData(
                                            'mobile',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'mobile',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="assign-email">
                                    {t('Email')}
                                </Label>
                                <Input
                                    id="assign-email"
                                    type="email"
                                    value={assignForm.data.email}
                                    onChange={(event) =>
                                        assignForm.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        assignForm.errors,
                                        pageAssignErrors,
                                        assignServerErrors,
                                        'email',
                                    )}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assign-assigned-at">
                                {t('Assigned on')}
                            </Label>
                            <Input
                                id="assign-assigned-at"
                                type="datetime-local"
                                value={assignForm.data.assigned_at}
                                onChange={(event) =>
                                    assignForm.setData(
                                        'assigned_at',
                                        event.target.value,
                                    )
                                }
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
                        <div className="grid gap-2">
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Change incharge')}</DialogTitle>
                        <DialogDescription>
                            {t('Update this incharge record and keep history.')}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleChangeSubmit}>
                        <InputError
                            message={fieldMessage(
                                changeForm.errors,
                                pageChangeErrors,
                                changeServerErrors,
                                'team',
                            )}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="change-full-name">
                                {t('Officer name')}
                            </Label>
                            <Input
                                id="change-full-name"
                                value={changeForm.data.full_name}
                                onChange={(event) =>
                                    changeForm.setData(
                                        'full_name',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={fieldMessage(
                                    changeForm.errors,
                                    pageChangeErrors,
                                    changeServerErrors,
                                    'full_name',
                                )}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="change-pno">{t('PNO')}</Label>
                                <Input
                                    id="change-pno"
                                    value={changeForm.data.pno}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'pno',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'pno',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-rank">{t('Rank')}</Label>
                                <Select
                                    value={changeRankSelection}
                                    onValueChange={(value) => {
                                        setChangeRankSelection(value);

                                        if (value === OTHER_OPTION) {
                                            changeForm.setData(
                                                'rank',
                                                changeRankCustom,
                                            );

                                            return;
                                        }

                                        setChangeRankCustom('');
                                        changeForm.setData(
                                            'rank',
                                            selectedMasterValue(
                                                value,
                                                changeRankCustom,
                                            ),
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        id="change-rank"
                                        className="h-9 w-full"
                                    >
                                        <SelectValue
                                            placeholder={t('Select rank')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ranks.map((rank) => (
                                            <SelectItem
                                                key={rank.code}
                                                value={rank.code}
                                            >
                                                {masterLabel(rank)}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={OTHER_OPTION}>
                                            {t('Other')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {changeRankSelection === OTHER_OPTION && (
                                    <Input
                                        value={changeRankCustom}
                                        onChange={(event) => {
                                            const nextValue =
                                                event.target.value;

                                            setChangeRankCustom(nextValue);
                                            changeForm.setData(
                                                'rank',
                                                nextValue,
                                            );
                                        }}
                                        maxLength={100}
                                        placeholder={t('Enter rank')}
                                    />
                                )}
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'rank',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-designation">
                                    {t('Designation')}
                                </Label>
                                <Select
                                    value={changeDesignationSelection}
                                    onValueChange={(value) => {
                                        setChangeDesignationSelection(value);

                                        if (value === OTHER_OPTION) {
                                            changeForm.setData(
                                                'designation',
                                                changeDesignationCustom,
                                            );

                                            return;
                                        }

                                        setChangeDesignationCustom('');
                                        changeForm.setData(
                                            'designation',
                                            selectedMasterValue(
                                                value,
                                                changeDesignationCustom,
                                            ),
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        id="change-designation"
                                        className="h-9 w-full"
                                    >
                                        <SelectValue
                                            placeholder={t(
                                                'Select designation',
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {designations.map((designation) => (
                                            <SelectItem
                                                key={designation.code}
                                                value={designation.code}
                                            >
                                                {masterLabel(designation)}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={OTHER_OPTION}>
                                            {t('Other')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {changeDesignationSelection ===
                                    OTHER_OPTION && (
                                    <Input
                                        value={changeDesignationCustom}
                                        onChange={(event) => {
                                            const nextValue =
                                                event.target.value;

                                            setChangeDesignationCustom(
                                                nextValue,
                                            );
                                            changeForm.setData(
                                                'designation',
                                                nextValue,
                                            );
                                        }}
                                        maxLength={100}
                                        placeholder={t('Enter designation')}
                                    />
                                )}
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'designation',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-mobile">
                                    {t('Mobile')}
                                </Label>
                                <Input
                                    id="change-mobile"
                                    value={changeForm.data.mobile}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'mobile',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'mobile',
                                    )}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="change-email">
                                    {t('Email')}
                                </Label>
                                <Input
                                    id="change-email"
                                    type="email"
                                    value={changeForm.data.email}
                                    onChange={(event) =>
                                        changeForm.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={fieldMessage(
                                        changeForm.errors,
                                        pageChangeErrors,
                                        changeServerErrors,
                                        'email',
                                    )}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="change-assigned-at">
                                {t('Change effective on')}
                            </Label>
                            <Input
                                id="change-assigned-at"
                                type="datetime-local"
                                value={changeForm.data.assigned_at}
                                onChange={(event) =>
                                    changeForm.setData(
                                        'assigned_at',
                                        event.target.value,
                                    )
                                }
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Remove incharge')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Remove the active incharge with a removal reason and date.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleRemoveSubmit}>
                        <InputError
                            message={fieldMessage(
                                removeForm.errors,
                                pageRemoveErrors,
                                removeServerErrors,
                                'team',
                            )}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="remove-removed-at">
                                {t('Removed on')}
                            </Label>
                            <Input
                                id="remove-removed-at"
                                type="datetime-local"
                                value={removeForm.data.removed_at}
                                onChange={(event) =>
                                    removeForm.setData(
                                        'removed_at',
                                        event.target.value,
                                    )
                                }
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
                        <div className="grid gap-2">
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
