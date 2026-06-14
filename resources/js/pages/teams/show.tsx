import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    Copy,
    Info,
    Pencil,
    Search,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    destroy as destroyTeamCoach,
    bulkDestroy as bulkDestroyCoaches,
} from '@/actions/App/Http/Controllers/TeamCoachController';
import {
    destroy as destroyTeam,
    edit as editTeam,
    index as teamsIndex,
} from '@/actions/App/Http/Controllers/TeamController';
import {
    destroy as destroyTeamMember,
    bulkDestroy as bulkDestroyMembers,
    store as storeTeamMember,
    update as updateTeamMember,
} from '@/actions/App/Http/Controllers/TeamMemberController';
import type { MemberOption } from '@/components/member-picker';
import { MemberQuickView } from '@/components/members/member-quick-view';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { AddCoachDialog } from '@/components/teams/add-coach-dialog';
import { AddMemberDialog } from '@/components/teams/add-member-dialog';
import { CloneTeamDialog } from '@/components/teams/clone-team-dialog';
import { CoachQuickView } from '@/components/teams/coach-quick-view';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Team = {
    id: number;
    name: string;
    in_charge: string | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
};

type TeamMemberRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    member: {
        id: number;
        full_name: string;
        member_code: string;
        pno: string | null;
    } | null;
    session: { id: number; name: string } | null;
};

type CoachAssignmentRow = {
    id: number;
    role: string | null;
    coach: { id: number; full_name: string; pno: string | null } | null;
    session: { id: number; name: string } | null;
};

type Counts = { players_count: number; coaches_count: number };
type Session = { id: number; name: string };

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;
const COACH_ROLES = ['HEAD', 'ASSISTANT'] as const;

