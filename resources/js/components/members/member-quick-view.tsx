import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { useEffect, useState, startTransition } from 'react';
import MemberPreviewController from '@/actions/App/Http/Controllers/Api/V1/MemberPreviewController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { index as exportMembersUrl } from '@/actions/App/Http/Controllers/MemberExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

type MemberPreview = {
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
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    recruitment_type: string | null;
    sport_event: string | null;
    team_since: string | null;
    home_district: { name_hi: string } | null;
    current_unit: { name_hi: string } | null;
    sport: { name_hi: string } | null;
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'secondary',
    RETIRED: 'secondary',
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid grid-cols-[120px_1fr] gap-1 py-1 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

export function MemberQuickView({ memberId, open, onClose }: { memberId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<MemberPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, MemberPreview>({});

    useEffect(() => {
        if (!open || memberId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(MemberPreviewController.url(memberId), {
            onSuccess: (res) => setData(res as unknown as MemberPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, memberId]);

    const exportUrl = memberId !== null
        ? exportMembersUrl.url() + '?ids[]=' + memberId
        : '#';

    return (
        <Dialog open={open} onOpenChange={(v) => {
 if (!v) {
 onClose(); 
} 
}}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {data ? data.full_name_hi : t('Loading…')}
                    </DialogTitle>
                </DialogHeader>

                {processing && (
                    <div className="space-y-2 py-2">
                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                )}

                {error && (
                    <p className="py-4 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                )}

                {data && (
                    <div className="space-y-1 divide-y">
                        <div className="pb-2 flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{data.member_code}</span>
                            {data.pno && <span className="font-mono text-xs text-muted-foreground">· {data.pno}</span>}
                            <Badge variant={STATUS_VARIANT[data.current_status] ?? 'outline'} className="ml-auto">
                                {t(data.current_status)}
                            </Badge>
                        </div>
                        <div className="pt-2">
                            <InfoRow label={t('Father\'s name')} value={data.father_name_hi} />
                            <InfoRow label={t('Rank')} value={data.rank ? t(data.rank) : null} />
                            <InfoRow label={t('Unit')} value={data.current_unit?.name_hi} />
                            <InfoRow label={t('District')} value={data.home_district?.name_hi} />
                            <InfoRow label={t('Mobile')} value={data.mobile} />
                            <InfoRow label={t('Joining date')} value={data.joining_date} />
                            <InfoRow label={t('Blood group')} value={data.blood_group} />
                            <InfoRow label={t('Caste')} value={data.caste} />
                            <InfoRow label={t('Sport')} value={data.sport?.name_hi} />
                            <InfoRow label={t('Sport event')} value={data.sport_event} />
                            <InfoRow label={t('Recruitment type')} value={data.recruitment_type ? t(data.recruitment_type) : null} />
                            <InfoRow label={t('Appointment')} value={data.appointment} />
                            <InfoRow label={t('Team since')} value={data.team_since} />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
 window.open(exportUrl, '_blank'); 
}}
                    >
                        {t('Export')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                    {memberId !== null && (
                        <Button asChild size="sm">
                            <Link href={MemberController.show.url(memberId)}>
                                <ExternalLink className="mr-1.5 h-4 w-4" />
                                {t('Open profile')}
                            </Link>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
