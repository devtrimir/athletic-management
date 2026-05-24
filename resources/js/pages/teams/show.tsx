import { Deferred, Head, Link, router, setLayoutProps, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy as destroyTeamCoach, store as storeTeamCoach } from '@/actions/App/Http/Controllers/TeamCoachController';
import { destroy as destroyTeam, edit as editTeam, index as teamsIndex } from '@/actions/App/Http/Controllers/TeamController';
import { destroy as destroyTeamMember, store as storeTeamMember } from '@/actions/App/Http/Controllers/TeamMemberController';
import { CoachPicker  } from '@/components/coach-picker';
import type {CoachOption} from '@/components/coach-picker';
import InputError from '@/components/input-error';
import { MemberPicker  } from '@/components/member-picker';
import type {MemberOption} from '@/components/member-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

type AddMemberForm = { member_id: string; session_id: string; role: string };
type AddCoachForm = { coach_id: string; session_id: string; role: string };

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;
const COACH_ROLES = ['HEAD', 'ASSISTANT'] as const;

function AddMemberPanel({ team, sessions }: { team: Team; sessions: { id: number; name: string }[] }) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);

    const { data, setData, post, errors, processing, reset } = useForm<AddMemberForm>({
        member_id: '',
        session_id: team.session ? String(team.session.id) : '',
        role: 'PLAYER',
    });

    function handleMemberChange(m: MemberOption | null) {
        setPickedMember(m);
        setData('member_id', m ? String(m.id) : '');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTeamMember.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                setPickedMember(null);
                reset();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-4">
            <h4 className="text-sm font-medium">{t('Add member')}</h4>
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="add-member">{t('Athlete')}</Label>
                    <MemberPicker id="add-member" value={pickedMember} onChange={handleMemberChange} />
                    <InputError message={errors.member_id} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="add-member-session">{t('Session')}</Label>
                    <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                        <SelectTrigger id="add-member-session" className="w-full">
                            <SelectValue placeholder={t('Select session')} />
                        </SelectTrigger>
                        <SelectContent>
                            {sessions.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.session_id} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="add-member-role">{t('Role')}</Label>
                    <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                        <SelectTrigger id="add-member-role" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MEMBER_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                    {t(r)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.role} />
                </div>
            </div>
            <Button type="submit" size="sm" disabled={processing || !pickedMember}>
                {t('Add member')}
            </Button>
        </form>
    );
}

function AddCoachPanel({ team, sessions }: { team: Team; sessions: { id: number; name: string }[] }) {
    const { t } = useTranslation();
    const [pickedCoach, setPickedCoach] = useState<CoachOption | null>(null);

    const { data, setData, post, errors, processing, reset } = useForm<AddCoachForm>({
        coach_id: '',
        session_id: team.session ? String(team.session.id) : '',
        role: 'ASSISTANT',
    });

    function handleCoachChange(c: CoachOption | null) {
        setPickedCoach(c);
        setData('coach_id', c ? String(c.id) : '');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTeamCoach.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                setPickedCoach(null);
                reset();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-4">
            <h4 className="text-sm font-medium">{t('Add coach')}</h4>
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="add-coach">{t('Coach')}</Label>
                    <CoachPicker id="add-coach" value={pickedCoach} onChange={handleCoachChange} />
                    <InputError message={errors.coach_id} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="add-coach-session">{t('Session')}</Label>
                    <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                        <SelectTrigger id="add-coach-session" className="w-full">
                            <SelectValue placeholder={t('Select session')} />
                        </SelectTrigger>
                        <SelectContent>
                            {sessions.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.session_id} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="add-coach-role">{t('Role')}</Label>
                    <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                        <SelectTrigger id="add-coach-role" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COACH_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                    {t(r)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.role} />
                </div>
            </div>
            <Button type="submit" size="sm" disabled={processing || !pickedCoach}>
                {t('Add coach')}
            </Button>
        </form>
    );
}

export default function TeamsShow({
    team,
    counts,
    members,
    coaches,
}: {
    team: Team;
    counts?: Counts;
    members?: TeamMemberRow[];
    coaches?: CoachAssignmentRow[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: team.name_hi },
        ],
    });

    // sessions list for add panels — derive from team session if available
    const sessions = team.session ? [team.session] : [];

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

    return (
        <>
            <Head title={team.name_hi} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{team.name_hi}</h1>
                        {team.sport && (
                            <p className="text-muted-foreground text-sm">{team.sport.name}</p>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
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
                        <div className="space-y-4">
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
                                            {(members ?? []).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        {t('No members in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (members ?? []).map((row) => (
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

                            <AddMemberPanel team={team} sessions={sessions} />
                        </div>
                    </TabsContent>

                    {/* Coaches */}
                    <TabsContent value="coaches">
                        <div className="space-y-4">
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
                                            {(coaches ?? []).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        {t('No coaches in this team.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (coaches ?? []).map((row) => (
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

                            <AddCoachPanel team={team} sessions={sessions} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

