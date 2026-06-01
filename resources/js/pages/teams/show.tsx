import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Copy, Info, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { destroy as destroyTeamCoach, bulkDestroy as bulkDestroyCoaches } from '@/actions/App/Http/Controllers/TeamCoachController';
import { destroy as destroyTeam, edit as editTeam, index as teamsIndex } from '@/actions/App/Http/Controllers/TeamController';
import { destroy as destroyTeamMember, bulkDestroy as bulkDestroyMembers } from '@/actions/App/Http/Controllers/TeamMemberController';
import { MemberQuickView } from '@/components/members/member-quick-view';
import { ChangeLog  } from '@/components/shared/change-log';
import type {AuditEntry} from '@/components/shared/change-log';
import { AddCoachDialog } from '@/components/teams/add-coach-dialog';
import { AddMemberDialog } from '@/components/teams/add-member-dialog';
import { CloneTeamDialog } from '@/components/teams/clone-team-dialog';
import { CoachQuickView } from '@/components/teams/coach-quick-view';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Team = {
    id: number;
    name_hi: string;
    in_charge_hi: string | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    unit: { id: number; name_hi: string } | null;
};

type TeamMemberRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    member: { id: number; full_name_hi: string; member_code: string; pno: string | null } | null;
    session: { id: number; name: string } | null;
};

