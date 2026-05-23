import { Deferred, Head, Link, router, setLayoutProps, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { edit as editMember, index as membersIndex } from '@/actions/App/Http/Controllers/MemberController';
import { store as storeStatus } from '@/actions/App/Http/Controllers/MemberStatusController';
import { destroy as destroyAlias, store as storeAlias } from '@/actions/App/Http/Controllers/MemberAliasController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
    const [aliasOpen, setAliasOpen] = useState(false);

    const statusForm = useForm({ status: '', effective_on: '', reason_hi: '' });
    const aliasForm = useForm({ alias_hi: '', source: '' });

    function submitStatus(e: React.FormEvent) {
        e.preventDefault();
        statusForm.post(storeStatus.url(member), { onSuccess: () => { setStatusOpen(false); statusForm.reset(); } });
    }

    function submitAlias(e: React.FormEvent) {
        e.preventDefault();
        aliasForm.post(storeAlias.url(member), { onSuccess: () => { setAliasOpen(false); aliasForm.reset(); } });
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
                                <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">{t('Change status')}</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>{t('Change status')}</DialogTitle></DialogHeader>
                                        <form onSubmit={submitStatus} className="space-y-4 mt-2">
                                            <div className="grid gap-2">
                                                <Label>{t('New status')} <span className="text-destructive">*</span></Label>
                                                <Select value={statusForm.data.status} onValueChange={(v) => statusForm.setData('status', v)}>
                                                    <SelectTrigger><SelectValue placeholder={t('Select status')} /></SelectTrigger>
                                                    <SelectContent>
                                                        {(['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'] as const).map((s) => (
                                                            <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={statusForm.errors.status} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('Effective date')} <span className="text-destructive">*</span></Label>
                                                <Input type="date" value={statusForm.data.effective_on} onChange={(e) => statusForm.setData('effective_on', e.target.value)} required />
                                                <InputError message={statusForm.errors.effective_on} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('Reason')}</Label>
                                                <Textarea value={statusForm.data.reason_hi} onChange={(e) => statusForm.setData('reason_hi', e.target.value)} rows={3} />
                                                <InputError message={statusForm.errors.reason_hi} />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button type="submit" disabled={statusForm.processing}>{t('Save changes')}</Button>
                                                <Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>{t('Cancel')}</Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                        <div className="rounded-xl border bg-card p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">{t('Aliases')}</h3>
                                <Dialog open={aliasOpen} onOpenChange={setAliasOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">{t('Add alias')}</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>{t('Add alias')}</DialogTitle></DialogHeader>
                                        <form onSubmit={submitAlias} className="space-y-4 mt-2">
                                            <div className="grid gap-2">
                                                <Label>{t('Alias (Hindi)')} <span className="text-destructive">*</span></Label>
                                                <Input value={aliasForm.data.alias_hi} onChange={(e) => aliasForm.setData('alias_hi', e.target.value)} maxLength={255} required />
                                                <InputError message={aliasForm.errors.alias_hi} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('Source')} <span className="text-destructive">*</span></Label>
                                                <Select value={aliasForm.data.source} onValueChange={(v) => aliasForm.setData('source', v)}>
                                                    <SelectTrigger><SelectValue placeholder={t('Select source')} /></SelectTrigger>
                                                    <SelectContent>
                                                        {(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual'] as const).map((s) => (
                                                            <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={aliasForm.errors.source} />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button type="submit" disabled={aliasForm.processing}>{t('Save changes')}</Button>
                                                <Button type="button" variant="outline" onClick={() => setAliasOpen(false)}>{t('Cancel')}</Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Deferred data="aliases" fallback={<div className="space-y-2">{[1,2,3].map((n) => <Skeleton key={n} className="h-8 w-full" />)}</div>}>
                                <div className="divide-y">
                                    {(aliases ?? []).length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">{t('No aliases.')}</p>
                                    ) : (aliases ?? []).map((a) => (
                                        <div key={a.id} className="flex items-center justify-between py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">{a.alias_hi}</span>
                                                <Badge variant="outline" className="text-xs">{t(a.source)}</Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => router.delete(destroyAlias.url({ member, alias: a }))}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
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
