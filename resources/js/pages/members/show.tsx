import { Deferred, Head, Link, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import { edit as editMember, index as membersIndex } from '@/actions/App/Http/Controllers/MemberController';
import { AliasInlineForm } from '@/components/members/alias-inline-form';
import { StatusChangeModal } from '@/components/members/status-change-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
};

type StatusEntry = { id: number; status: string; effective_on: string; reason_hi: string | null; recorded_by_name: string | null };
type Alias = { id: number; alias_hi: string; source: string };

export default function MembersShow({
    member,
    statusHistory,
    aliases,
}: {
    member: Member;
    statusHistory?: StatusEntry[];
    aliases?: Alias[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: member.full_name_hi },
        ],
    });

    const [statusOpen, setStatusOpen] = useState(false);

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
                    <div>
                        <h1 className="text-2xl font-bold">{member.full_name_hi}</h1>
                        {member.full_name_en && <p className="text-muted-foreground">{member.full_name_en}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editMember.url(member)}>{t('Edit')}</Link>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="status">{t('Status history')}</TabsTrigger>
                        <TabsTrigger value="aliases">{t('Aliases')}</TabsTrigger>
                        <TabsTrigger value="teams">{t('Teams')}</TabsTrigger>
                        <TabsTrigger value="participations">{t('Participations')}</TabsTrigger>
                        <TabsTrigger value="achievements">{t('Achievements')}</TabsTrigger>
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

                    {/* Stubs */}
                    {(['teams', 'participations', 'achievements'] as const).map((tab) => (
                        <TabsContent key={tab} value={tab}>
                            <div className="rounded-xl border bg-card p-6">
                                <p className="text-sm text-muted-foreground">{t('Coming soon')}</p>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </>
    );
}
