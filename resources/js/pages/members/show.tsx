import { Deferred, Head, Link, router, setLayoutProps, useHttp } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MemberAchievementsController from '@/actions/App/Http/Controllers/Api/V1/MemberAchievementsController';
import MemberParticipationsController from '@/actions/App/Http/Controllers/Api/V1/MemberParticipationsController';
import { show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import { edit as editMember, index as membersIndex } from '@/actions/App/Http/Controllers/MemberController';
import { show as exportMember } from '@/actions/App/Http/Controllers/MemberExportController';
import { store as storeMemberPhoto, destroy as destroyMemberPhoto } from '@/actions/App/Http/Controllers/MemberPhotoController';
import { show as showTeam } from '@/actions/App/Http/Controllers/TeamController';
import { show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { AliasInlineForm } from '@/components/members/alias-inline-form';
import { LegacyAchievementsTab } from '@/components/members/legacy-achievements-tab';
import { StatusChangeModal } from '@/components/members/status-change-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    father_name_hi: string | null;
    rank: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    home_district: { id: number; name_hi: string } | null;
    current_unit: { id: number; name_hi: string } | null;
    photo_path: string | null;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    home_address: string | null;
    recruitment_type: string | null;
    sport_event: string | null;
    other_notes: string | null;
    team_since: string | null;
};

type StatusEntry = { id: number; status: string; effective_on: string; reason_hi: string | null; recorded_by_name: string | null };
type Alias = { id: number; alias_hi: string; source: string };
type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name_hi: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type ParticipationEntry = {
    id: number;
    position: number | null;
    tournament: { id: number; name_hi: string; tier_code: string | null; date_from: string | null };
    event: { id: number; name_hi: string; gender_class: string };
    achievement: { medal_type: string; position: number | null; remarks: string | null } | null;
};

type ParticipationGroup = {
    session: { id: number; name: string };
    participations: ParticipationEntry[];
};

type AchievementsData = {
    summary: { GOLD: number; SILVER: number; BRONZE: number; MERIT: number };
    achievements: Array<{
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        session: { id: number; name: string };
        tournament: { id: number; name_hi: string; tier_code: string | null };
        event: { id: number; name_hi: string };
    }>;
};

const MEDAL_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    GOLD: 'default',
    SILVER: 'secondary',
    BRONZE: 'outline',
    MERIT: 'outline',
};

type LegacyAchievement = {
    id: number;
    period: string;
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    medal_type: string | null;
    sort_order: number | null;
    benefits: Array<{
        id: number;
        benefit_type: string;
        promoted_from_rank: string | null;
        promoted_to_rank: string | null;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }>;
};