type CoachAssignmentRow = {
    id: number;
    role: string | null;
    coach: { id: number; full_name_hi: string; pno: string | null } | null;
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
    const [memberQuickViewId, setMemberQuickViewId] = useState<number | null>(null);
    const [coachQuickViewId, setCoachQuickViewId] = useState<number | null>(null);

    // Selection state for bulk remove
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
    const [selectedCoachIds, setSelectedCoachIds] = useState<Set<number>>(new Set());

    // Filter state for Players tab
    const [memberSessionFilter, setMemberSessionFilter] = useState('');
    const [memberRoleFilter, setMemberRoleFilter] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    // Filter state for Coaches tab
    const [coachSessionFilter, setCoachSessionFilter] = useState('');
    const [coachRoleFilter, setCoachRoleFilter] = useState('');
    const [coachSearch, setCoachSearch] = useState('');

    // Confirm dialog state
    type ConfirmState = { open: boolean; title: string; description: string; onConfirm: () => void };
    const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', description: '', onConfirm: () => {} });
    const pendingConfirm = useRef<(() => void) | null>(null);

    function openConfirm(title: string, description: string, onConfirm: () => void) {
        pendingConfirm.current = onConfirm;
        setConfirm({ open: true, title, description, onConfirm });
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: team.name_hi },
        ],
    });

    // Keyboard shortcuts — only when not inside an input/textarea
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

    function removeMember(memberId: number, memberName?: string) {
        openConfirm(
            t('Remove member'),
            memberName
                ? t('Remove :name from the team?').replace(':name', memberName)
                : t('Remove this member from the team?'),
            () => router.delete(destroyTeamMember.url([team, memberId]), { preserveScroll: true }),
        );
    }

    function removeCoach(coachId: number, coachName?: string) {
        openConfirm(
            t('Remove coach'),
            coachName
                ? t('Remove :name from the team?').replace(':name', coachName)
                : t('Remove this coach from the team?'),
            () => router.delete(destroyTeamCoach.url([team, coachId]), { preserveScroll: true }),
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
        openConfirm(
            t('Remove selected (:count)').replace(':count', String(count)),
            t('Remove :count selected members?').replace(':count', String(count)),
            () => router.delete(bulkDestroyMembers.url(team), {
                data: { member_ids: ids },
                preserveScroll: true,
                onSuccess: () => setSelectedMemberIds(new Set()),
            }),
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
            t('Remove :count selected coaches?').replace(':count', String(count)),
            () => router.delete(bulkDestroyCoaches.url(team), {
                data: { coach_ids: ids },
                preserveScroll: true,
                onSuccess: () => setSelectedCoachIds(new Set()),
            }),
        );
    }

    function handleDelete() {
        openConfirm(
            t('Delete this team?'),
            t('This action cannot be undone. All player and coach assignments will also be removed.'),
            () => router.delete(destroyTeam.url(team)),
        );
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
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
    const memberSessions = Array.from(new Map((members ?? []).filter((r) => r.session).map((r) => [r.session!.id, r.session!])).values());
    const coachSessions = Array.from(new Map((coaches ?? []).filter((r) => r.session).map((r) => [r.session!.id, r.session!])).values());

    const filteredMembers = (members ?? []).filter((r) => {
        if (memberSessionFilter && String(r.session?.id) !== memberSessionFilter) {
return false;
}

        if (memberRoleFilter && r.role !== memberRoleFilter) {
return false;
}

        if (memberSearch) {
            const q = memberSearch.toLowerCase();
            const nameMatch = r.member?.full_name_hi?.toLowerCase().includes(q);
            const pnoMatch = r.member?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !pnoMatch) {
return false;
}
        }

        return true;
    });

    const filteredCoaches = (coaches ?? []).filter((r) => {
        if (coachSessionFilter && String(r.session?.id) !== coachSessionFilter) {
return false;
}

        if (coachRoleFilter && r.role !== coachRoleFilter) {
return false;
}

        if (coachSearch) {
            const q = coachSearch.toLowerCase();
            const nameMatch = r.coach?.full_name_hi?.toLowerCase().includes(q);
            const pnoMatch = r.coach?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !pnoMatch) {
return false;
}
        }

        return true;
    });

    const memberFiltersActive = !!(memberSessionFilter || memberRoleFilter || memberSearch);
    const coachFiltersActive = !!(coachSessionFilter || coachRoleFilter || coachSearch);

    // Checkbox derived state — members
    const memberSelectableIds = filteredMembers.filter((r) => r.member).map((r) => r.member!.id);
    const memberAllSelected = memberSelectableIds.length > 0 && memberSelectableIds.every((id) => selectedMemberIds.has(id));
    const memberSomeSelected = !memberAllSelected && memberSelectableIds.some((id) => selectedMemberIds.has(id));
    const memberHeaderChecked: boolean | 'indeterminate' = memberAllSelected ? true : memberSomeSelected ? 'indeterminate' : false;

    // Checkbox derived state — coaches
    const coachSelectableIds = filteredCoaches.filter((r) => r.coach).map((r) => r.coach!.id);
    const coachAllSelected = coachSelectableIds.length > 0 && coachSelectableIds.every((id) => selectedCoachIds.has(id));
    const coachSomeSelected = !coachAllSelected && coachSelectableIds.some((id) => selectedCoachIds.has(id));
    const coachHeaderChecked: boolean | 'indeterminate' = coachAllSelected ? true : coachSomeSelected ? 'indeterminate' : false;

    return (
        <>
            <Head title={team.name_hi} />

            <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
 confirm.onConfirm(); setConfirm((s) => ({ ...s, open: false }));
}}
                        >
                            {t('Confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AddMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} team={team} sessions={sessions} />
            <AddCoachDialog open={addCoachOpen} onOpenChange={setAddCoachOpen} team={team} sessions={sessions} />
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
                        <h1 className="text-2xl font-bold">{team.name_hi}</h1>
                        {team.sport && (
                            <p className="text-muted-foreground text-sm">{team.sport.name}</p>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCloneOpen(true)}
                            title={t('Clone to session (⌘⇧D)')}
                        >
                            <Copy className="h-4 w-4 mr-1.5" />
                            {t('Clone')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editTeam.url(team)}>{t('Edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="players">
                            {t('Players')}
                            {counts && <span className="ml-1.5 text-xs">({counts.players_count})</span>}
                        </TabsTrigger>
                        <TabsTrigger value="coaches">
                            {t('Coaches')}
                            {counts && <span className="ml-1.5 text-xs">({counts.coaches_count})</span>}
                        </TabsTrigger>
                        <TabsTrigger value="changelog">{t('Change log')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(t('Team name'), team.name_hi)}
                                {detail(t('Sport'), team.sport?.name)}
                                {detail(t('Session'), team.session?.name)}
                                {detail(t('Unit'), team.unit?.name_hi)}
                                {detail(t('In-charge'), team.in_charge_hi)}
                                <Deferred data="counts" fallback={<div className="col-span-2 h-10 animate-pulse rounded bg-muted" />}>
                                    <>
                                        {detail(t('Players'), counts?.players_count)}
                                        {detail(t('Coaches'), counts?.coaches_count)}
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
                                            <Select value={memberSessionFilter || '_all'} onValueChange={(v) => setMemberSessionFilter(v === '_all' ? '' : v)}>
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue placeholder={t('Session')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">{t('All sessions')}</SelectItem>
                                                    {memberSessions.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select value={memberRoleFilter || '_all'} onValueChange={(v) => setMemberRoleFilter(v === '_all' ? '' : v)}>
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue placeholder={t('Role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">{t('All roles')}</SelectItem>
                                                {MEMBER_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>{t(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t('Search by name or PNO…')}
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                                className="h-7 pl-6 text-xs w-44"
                                            />
                                        </div>
                                        {memberFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
 setMemberSessionFilter(''); setMemberRoleFilter(''); setMemberSearch('');
}}
                                            >
                                                {t('Clear')}
                                            </button>
                                        )}
                                        {memberFiltersActive && (
                                            <span className="text-xs text-muted-foreground">
                                                {t(':n results').replace(':n', String(filteredMembers.length))}
                                            </span>
                                        )}
                                    </>
                                </Deferred>
                                <div className="ml-auto flex items-center gap-2">
                                    {selectedMemberIds.size > 0 && (
                                        <Button size="sm" variant="destructive" onClick={handleBulkRemoveMembers}>
                                            <Trash2 className="h-4 w-4 mr-1.5" />
                                            {t('Remove selected (:count)').replace(':count', String(selectedMemberIds.size))}
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={() => setAddMemberOpen(true)} title={t('Add member (⌘⇧M)')}>
                                        <UserPlus className="h-4 w-4 mr-1.5" />
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
                                                        checked={memberHeaderChecked}
                                                        onCheckedChange={() => toggleAllMembers(memberSelectableIds)}
                                                        aria-label={t('Select all')}
                                                    />
                                                </TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('PNO')}</TableHead>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMembers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                        {t('No members in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredMembers.map((row) => (
                                                    <TableRow key={row.id} data-state={row.member && selectedMemberIds.has(row.member.id) ? 'selected' : undefined}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={!!(row.member && selectedMemberIds.has(row.member.id))}
                                                                onCheckedChange={() => row.member && toggleMember(row.member.id)}
                                                                disabled={!row.member}
                                                                aria-label={row.member?.full_name_hi}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {row.member?.full_name_hi ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {row.member?.pno ?? '—'}
                                                        </TableCell>
                                                        <TableCell>{row.role ? t(row.role) : '—'}</TableCell>
                                                        <TableCell>{row.session?.name ?? '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title={t('Quick info')}
                                                                    onClick={() => setMemberQuickViewId(row.member?.id ?? null)}
                                                                    disabled={!row.member}
                                                                >
                                                                    <Info className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => row.member && removeMember(row.member.id)}
                                                                    disabled={!row.member}
                                                                >
                                                                    {t('Remove')}
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

                    {/* Coaches */}
                    <TabsContent value="coaches">
                        <div className="space-y-3">
                            {/* Tab header: filter pills + Add button */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Deferred data="coaches" fallback={<></>}>
                                    <>
                                        {coachSessions.length > 1 && (
                                            <Select value={coachSessionFilter || '_all'} onValueChange={(v) => setCoachSessionFilter(v === '_all' ? '' : v)}>
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue placeholder={t('Session')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">{t('All sessions')}</SelectItem>
                                                    {coachSessions.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select value={coachRoleFilter || '_all'} onValueChange={(v) => setCoachRoleFilter(v === '_all' ? '' : v)}>
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue placeholder={t('Role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">{t('All roles')}</SelectItem>
                                                {COACH_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>{t(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t('Search by name or PNO…')}
                                                value={coachSearch}
                                                onChange={(e) => setCoachSearch(e.target.value)}
                                                className="h-7 pl-6 text-xs w-44"
                                            />
                                        </div>
                                        {coachFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
 setCoachSessionFilter(''); setCoachRoleFilter(''); setCoachSearch('');
}}
                                            >
                                                {t('Clear')}
                                            </button>
                                        )}
                                        {coachFiltersActive && (
                                            <span className="text-xs text-muted-foreground">
                                                {t(':n results').replace(':n', String(filteredCoaches.length))}
                                            </span>
                                        )}
                                    </>
                                </Deferred>
                                <div className="ml-auto flex items-center gap-2">
                                    {selectedCoachIds.size > 0 && (
                                        <Button size="sm" variant="destructive" onClick={handleBulkRemoveCoaches}>
                                            <Trash2 className="h-4 w-4 mr-1.5" />
                                            {t('Remove selected (:count)').replace(':count', String(selectedCoachIds.size))}
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={() => setAddCoachOpen(true)} title={t('Add coach (⌘⇧H)')}>
                                        <Users className="h-4 w-4 mr-1.5" />
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
                                                        checked={coachHeaderChecked}
                                                        onCheckedChange={() => toggleAllCoaches(coachSelectableIds)}
                                                        aria-label={t('Select all')}
                                                    />
                                                </TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('PNO')}</TableHead>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCoaches.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                        {t('No coaches in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredCoaches.map((row) => (
                                                    <TableRow key={row.id} data-state={row.coach && selectedCoachIds.has(row.coach.id) ? 'selected' : undefined}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={!!(row.coach && selectedCoachIds.has(row.coach.id))}
                                                                onCheckedChange={() => row.coach && toggleCoach(row.coach.id)}
                                                                disabled={!row.coach}
                                                                aria-label={row.coach?.full_name_hi}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {row.coach?.full_name_hi ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {row.coach?.pno ?? '—'}
                                                        </TableCell>
                                                        <TableCell>{row.role ? t(row.role) : '—'}</TableCell>
                                                        <TableCell>{row.session?.name ?? '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title={t('Quick info')}
                                                                    onClick={() => setCoachQuickViewId(row.coach?.id ?? null)}
                                                                    disabled={!row.coach}
                                                                >
                                                                    <Info className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => row.coach && removeCoach(row.coach.id, row.coach.full_name_hi)}
                                                                    disabled={!row.coach}
                                                                >
                                                                    {t('Remove')}
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
                                        <Skeleton key={n} className="h-14 w-full" />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog entries={auditLog} primaryEntity="Team" storageKey="team-changelog-view" />
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

