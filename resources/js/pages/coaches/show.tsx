import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { destroy, edit as editCoach, index as coachesIndex } from '@/actions/App/Http/Controllers/CoachController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type Coach = {
    id: number;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
};

type LinkedMember = {
    id: number;
    member_code: string;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
} | null;

export default function CoachesShow({ coach, member }: { coach: Coach; member?: LinkedMember }) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name_hi },
        ],
    });

    function handleDelete() {
        if (!confirm(t('Delete this coach?'))) {
return;
}

        router.delete(destroy.url(coach));
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
        </div>
    );

    return (
        <>
            <Head title={coach.full_name_hi} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{coach.full_name_hi}</h1>
                        {coach.full_name_en && <p className="text-muted-foreground">{coach.full_name_en}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editCoach.url(coach)}>{t('Edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            {t('Delete')}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="teams">{t('Teams')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="space-y-4">
                            {/* Coach details */}
                            <div className="rounded-xl border bg-card p-6">
                                <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                    {detail(t('PNO'), <span className="font-mono">{coach.pno}</span>)}
                                    {detail(t('Mobile'), coach.mobile)}
                                    {detail(
                                        t('NIS'),
                                        coach.nis_certified ? (
                                            <Badge>{t('NIS certified')}</Badge>
                                        ) : (
                                            <Badge variant="outline">{t('Not NIS certified')}</Badge>
                                        ),
                                    )}
                                </dl>
                            </div>

                            {/* Linked member (deferred) */}
                            <Deferred
                                data="member"
                                fallback={
                                    <div className="rounded-xl border bg-card p-6 space-y-3">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                }
                            >
                                <div className="rounded-xl border bg-card p-6">
                                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">{t('Linked member')}</h3>
                                    {member ? (
                                        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                            {detail(t('Member code'), <span className="font-mono">{member.member_code}</span>)}
                                            {detail(t('PNO'), <span className="font-mono">{member.pno}</span>)}
                                            {detail(t('Rank'), member.rank)}
                                            {detail(t('Name (Hindi)'), member.full_name_hi)}
                                            {detail(t('Name (English)'), member.full_name_en)}
                                            {detail(t('Mobile'), member.mobile)}
                                        </dl>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('No linked member.')}</p>
                                    )}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Teams stub */}
                    <TabsContent value="teams">
                        <div className="rounded-xl border bg-card p-6">
                            <p className="text-sm text-muted-foreground">{t('Coming soon')}</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
