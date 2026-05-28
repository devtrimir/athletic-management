import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Copy, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { destroy as destroyTeamCoach } from '@/actions/App/Http/Controllers/TeamCoachController';
import { destroy as destroyTeam, edit as editTeam, index as teamsIndex } from '@/actions/App/Http/Controllers/TeamController';
import { destroy as destroyTeamMember } from '@/actions/App/Http/Controllers/TeamMemberController';
import { AddCoachDialog } from '@/components/teams/add-coach-dialog';
import { AddMemberDialog } from '@/components/teams/add-member-dialog';
import { CloneTeamDialog } from '@/components/teams/clone-team-dialog';
import { Button } from '@/components/ui/button';
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
}: {
    team: Team;
    counts?: Counts;
    sessions: Session[];
    members?: TeamMemberRow[];
    coaches?: CoachAssignmentRow[];
}) {
    const { t } = useTranslation();

    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [addCoachOpen, setAddCoachOpen] = useState(false);
    const [cloneOpen, setCloneOpen] = useState(false);

    // Filter state for Players tab
    const [memberSessionFilter, setMemberSessionFilter] = useState('');
    const [memberRoleFilter, setMemberRoleFilter] = useState('');

    // Filter state for Coaches tab
    const [coachSessionFilter, setCoachSessionFilter] = useState('');
    const [coachRoleFilter, setCoachRoleFilter] = useState('');

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

    function removeMember(memberId: number) {
        router.delete(destroyTeamMember.url(team, memberId), { preserveScroll: true });
    }

    function removeCoach(coachId: number) {
        router.delete(destroyTeamCoach.url(team, coachId), { preserveScroll: true });
    }

    function handleDelete() {
        if (!confirm(t('Delete this team?'))) {
            return;
        }

        router.delete(destroyTeam.url(team));
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

        return true;
    });

    const filteredCoaches = (coaches ?? []).filter((r) => {
        if (coachSessionFilter && String(r.session?.id) !== coachSessionFilter) {
return false;
}

        if (coachRoleFilter && r.role !== coachRoleFilter) {
return false;
}

        return true;
    });

    const memberFiltersActive = !!(memberSessionFilter || memberRoleFilter);
    const coachFiltersActive = !!(coachSessionFilter || coachRoleFilter);

    return (
        <>
            <Head title={team.name_hi} />

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
                                <Deferred data="members" fallback={null}>
                                    <>
                                        {memberSessions.length > 1 && (
                                            <Select value={memberSessionFilter} onValueChange={setMemberSessionFilter}>
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue placeholder={t('Session')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">{t('All sessions')}</SelectItem>
                                                    {memberSessions.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue placeholder={t('Role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">{t('All roles')}</SelectItem>
                                                {MEMBER_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>{t(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {memberFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
 setMemberSessionFilter(''); setMemberRoleFilter(''); 
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
                                <div className="ml-auto">
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
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        {t('No members in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredMembers.map((row) => (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="font-medium">
                                                            {row.member?.full_name_hi ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {row.member?.pno ?? '—'}
                                                        </TableCell>
                                                        <TableCell>{row.role ? t(row.role) : '—'}</TableCell>
                                                        <TableCell>{row.session?.name ?? '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => row.member && removeMember(row.member.id)}
                                                                disabled={!row.member}
                                                            >
                                                                {t('Remove')}
                                                            </Button>
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
                                <Deferred data="coaches" fallback={null}>
                                    <>
                                        {coachSessions.length > 1 && (
                                            <Select value={coachSessionFilter} onValueChange={setCoachSessionFilter}>
                                                <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                    <SelectValue placeholder={t('Session')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">{t('All sessions')}</SelectItem>
                                                    {coachSessions.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select value={coachRoleFilter} onValueChange={setCoachRoleFilter}>
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                                                <SelectValue placeholder={t('Role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">{t('All roles')}</SelectItem>
                                                {COACH_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>{t(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {coachFiltersActive && (
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={() => {
 setCoachSessionFilter(''); setCoachRoleFilter(''); 
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
                                <div className="ml-auto">
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
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        {t('No coaches in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredCoaches.map((row) => (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="font-medium">
                                                            {row.coach?.full_name_hi ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {row.coach?.pno ?? '—'}
                                                        </TableCell>
                                                        <TableCell>{row.role ? t(row.role) : '—'}</TableCell>
                                                        <TableCell>{row.session?.name ?? '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => row.coach && removeCoach(row.coach.id)}
                                                                disabled={!row.coach}
                                                            >
                                                                {t('Remove')}
                                                            </Button>
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
                </Tabs>
            </div>
        </>
    );
}