export default function TeamsShow({
    team,
    counts,
    sessions,
    members,
    coaches,
    auditLog,
}: {
    team: Team;
    counts?: Counts;
    sessions: Session[];
    members?: TeamMemberRow[];
    coaches?: CoachAssignmentRow[];
    auditLog?: AuditEntry[];
}) {
    const { t } = useTranslation();

    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [addCoachOpen, setAddCoachOpen] = useState(false);
    const [cloneOpen, setCloneOpen] = useState(false);
    const [memberQuickViewId, setMemberQuickViewId] = useState<number | null>(
        null,
    );
    const [coachQuickViewId, setCoachQuickViewId] = useState<number | null>(
        null,
    );
    const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(
        null,
    );
    const [editMemberData, setEditMemberData] = useState({
        role: 'PLAYER',
        joined_on: '',
        left_on: '',
    });

    const [activeTab, setActiveTab] = useState('overview');
    const [highlightedMemberIds, setHighlightedMemberIds] = useState<
        Set<number>
    >(new Set());

    // Selection state for bulk remove
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(
        new Set(),
    );
    const [selectedCoachIds, setSelectedCoachIds] = useState<Set<number>>(
        new Set(),
    );

    // Filter state for Players tab
    const [memberSessionFilter, setMemberSessionFilter] = useState('');
    const [memberRoleFilter, setMemberRoleFilter] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    // Filter state for Coaches tab
    const [coachSessionFilter, setCoachSessionFilter] = useState('');
    const [coachRoleFilter, setCoachRoleFilter] = useState('');
    const [coachSearch, setCoachSearch] = useState('');

    // Confirm dialog state
    type ConfirmState = {
        open: boolean;
        title: string;
        description: string;
        confirmLabel: string;
        names: string[];
        note: string;
        onConfirm: () => void;
    };
    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: '',
        description: '',
        confirmLabel: t('Confirm'),
        names: [],
        note: '',
        onConfirm: () => {},
    });
    const pendingConfirm = useRef<(() => void) | null>(null);

    function openConfirm(
        title: string,
        description: string,
        onConfirm: () => void,
        options: {
            confirmLabel?: string;
            names?: string[];
            note?: string;
        } = {},
    ) {
        pendingConfirm.current = onConfirm;
        setConfirm({
            open: true,
            title,
            description,
            confirmLabel: options.confirmLabel ?? t('Confirm'),
            names: options.names ?? [],
            note: options.note ?? '',
            onConfirm,
        });
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: team.name },
        ],
    });

    // Keyboard shortcuts — only when not inside an input/textarea
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const mod = e.metaKey || e.ctrlKey;

            if (mod && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                setAddMemberOpen(true);
            } else if (mod && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setAddCoachOpen(true);
            } else if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setCloneOpen(true);
            }
        }
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    function highlightMembers(memberIds: number[]) {
        setHighlightedMemberIds(new Set(memberIds));

        window.setTimeout(() => {
            setHighlightedMemberIds(new Set());
        }, 6500);
    }

    function handleMembersAdded(addedMembers: MemberOption[]) {
        const count = addedMembers.length;

        setActiveTab('players');
        setSelectedMemberIds(new Set());
        highlightMembers(addedMembers.map((member) => member.id));

        window.setTimeout(() => {
            document
                .getElementById(`team-member-${addedMembers[0]?.id}`)
                ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
        }, 250);

        toast.success(
            count > 1
                ? t(':count members added to team.').replace(
                      ':count',
                      String(count),
                  )
                : t(':name added to team.').replace(
                      ':name',
                      addedMembers[0]?.full_name ?? t('Member'),
                  ),
        );
    }

    function restoreMembers(rows: TeamMemberRow[]) {
        const restoredIds = rows.flatMap((row) =>
            row.member ? [row.member.id] : [],
        );
        let restoreToastShown = false;

        rows.forEach((row) => {
            if (!row.member) {
                return;
            }

            router.post(
                storeTeamMember.url(team),
                {
                    member_ids: [String(row.member.id)],
                    role: row.role ?? 'PLAYER',
                    joined_on: row.joined_on ?? '',
                    left_on: row.left_on ?? '',
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setActiveTab('players');
                        highlightMembers(restoredIds);

                        if (!restoreToastShown) {
                            restoreToastShown = true;
                            toast.success(t('Members restored to team.'));
                        }
                    },
                },
            );
        });
    }

    function showUndoToast(rows: TeamMemberRow[]) {
        const count = rows.length;

        toast.success(
            count > 1
                ? t(':count members removed from team.').replace(
                      ':count',
                      String(count),
                  )
                : t(':name removed from team.').replace(
                      ':name',
                      rows[0]?.member?.full_name ?? t('Member'),
                  ),
            {
                action: {
                    label: t('Undo'),
                    onClick: () => restoreMembers(rows),
                },
            },
        );
    }

    function removeMember(memberId: number, memberName?: string) {
        const row = (members ?? []).find(
            (item) => item.member?.id === memberId,
        );

        openConfirm(
            t('Remove member'),
            memberName
                ? t('Remove :name from the team?').replace(':name', memberName)
                : t('Remove this member from the team?'),
            () =>
                router.delete(destroyTeamMember.url([team, memberId]), {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            next.delete(memberId);

                            return next;
                        });

                        if (row) {
                            showUndoToast([row]);
                        }
                    },
                }),
            {
                confirmLabel: t('Remove member'),
                names: memberName ? [memberName] : [],
                note: t('You can undo this removal from the success message.'),
            },
        );
    }

    function removeCoach(coachId: number, coachName?: string) {
        openConfirm(
            t('Remove coach'),
            coachName
                ? t('Remove :name from the team?').replace(':name', coachName)
                : t('Remove this coach from the team?'),
            () =>
                router.delete(destroyTeamCoach.url([team, coachId]), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(t('Coach removed from team.')),
                }),
            {
                confirmLabel: t('Remove coach'),
                names: coachName ? [coachName] : [],
            },
        );
    }

    function toggleMember(id: number) {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleAllMembers(visibleIds: number[]) {
        const allSelected = visibleIds.every((id) => selectedMemberIds.has(id));
        setSelectedMemberIds(allSelected ? new Set() : new Set(visibleIds));
    }

    function handleBulkRemoveMembers() {
        const count = selectedMemberIds.size;
        const ids = Array.from(selectedMemberIds);
        const removedRows = (members ?? []).filter(
            (row) => row.member && selectedMemberIds.has(row.member.id),
        );
        openConfirm(
            t('Remove selected (:count)').replace(':count', String(count)),
            t('Remove :count selected members from this team?').replace(
                ':count',
                String(count),
            ),
            () =>
                router.delete(bulkDestroyMembers.url(team), {
                    data: { member_ids: ids },
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedMemberIds(new Set());
                        showUndoToast(removedRows);
                    },
                }),
            {
                confirmLabel: t('Remove selected'),
                names: removedRows.flatMap((row) =>
                    row.member ? [row.member.full_name] : [],
                ),
                note: t('You can undo this removal from the success message.'),
            },
        );
    }

    function openMemberEdit(row: TeamMemberRow) {
        setEditingMember(row);
        setEditMemberData({
            role: row.role ?? 'PLAYER',
            joined_on: row.joined_on ?? '',
            left_on: row.left_on ?? '',
        });
    }

    function submitMemberEdit(e: React.FormEvent) {
        e.preventDefault();

        if (!editingMember) {
            return;
        }

        router.patch(
            updateTeamMember.url([team, editingMember]),
            editMemberData,
            {
                preserveScroll: true,
                onSuccess: () => setEditingMember(null),
            },
        );
    }

    function toggleCoach(id: number) {
        setSelectedCoachIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleAllCoaches(visibleIds: number[]) {
        const allSelected = visibleIds.every((id) => selectedCoachIds.has(id));
        setSelectedCoachIds(allSelected ? new Set() : new Set(visibleIds));
    }

    function handleBulkRemoveCoaches() {
        const count = selectedCoachIds.size;
        const ids = Array.from(selectedCoachIds);
        openConfirm(
            t('Remove selected (:count)').replace(':count', String(count)),
            t('Remove :count selected coaches?').replace(
                ':count',
                String(count),
            ),
            () =>
                router.delete(bulkDestroyCoaches.url(team), {
                    data: { coach_ids: ids },
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedCoachIds(new Set());
                        toast.success(
                            t(':count coaches removed from team.').replace(
                                ':count',
                                String(count),
                            ),
                        );
                    },
                }),
            {
                confirmLabel: t('Remove selected'),
                names: (coaches ?? []).flatMap((row) =>
                    row.coach && selectedCoachIds.has(row.coach.id)
                        ? [row.coach.full_name]
                        : [],
                ),
            },
        );
    }

    function handleDelete() {
        openConfirm(
            t('Delete this team?'),
            t(
                'This action cannot be undone. All player and coach assignments will also be removed.',
            ),
            () => router.delete(destroyTeam.url(team)),
            { confirmLabel: t('Delete') },
        );
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">
                {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );

    const tableFallback = (
        <div className="space-y-2">
            {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-10 w-full" />
            ))}
        </div>
    );

    // Derive unique session options from loaded rows for filter pills
    const memberSessions = Array.from(
        new Map(
            (members ?? [])
                .filter((r) => r.session)
                .map((r) => [r.session!.id, r.session!]),
        ).values(),
    );
    const coachSessions = Array.from(
        new Map(
            (coaches ?? [])
                .filter((r) => r.session)
                .map((r) => [r.session!.id, r.session!]),
        ).values(),
    );

    const filteredMembers = (members ?? []).filter((r) => {
        if (
            memberSessionFilter &&
            String(r.session?.id) !== memberSessionFilter
        ) {
            return false;
        }

        if (memberRoleFilter && r.role !== memberRoleFilter) {
            return false;
        }

        if (memberSearch) {
            const q = memberSearch.toLowerCase();
            const nameMatch = r.member?.full_name?.toLowerCase().includes(q);
            const pnoMatch = r.member?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !pnoMatch) {
                return false;
            }
        }

        return true;
    });

    const filteredCoaches = (coaches ?? []).filter((r) => {
        if (
            coachSessionFilter &&
            String(r.session?.id) !== coachSessionFilter
        ) {
            return false;
        }

        if (coachRoleFilter && r.role !== coachRoleFilter) {
            return false;
        }

        if (coachSearch) {
            const q = coachSearch.toLowerCase();
            const nameMatch = r.coach?.full_name?.toLowerCase().includes(q);
            const pnoMatch = r.coach?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !pnoMatch) {
                return false;
            }
        }

        return true;
    });

    const memberFiltersActive = !!(
        memberSessionFilter ||
        memberRoleFilter ||
        memberSearch
    );
    const coachFiltersActive = !!(
        coachSessionFilter ||
        coachRoleFilter ||
        coachSearch
    );

    // Checkbox derived state — members
    const memberSelectableIds = filteredMembers
        .filter((r) => r.member)
        .map((r) => r.member!.id);
    const memberAllSelected =
        memberSelectableIds.length > 0 &&
        memberSelectableIds.every((id) => selectedMemberIds.has(id));
    const memberSomeSelected =
        !memberAllSelected &&
        memberSelectableIds.some((id) => selectedMemberIds.has(id));
    const memberHeaderChecked: boolean | 'indeterminate' = memberAllSelected
        ? true
        : memberSomeSelected
          ? 'indeterminate'
          : false;

    // Checkbox derived state — coaches
    const coachSelectableIds = filteredCoaches
        .filter((r) => r.coach)
        .map((r) => r.coach!.id);
    const coachAllSelected =
        coachSelectableIds.length > 0 &&
        coachSelectableIds.every((id) => selectedCoachIds.has(id));
    const coachSomeSelected =
        !coachAllSelected &&
        coachSelectableIds.some((id) => selectedCoachIds.has(id));
    const coachHeaderChecked: boolean | 'indeterminate' = coachAllSelected
        ? true
        : coachSomeSelected
          ? 'indeterminate'
          : false;

    return (
        <>
            <Head title={team.name} />

            <AlertDialog
                open={confirm.open}
                onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
            >
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {confirm.names.length > 0 && (
                        <div className="rounded-md border bg-muted/40 p-3">
                            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t('Selected records')}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {confirm.names.slice(0, 8).map((name) => (
                                    <span
                                        key={name}
                                        className="rounded-md bg-background px-2 py-1 text-xs font-medium shadow-xs"
                                    >
                                        {name}
                                    </span>
                                ))}
                                {confirm.names.length > 8 && (
                                    <span className="rounded-md bg-background px-2 py-1 text-xs font-medium shadow-xs">
                                        {t('+ :count more').replace(
                                            ':count',
                                            String(confirm.names.length - 8),
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    {confirm.note && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            {confirm.note}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                confirm.onConfirm();
                                setConfirm((s) => ({ ...s, open: false }));
                            }}
                        >
                            {confirm.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={editingMember !== null}
                onOpenChange={(open) => !open && setEditingMember(null)}
            >
                <DialogContent
                    className="sm:max-w-md"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Edit membership')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitMemberEdit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-member-role">
                                {t('Role')}
                            </Label>
                            <Select
                                value={editMemberData.role}
                                onValueChange={(value) =>
                                    setEditMemberData((data) => ({
                                        ...data,
                                        role: value,
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="edit-member-role"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEMBER_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {t(role)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-member-joined">
                                    {t('Joined on')}
                                </Label>
                                <Input
                                    id="edit-member-joined"
                                    type="date"
                                    value={editMemberData.joined_on}
                                    onChange={(event) =>
                                        setEditMemberData((data) => ({
                                            ...data,
                                            joined_on: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-member-left">
                                    {t('Left on')}
                                </Label>
                                <Input
                                    id="edit-member-left"
                                    type="date"
                                    value={editMemberData.left_on}
                                    onChange={(event) =>
                                        setEditMemberData((data) => ({
                                            ...data,
                                            left_on: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingMember(null)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit">{t('Save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AddMemberDialog
                open={addMemberOpen}
                onOpenChange={setAddMemberOpen}
                team={team}
                sessions={sessions}
                onAdded={handleMembersAdded}
            />
            <AddCoachDialog
                open={addCoachOpen}
                onOpenChange={setAddCoachOpen}
                team={team}
                sessions={sessions}
            />
            <CloneTeamDialog
                open={cloneOpen}
                onOpenChange={setCloneOpen}
                team={team}
                sessions={sessions}
                members={members}
                coaches={coaches}
            />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{team.name}</h1>
                        {team.sport && (
                            <p className="text-sm text-muted-foreground">
                                {team.sport.name}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCloneOpen(true)}
                            title={t('Clone to session (⌘⇧D)')}
                        >
                            <Copy className="mr-1.5 h-4 w-4" />
                            {t('Clone')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editTeam.url(team)}>{t('Edit')}</Link>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">
                            {t('Overview')}
                        </TabsTrigger>
                        <TabsTrigger value="players">
                            {t('Players')}
                            {counts && (
                                <span className="ml-1.5 text-xs">
                                    ({counts.players_count})
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="coaches">
                            {t('Coaches')}
                            {counts && (
                                <span className="ml-1.5 text-xs">
                                    ({counts.coaches_count})
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="changelog">
                            {t('Change log')}
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(t('Team name'), team.name)}
                                {detail(t('Sport'), team.sport?.name)}
                                {detail(t('Session'), team.session?.name)}
                                {detail(t('Unit'), team.unit?.name)}
                                {detail(t('In-charge'), team.in_charge)}
                                <Deferred
                                    data="counts"
                                    fallback={
                                        <div className="col-span-2 h-10 animate-pulse rounded bg-muted" />
                                    }
                                >
                                    <>
                                        {detail(
                                            t('Players'),
                                            counts?.players_count,
                                        )}
                                        {detail(
                                            t('Coaches'),
                                            counts?.coaches_count,
                                        )}
                                    </>
                                </Deferred>
                            </dl>
                        </div>
                    </TabsContent>

                    {/* Players */}
                    <TabsContent value="players">
                        <div className="space-y-3">
                            {/* Tab header: filter pills + Add button */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Deferred data="members" fallback={<></>}>
                                    <>
                                        {memberSessions.length > 1 && (
                                            <Select
                                                value={
                                                    memberSessionFilter ||
                                                    '_all'
                                                }
                                                onValueChange={(v) =>
                                                    setMemberSessionFilter(
                                                        v === '_all' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Session',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">
                                                        {t('All sessions')}
                                                    </SelectItem>
                                                    {memberSessions.map((s) => (
                                                        <SelectItem
                                                            key={s.id}
                                                            value={String(s.id)}
                                                        >
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select
                                            value={memberRoleFilter || '_all'}
                                            onValueChange={(v) =>
                                                setMemberRoleFilter(
                                                    v === '_all' ? '' : v,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue
                                                    placeholder={t('Role')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">
                                                    {t('All roles')}
                                                </SelectItem>
                                                {MEMBER_ROLES.map((r) => (
                                                    <SelectItem
                                                        key={r}
                                                        value={r}
                                                    >
                                                        {t(r)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t(
                                                    'Search by name or PNO…',
                                                )}
                                                value={memberSearch}
                                                onChange={(e) =>
                                                    setMemberSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-7 w-44 pl-6 text-xs"
                                            />
                                        </div>
                                        {memberFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
                                                    setMemberSessionFilter('');
                                                    setMemberRoleFilter('');
                                                    setMemberSearch('');
                                                }}
                                            >
                                                {t('Clear')}
                                            </button>
                                        )}
                                        {memberFiltersActive && (
                                            <span className="text-xs text-muted-foreground">
                                                {t(':n results').replace(
                                                    ':n',
                                                    String(
                                                        filteredMembers.length,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </>
                                </Deferred>
                                <div className="ml-auto flex items-center gap-2">
                                    {selectedMemberIds.size > 0 && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleBulkRemoveMembers}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'Remove selected (:count)',
                                            ).replace(
                                                ':count',
                                                String(selectedMemberIds.size),
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => setAddMemberOpen(true)}
                                        title={t('Add member (⌘⇧M)')}
                                    >
                                        <UserPlus className="mr-1.5 h-4 w-4" />
                                        {t('Add member')}
                                    </Button>
                                </div>
                            </div>

                            <Deferred data="members" fallback={tableFallback}>
                                <div className="rounded-xl border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <Checkbox
                                                        checked={
                                                            memberHeaderChecked
                                                        }
                                                        onCheckedChange={() =>
                                                            toggleAllMembers(
                                                                memberSelectableIds,
                                                            )
                                                        }
                                                        aria-label={t(
                                                            'Select all',
                                                        )}
                                                    />
                                                </TableHead>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('PNO')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Role')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Joined on')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Left on')}
                                                </TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMembers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={8}
                                                        className="text-center text-muted-foreground"
                                                    >
                                                        {t(
                                                            'No members in this team.',
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredMembers.map((row) => {
                                                    const isHighlighted = !!(
                                                        row.member &&
                                                        highlightedMemberIds.has(
                                                            row.member.id,
                                                        )
                                                    );

                                                    return (
                                                        <TableRow
                                                            key={row.id}
                                                            id={
                                                                row.member
                                                                    ? `team-member-${row.member.id}`
                                                                    : undefined
                                                            }
                                                            data-state={
                                                                row.member &&
                                                                selectedMemberIds.has(
                                                                    row.member
                                                                        .id,
                                                                )
                                                                    ? 'selected'
                                                                    : undefined
                                                            }
                                                            className={
                                                                isHighlighted
                                                                    ? 'bg-emerald-50 ring-1 ring-emerald-300 transition-colors ring-inset dark:bg-emerald-950/30 dark:ring-emerald-800'
                                                                    : undefined
                                                            }
                                                        >
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={
                                                                        !!(
                                                                            row.member &&
                                                                            selectedMemberIds.has(
                                                                                row
                                                                                    .member
                                                                                    .id,
                                                                            )
                                                                        )
                                                                    }
                                                                    onCheckedChange={() =>
                                                                        row.member &&
                                                                        toggleMember(
                                                                            row
                                                                                .member
                                                                                .id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !row.member
                                                                    }
                                                                    aria-label={
                                                                        row
                                                                            .member
                                                                            ?.full_name
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {row.member
                                                                    ?.full_name ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-sm">
                                                                {row.member
                                                                    ?.pno ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.role
                                                                    ? t(
                                                                          row.role,
                                                                      )
                                                                    : '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.session
                                                                    ?.name ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.joined_on ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.left_on ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title={t(
                                                                            'Quick info',
                                                                        )}
                                                                        onClick={() =>
                                                                            setMemberQuickViewId(
                                                                                row
                                                                                    .member
                                                                                    ?.id ??
                                                                                    null,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !row.member
                                                                        }
                                                                    >
                                                                        <Info className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title={t(
                                                                            'Edit membership',
                                                                        )}
                                                                        onClick={() =>
                                                                            openMemberEdit(
                                                                                row,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !row.member
                                                                        }
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            row.member &&
                                                                            removeMember(
                                                                                row
                                                                                    .member
                                                                                    .id,
                                                                                row
                                                                                    .member
                                                                                    .full_name,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !row.member
                                                                        }
                                                                    >
                                                                        {t(
                                                                            'Remove',
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Coaches */}
                    <TabsContent value="coaches">
                        <div className="space-y-3">
                            {/* Tab header: filter pills + Add button */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Deferred data="coaches" fallback={<></>}>
                                    <>
                                        {coachSessions.length > 1 && (
                                            <Select
                                                value={
                                                    coachSessionFilter || '_all'
                                                }
                                                onValueChange={(v) =>
                                                    setCoachSessionFilter(
                                                        v === '_all' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Session',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">
                                                        {t('All sessions')}
                                                    </SelectItem>
                                                    {coachSessions.map((s) => (
                                                        <SelectItem
                                                            key={s.id}
                                                            value={String(s.id)}
                                                        >
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select
                                            value={coachRoleFilter || '_all'}
                                            onValueChange={(v) =>
                                                setCoachRoleFilter(
                                                    v === '_all' ? '' : v,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue
                                                    placeholder={t('Role')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">
                                                    {t('All roles')}
                                                </SelectItem>
                                                {COACH_ROLES.map((r) => (
                                                    <SelectItem
                                                        key={r}
                                                        value={r}
                                                    >
                                                        {t(r)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t(
                                                    'Search by name or PNO…',
                                                )}
                                                value={coachSearch}
                                                onChange={(e) =>
                                                    setCoachSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-7 w-44 pl-6 text-xs"
                                            />
                                        </div>
                                        {coachFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
                                                    setCoachSessionFilter('');
                                                    setCoachRoleFilter('');
                                                    setCoachSearch('');
                                                }}
                                            >
                                                {t('Clear')}
                                            </button>
                                        )}
                                        {coachFiltersActive && (
                                            <span className="text-xs text-muted-foreground">
                                                {t(':n results').replace(
                                                    ':n',
                                                    String(
                                                        filteredCoaches.length,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </>
                                </Deferred>
                                <div className="ml-auto flex items-center gap-2">
                                    {selectedCoachIds.size > 0 && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleBulkRemoveCoaches}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'Remove selected (:count)',
                                            ).replace(
                                                ':count',
                                                String(selectedCoachIds.size),
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => setAddCoachOpen(true)}
                                        title={t('Add coach (⌘⇧H)')}
                                    >
                                        <Users className="mr-1.5 h-4 w-4" />
                                        {t('Add coach')}
                                    </Button>
                                </div>
                            </div>

                            <Deferred data="coaches" fallback={tableFallback}>
                                <div className="rounded-xl border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <Checkbox
                                                        checked={
                                                            coachHeaderChecked
                                                        }
                                                        onCheckedChange={() =>
                                                            toggleAllCoaches(
                                                                coachSelectableIds,
                                                            )
                                                        }
                                                        aria-label={t(
                                                            'Select all',
                                                        )}
                                                    />
                                                </TableHead>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('PNO')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Role')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCoaches.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="text-center text-muted-foreground"
                                                    >
                                                        {t(
                                                            'No coaches in this team.',
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredCoaches.map((row) => (
                                                    <TableRow
                                                        key={row.id}
                                                        data-state={
                                                            row.coach &&
                                                            selectedCoachIds.has(
                                                                row.coach.id,
                                                            )
                                                                ? 'selected'
                                                                : undefined
                                                        }
                                                    >
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={
                                                                    !!(
                                                                        row.coach &&
                                                                        selectedCoachIds.has(
                                                                            row
                                                                                .coach
                                                                                .id,
                                                                        )
                                                                    )
                                                                }
                                                                onCheckedChange={() =>
                                                                    row.coach &&
                                                                    toggleCoach(
                                                                        row
                                                                            .coach
                                                                            .id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    !row.coach
                                                                }
                                                                aria-label={
                                                                    row.coach
                                                                        ?.full_name
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {row.coach
                                                                ?.full_name ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {row.coach?.pno ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.role
                                                                ? t(row.role)
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.session
                                                                ?.name ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title={t(
                                                                        'Quick info',
                                                                    )}
                                                                    onClick={() =>
                                                                        setCoachQuickViewId(
                                                                            row
                                                                                .coach
                                                                                ?.id ??
                                                                                null,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !row.coach
                                                                    }
                                                                >
                                                                    <Info className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        row.coach &&
                                                                        removeCoach(
                                                                            row
                                                                                .coach
                                                                                .id,
                                                                            row
                                                                                .coach
                                                                                .full_name,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !row.coach
                                                                    }
                                                                >
                                                                    {t(
                                                                        'Remove',
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Change log */}
                    <TabsContent value="changelog">
                        <Deferred
                            data="auditLog"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-14 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog
                                entries={auditLog}
                                primaryEntity="Team"
                                storageKey="team-changelog-view"
                            />
                        </Deferred>
                    </TabsContent>
                </Tabs>
            </div>
            <MemberQuickView
                memberId={memberQuickViewId}
                open={memberQuickViewId !== null}
                onClose={() => setMemberQuickViewId(null)}
            />
            <CoachQuickView
                coachId={coachQuickViewId}
                open={coachQuickViewId !== null}
                onClose={() => setCoachQuickViewId(null)}
            />
        </>
    );
}