const ALL_COLUMNS: { key: string; label: string }[] = [
    { key: 'member_code', label: 'Member code' },
    { key: 'pno', label: 'PNO' },
    { key: 'full_name_hi', label: 'Name (Hindi)' },
    { key: 'full_name_en', label: 'Name (English)' },
    { key: 'father_name_hi', label: "Father's name" },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'rank', label: 'Rank' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'current_status', label: 'Status' },
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'unit', label: 'Unit' },
    { key: 'home_district', label: 'Home district' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'recruitment_type', label: 'Recruitment type' },
    { key: 'appointment', label: 'Appointment' },
    { key: 'sport_event', label: 'Sport event' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

export default function MembersShow({
    member,
    statusHistory,
    aliases,
    memberTeams,
    legacyAchievements,
}: {
    member: Member;
    statusHistory?: StatusEntry[];
    aliases?: Alias[];
    memberTeams?: MemberTeamRow[];
    legacyAchievements?: LegacyAchievement[];
}) {
    const [activeTab, setActiveTab] = useState('overview');
    const [participations, setParticipations] = useState<ParticipationGroup[] | null>(null);
    const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null);
    const { get: getParticipations, processing: loadingParticipations } = useHttp<Record<string, never>, { data: ParticipationGroup[] }>({});
    const { get: getAchievements, processing: loadingAchievements } = useHttp<Record<string, never>, { data: AchievementsData }>({});
    const participationsFetched = useRef(false);
    const achievementsFetched = useRef(false);
    const memberId = member.id;

    useEffect(() => {
        if (activeTab === 'participations' && !participationsFetched.current) {
            participationsFetched.current = true;
            getParticipations(MemberParticipationsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: ParticipationGroup[] };
                    setParticipations(r?.data ?? []);
                },
                onError: () => setParticipations([]),
            });
        }

        if (activeTab === 'achievements' && !achievementsFetched.current) {
            achievementsFetched.current = true;
            getAchievements(MemberAchievementsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: AchievementsData };
                    setAchievementsData(r?.data ?? { summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 }, achievements: [] });
                },
                onError: () => setAchievementsData({ summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 }, achievements: [] }),
            });
        }
    }, [activeTab, memberId, getParticipations, getAchievements]);
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: member.full_name_hi },
        ],
    });

    const [statusOpen, setStatusOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportMember.url(member) + '?' + params.toString();
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
        </div>
    );

    return (
        <>
            <Head title={member.full_name_hi} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="shrink-0">
                            {member.photo_path ? (
                                <div className="relative group size-20 rounded-xl overflow-hidden border bg-muted">
                                    <img
                                        src={`/storage/${member.photo_path}`}
                                        alt={member.full_name_hi}
                                        className="size-full object-cover"
                                    />
                                    <button
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                                        onClick={() => router.delete(destroyMemberPhoto.url(member))}
                                    >
                                        {t('Remove photo')}
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center size-20 rounded-xl border-2 border-dashed bg-muted cursor-pointer hover:bg-muted/80 transition-colors">
                                    <span className="text-xs text-muted-foreground text-center leading-tight px-1">{t('Upload photo')}</span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) {
return;
}

                                            const fd = new FormData();
                                            fd.append('photo', file);
                                            router.post(storeMemberPhoto.url(member), fd);
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold">{member.full_name_hi}</h1>
                            {member.full_name_en && <p className="text-muted-foreground">{member.full_name_en}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Export')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editMember.url(member)}>{t('Edit')}</Link>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="status">{t('Status history')}</TabsTrigger>
                        <TabsTrigger value="aliases">{t('Aliases')}</TabsTrigger>
                        <TabsTrigger value="teams">{t('Teams')}</TabsTrigger>
                        <TabsTrigger value="participations">{t('Participations')}</TabsTrigger>
                        <TabsTrigger value="achievements">{t('Achievements')}</TabsTrigger>
                        <TabsTrigger value="legacy">{t('Legacy achievements')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(t('Member code'), <span className="font-mono">{member.member_code}</span>)}
                                {detail(t('PNO'), <span className="font-mono">{member.pno}</span>)}
                                {detail(t('Current status'), <Badge variant="outline">{t(member.current_status)}</Badge>)}
                                {detail(t('Name (Hindi)'), member.full_name_hi)}
                                {detail(t('Name (English)'), member.full_name_en)}
                                {detail(t("Father's name"), member.father_name_hi)}
                                {detail(t('Gender'), t(member.gender === 'M' ? 'Male' : member.gender === 'F' ? 'Female' : 'Other gender'))}
                                {detail(t('Date of birth'), member.dob)}
                                {detail(t('Mobile'), member.mobile)}
                                {detail(t('Rank'), member.rank)}
                                {detail(t('Joining date'), member.joining_date)}
                                {detail(t('Unit'), member.current_unit?.name_hi)}
                                {detail(t('Home district'), member.home_district?.name_hi)}
                                {detail(t('Category'), member.player_category)}
                                {detail(t('Level'), member.player_level)}
                                {member.blood_group && detail(t('Blood group'), member.blood_group)}
                                {member.caste && detail(t('Caste'), member.caste)}
                                {member.recruitment_type && detail(t('Recruitment type'), t(member.recruitment_type))}
                                {member.appointment && detail(t('Appointment'), member.appointment)}
                                {member.sport_event && detail(t('Sport event'), member.sport_event)}
                                {member.promotion_date && detail(t('Promotion date'), member.promotion_date)}
                                {member.team_since && detail(t('Team since'), member.team_since)}
                                {member.home_address && detail(t('Home address'), member.home_address)}
                                {member.other_notes && detail(t('Other notes'), member.other_notes)}
                            </dl>
                        </div>
                    </TabsContent>

                    {/* Status history */}
                    <TabsContent value="status">
                        <div className="rounded-xl border bg-card p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">{t('Status history')}</h3>
                                <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
                                    {t('Change status')}
                                </Button>
                                <StatusChangeModal member={member} open={statusOpen} onOpenChange={setStatusOpen} />
                            </div>
                            <Deferred data="statusHistory" fallback={<div className="space-y-2">{[1,2,3].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>}>
                                <div className="divide-y">
                                    {(statusHistory ?? []).length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">{t('No status records.')}</p>
                                    ) : (statusHistory ?? []).map((row) => (
                                        <div key={row.id} className="flex items-center justify-between py-3 text-sm">
                                            <div className="space-y-0.5">
                                                <Badge variant="outline">{t(row.status)}</Badge>
                                                {row.reason_hi && <p className="text-muted-foreground text-xs">{row.reason_hi}</p>}
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                <p>{row.effective_on}</p>
                                                {row.recorded_by_name && <p>{row.recorded_by_name}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Aliases */}
                    <TabsContent value="aliases">
                        <div className="rounded-xl border bg-card p-6">
                            <Deferred data="aliases" fallback={<div className="space-y-2">{[1,2,3].map((n) => <Skeleton key={n} className="h-8 w-full" />)}</div>}>
                                <AliasInlineForm member={member} aliases={aliases} />
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Teams */}
                    <TabsContent value="teams">
                        <div className="rounded-xl border bg-card">
                            <Deferred data="memberTeams" fallback={<div className="space-y-2 p-4">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Joined')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(memberTeams ?? []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                    {t('No team memberships.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (memberTeams ?? []).map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium">
                                                    {row.team ? (
                                                        <Link href={showTeam.url(row.team)} className="hover:underline">
                                                            {row.team.name_hi}
                                                        </Link>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell>{row.sport?.name ?? '—'}</TableCell>
                                                <TableCell>{row.session?.name ?? '—'}</TableCell>
                                                <TableCell>{row.role ? t(row.role) : '—'}</TableCell>
                                                <TableCell>{row.joined_on ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Participations */}
                    <TabsContent value="participations">
                        <div className="space-y-4">
                            {loadingParticipations || participations === null ? (
                                <div className="space-y-2">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>
                            ) : participations.length === 0 ? (
                                <div className="rounded-xl border bg-card p-6">
                                    <p className="text-sm text-muted-foreground">{t('No participations.')}</p>
                                </div>
                            ) : participations.map((group) => (
                                <div key={group.session.id} className="rounded-xl border bg-card">
                                    <div className="px-4 py-2 border-b">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.session.name}</span>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Tournament')}</TableHead>
                                                <TableHead>{t('Tier')}</TableHead>
                                                <TableHead>{t('Event')}</TableHead>
                                                <TableHead>{t('Medal')}</TableHead>
                                                <TableHead>{t('Position')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.participations.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">
                                                        <Link href={showTournament.url(p.tournament.id)} className="hover:underline">
                                                            {p.tournament.name_hi}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        {p.tournament.tier_code
                                                            ? <Badge variant="outline">{p.tournament.tier_code}</Badge>
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link href={showEvent.url({ tournament: p.tournament.id, event: p.event.id })} className="hover:underline">
                                                            {p.event.name_hi}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        {p.achievement?.medal_type
                                                            ? <Badge variant={MEDAL_VARIANT[p.achievement.medal_type] ?? 'outline'}>{t(p.achievement.medal_type)}</Badge>
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>{p.achievement?.position ?? p.position ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Achievements */}
                    <TabsContent value="achievements">
                        <div className="space-y-4">
                            {loadingAchievements || achievementsData === null ? (
                                <div className="space-y-2">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-3">
                                        {(['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const).map((m) => (
                                            <div key={m} className="rounded-lg border bg-card px-4 py-3 flex items-center gap-2">
                                                <Badge variant={MEDAL_VARIANT[m]}>{t(m)}</Badge>
                                                <span className="text-xl font-bold">{achievementsData.summary[m]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {achievementsData.achievements.length === 0 ? (
                                        <div className="rounded-xl border bg-card p-6">
                                            <p className="text-sm text-muted-foreground">{t('No achievements.')}</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border bg-card">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Medal')}</TableHead>
                                                        <TableHead>{t('Tournament')}</TableHead>
                                                        <TableHead>{t('Tier')}</TableHead>
                                                        <TableHead>{t('Event')}</TableHead>
                                                        <TableHead>{t('Session')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {achievementsData.achievements.map((a) => (
                                                        <TableRow key={a.id}>
                                                            <TableCell>
                                                                <Badge variant={MEDAL_VARIANT[a.medal_type] ?? 'outline'}>{t(a.medal_type)}</Badge>
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                <Link href={showTournament.url(a.tournament.id)} className="hover:underline">
                                                                    {a.tournament.name_hi}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                {a.tournament.tier_code
                                                                    ? <Badge variant="outline">{a.tournament.tier_code}</Badge>
                                                                    : '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link href={showEvent.url({ tournament: a.tournament.id, event: a.event.id })} className="hover:underline">
                                                                    {a.event.name_hi}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>{a.session.name}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </TabsContent>
                    {/* Legacy achievements */}
                    <TabsContent value="legacy">
                        <Deferred
                            data="legacyAchievements"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton key={n} className="h-12 w-full" />
                                    ))}
                                </div>
                            }
                        >
                            <LegacyAchievementsTab member={member} legacyAchievements={legacyAchievements} />
                        </Deferred>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Export column picker dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-w-lg" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{t('Export member')}</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        {member.full_name_hi}
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">{t('Select columns to export')}</Label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="text-xs text-primary hover:underline"
                                    onClick={() => setSelectedColumns(ALL_COLUMNS.map((c) => c.key))}
                                >
                                    {t('Select all')}
                                </button>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:underline"
                                    onClick={() => setSelectedColumns([])}
                                >
                                    {t('Clear')}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                            {ALL_COLUMNS.map((col) => (
                                <label key={col.key} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={selectedColumns.includes(col.key)}
                                        onCheckedChange={(checked) => {
                                            setSelectedColumns((prev) =>
                                                checked
                                                    ? [...prev, col.key]
                                                    : prev.filter((k) => k !== col.key),
                                            );
                                        }}
                                    />
                                    {t(col.label)}
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                window.location.href = buildExportUrl();
                                setExportOpen(false);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download Excel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
