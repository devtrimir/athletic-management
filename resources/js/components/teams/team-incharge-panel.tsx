import { useForm, usePage, useRemember } from '@inertiajs/react';
import { useEffect } from 'react';
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

function detailValue(value: string | null | undefined): string {
    return value && value.length > 0 ? value : '—';
}

export function TeamInchargePanel({
    teamId,
    teamIsActive,
    currentAssignment,
    history = [],
}: {
    teamId: number;
    teamIsActive: boolean;
    currentAssignment: CurrentAssignment;
    history?: HistoryRow[];
}) {
    const { t } = useTranslation();
    const page = usePage<{ errors?: Record<string, string> }>();
    const pageErrors = page.props.errors;
    const [assignOpen, setAssignOpen] = useRemember(
        false,
        `teams.${teamId}.incharge.assign-open`,
    );
    const [changeOpen, setChangeOpen] = useRemember(
        false,
        `teams.${teamId}.incharge.change-open`,
    );
    const [removeOpen, setRemoveOpen] = useRemember(
        false,
        `teams.${teamId}.incharge.remove-open`,
    );

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

    const closeAssign = () => {
        setAssignOpen(false);
        assignForm.reset();
        assignForm.clearErrors();
    };

    const closeChange = () => {
        setChangeOpen(false);
        changeForm.reset();
        changeForm.clearErrors();
    };

    const closeRemove = () => {
        setRemoveOpen(false);
        removeForm.reset();
        removeForm.clearErrors();
    };

    useEffect(() => {
        if (Object.keys(assignForm.errors).length > 0) {
            setAssignOpen(true);
        }
    }, [assignForm.errors, setAssignOpen]);

    useEffect(() => {
        if (
            pageErrors?.full_name ||
            pageErrors?.pno ||
            pageErrors?.rank ||
            pageErrors?.designation ||
            pageErrors?.mobile ||
            pageErrors?.email ||
            pageErrors?.assigned_at ||
            pageErrors?.assignment_reason ||
            pageErrors?.team
        ) {
            setAssignOpen(true);
        }
    }, [pageErrors, setAssignOpen]);

    useEffect(() => {
        if (Object.keys(changeForm.errors).length > 0) {
            setChangeOpen(true);
        }
    }, [changeForm.errors, setChangeOpen]);

    useEffect(() => {
        if (
            pageErrors?.full_name ||
            pageErrors?.pno ||
            pageErrors?.rank ||
            pageErrors?.designation ||
            pageErrors?.mobile ||
            pageErrors?.email ||
            pageErrors?.assigned_at ||
            pageErrors?.assignment_reason ||
            pageErrors?.removal_reason ||
            pageErrors?.team
        ) {
            setChangeOpen(true);
        }
    }, [pageErrors, setChangeOpen]);

    useEffect(() => {
        if (Object.keys(removeForm.errors).length > 0) {
            setRemoveOpen(true);
        }
    }, [removeForm.errors, setRemoveOpen]);

    useEffect(() => {
        if (pageErrors?.removed_at || pageErrors?.removal_reason || pageErrors?.team) {
            setRemoveOpen(true);
        }
    }, [pageErrors, setRemoveOpen]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-5">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">
                            {t('Current incharge')}
                        </h3>
                        <Badge variant={currentAssignment ? 'default' : 'secondary'}>
                            {currentAssignment ? t('Assigned') : t('Unassigned')}
                        </Badge>
                    </div>

                    {currentAssignment ? (
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">{t('Name')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.full_name)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('PNO')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.pno)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('Rank')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.rank)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('Designation')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.designation)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('Mobile')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.mobile)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('Assigned on')}</dt>
                                <dd className="font-medium">{detailValue(currentAssignment.assigned_at)}</dd>
                            </div>
                        </dl>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {teamIsActive
                                ? t('No incharge is assigned to this team yet.')
                                : t('Inactive teams cannot receive a new incharge assignment.')}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {currentAssignment ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setChangeOpen(true)}
                                disabled={!teamIsActive}
                            >
                                {t('Change incharge')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setRemoveOpen(true)}
                            >
                                {t('Remove incharge')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={() => setAssignOpen(true)}
                            disabled={!teamIsActive}
                        >
                            {t('Assign incharge')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">{t('Incharge history')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('Track every incharge assignment, replacement, and removal for this team.')}
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
                                        <div className="font-medium">{row.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {[row.rank, row.designation].filter(Boolean).join(' · ') || '—'}
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
                                        <Badge variant={row.is_current ? 'default' : 'secondary'}>
                                            {row.is_current ? t('Current') : t('Past')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={assignOpen} onOpenChange={(open) => (!open ? closeAssign() : setAssignOpen(true))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Assign incharge')}</DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            assignForm.post(storeTeamIncharge.url(teamId), {
                                onError: () => setAssignOpen(true),
                                onSuccess: () => closeAssign(),
                            });
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="assign-full-name">{t('Officer name')}</Label>
                            <Input
                                id="assign-full-name"
                                value={assignForm.data.full_name}
                                onChange={(event) => assignForm.setData('full_name', event.target.value)}
                            />
                            <InputError message={assignForm.errors.full_name ?? pageErrors?.full_name} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="assign-pno">{t('PNO')}</Label>
                                <Input
                                    id="assign-pno"
                                    value={assignForm.data.pno}
                                    onChange={(event) => assignForm.setData('pno', event.target.value)}
                                />
                                <InputError message={assignForm.errors.pno ?? pageErrors?.pno} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-rank">{t('Rank')}</Label>
                                <Input
                                    id="assign-rank"
                                    value={assignForm.data.rank}
                                    onChange={(event) => assignForm.setData('rank', event.target.value)}
                                />
                                <InputError message={assignForm.errors.rank ?? pageErrors?.rank} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-designation">{t('Designation')}</Label>
                                <Input
                                    id="assign-designation"
                                    value={assignForm.data.designation}
                                    onChange={(event) => assignForm.setData('designation', event.target.value)}
                                />
                                <InputError message={assignForm.errors.designation ?? pageErrors?.designation} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-mobile">{t('Mobile')}</Label>
                                <Input
                                    id="assign-mobile"
                                    value={assignForm.data.mobile}
                                    onChange={(event) => assignForm.setData('mobile', event.target.value)}
                                />
                                <InputError message={assignForm.errors.mobile ?? pageErrors?.mobile} />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="assign-email">{t('Email')}</Label>
                                <Input
                                    id="assign-email"
                                    type="email"
                                    value={assignForm.data.email}
                                    onChange={(event) => assignForm.setData('email', event.target.value)}
                                />
                                <InputError message={assignForm.errors.email ?? pageErrors?.email} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assign-assigned-at">{t('Assigned on')}</Label>
                            <Input
                                id="assign-assigned-at"
                                type="datetime-local"
                                value={assignForm.data.assigned_at}
                                onChange={(event) => assignForm.setData('assigned_at', event.target.value)}
                            />
                            <InputError message={assignForm.errors.assigned_at ?? pageErrors?.assigned_at} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assign-reason">{t('Assignment reason')}</Label>
                            <Input
                                id="assign-reason"
                                value={assignForm.data.assignment_reason}
                                onChange={(event) => assignForm.setData('assignment_reason', event.target.value)}
                            />
                            <InputError message={assignForm.errors.assignment_reason ?? pageErrors?.assignment_reason} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assign-remarks">{t('Remarks')}</Label>
                            <Input
                                id="assign-remarks"
                                value={assignForm.data.remarks}
                                onChange={(event) => assignForm.setData('remarks', event.target.value)}
                            />
                            <InputError message={assignForm.errors.remarks ?? pageErrors?.remarks} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeAssign}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={assignForm.processing}>
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={changeOpen} onOpenChange={(open) => (!open ? closeChange() : setChangeOpen(true))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Change incharge')}</DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            changeForm.patch(updateTeamIncharge.url(teamId), {
                                onError: () => setChangeOpen(true),
                                onSuccess: () => closeChange(),
                            });
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="change-full-name">{t('Officer name')}</Label>
                            <Input
                                id="change-full-name"
                                value={changeForm.data.full_name}
                                onChange={(event) => changeForm.setData('full_name', event.target.value)}
                            />
                            <InputError message={changeForm.errors.full_name ?? pageErrors?.full_name} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="change-pno">{t('PNO')}</Label>
                                <Input
                                    id="change-pno"
                                    value={changeForm.data.pno}
                                    onChange={(event) => changeForm.setData('pno', event.target.value)}
                                />
                                <InputError message={changeForm.errors.pno ?? pageErrors?.pno} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-rank">{t('Rank')}</Label>
                                <Input
                                    id="change-rank"
                                    value={changeForm.data.rank}
                                    onChange={(event) => changeForm.setData('rank', event.target.value)}
                                />
                                <InputError message={changeForm.errors.rank ?? pageErrors?.rank} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-designation">{t('Designation')}</Label>
                                <Input
                                    id="change-designation"
                                    value={changeForm.data.designation}
                                    onChange={(event) => changeForm.setData('designation', event.target.value)}
                                />
                                <InputError message={changeForm.errors.designation ?? pageErrors?.designation} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="change-mobile">{t('Mobile')}</Label>
                                <Input
                                    id="change-mobile"
                                    value={changeForm.data.mobile}
                                    onChange={(event) => changeForm.setData('mobile', event.target.value)}
                                />
                                <InputError message={changeForm.errors.mobile ?? pageErrors?.mobile} />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="change-email">{t('Email')}</Label>
                                <Input
                                    id="change-email"
                                    type="email"
                                    value={changeForm.data.email}
                                    onChange={(event) => changeForm.setData('email', event.target.value)}
                                />
                                <InputError message={changeForm.errors.email ?? pageErrors?.email} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="change-assigned-at">{t('Change effective on')}</Label>
                            <Input
                                id="change-assigned-at"
                                type="datetime-local"
                                value={changeForm.data.assigned_at}
                                onChange={(event) => changeForm.setData('assigned_at', event.target.value)}
                            />
                            <InputError message={changeForm.errors.assigned_at ?? pageErrors?.assigned_at} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="change-assignment-reason">{t('Assignment reason')}</Label>
                            <Input
                                id="change-assignment-reason"
                                value={changeForm.data.assignment_reason}
                                onChange={(event) => changeForm.setData('assignment_reason', event.target.value)}
                            />
                            <InputError message={changeForm.errors.assignment_reason ?? pageErrors?.assignment_reason} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="change-removal-reason">{t('Removal reason')}</Label>
                            <Input
                                id="change-removal-reason"
                                value={changeForm.data.removal_reason}
                                onChange={(event) => changeForm.setData('removal_reason', event.target.value)}
                            />
                            <InputError message={changeForm.errors.removal_reason ?? pageErrors?.removal_reason} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="change-remarks">{t('Remarks')}</Label>
                            <Input
                                id="change-remarks"
                                value={changeForm.data.remarks}
                                onChange={(event) => changeForm.setData('remarks', event.target.value)}
                            />
                            <InputError message={changeForm.errors.remarks ?? pageErrors?.remarks} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeChange}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={changeForm.processing}>
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={removeOpen} onOpenChange={(open) => (!open ? closeRemove() : setRemoveOpen(true))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Remove incharge')}</DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            removeForm.delete(destroyTeamIncharge.url(teamId), {
                                onError: () => setRemoveOpen(true),
                                onSuccess: () => closeRemove(),
                            });
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="remove-removed-at">{t('Removed on')}</Label>
                            <Input
                                id="remove-removed-at"
                                type="datetime-local"
                                value={removeForm.data.removed_at}
                                onChange={(event) => removeForm.setData('removed_at', event.target.value)}
                            />
                            <InputError message={removeForm.errors.removed_at ?? pageErrors?.removed_at} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="remove-removal-reason">{t('Removal reason')}</Label>
                            <Input
                                id="remove-removal-reason"
                                value={removeForm.data.removal_reason}
                                onChange={(event) => removeForm.setData('removal_reason', event.target.value)}
                            />
                            <InputError message={removeForm.errors.removal_reason ?? pageErrors?.removal_reason} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="remove-remarks">{t('Remarks')}</Label>
                            <Input
                                id="remove-remarks"
                                value={removeForm.data.remarks}
                                onChange={(event) => removeForm.setData('remarks', event.target.value)}
                            />
                            <InputError message={removeForm.errors.remarks ?? pageErrors?.remarks} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeRemove}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="destructive" disabled={removeForm.processing}>
                                {t('Confirm')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
