import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { useEffect, useState, startTransition } from 'react';
import CoachPreviewController from '@/actions/App/Http/Controllers/Api/V1/CoachPreviewController';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

type CoachPreview = {
    id: number;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    member: {
        id: number;
        member_code: string;
        full_name_hi: string;
        rank: string | null;
        current_status: string;
        current_unit: { name_hi: string } | null;
    } | null;
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

export function CoachQuickView({ coachId, open, onClose }: { coachId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<CoachPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, CoachPreview>({});

    useEffect(() => {
        if (!open || coachId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(CoachPreviewController.url(coachId), {
            onSuccess: (res) => setData(res as unknown as CoachPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, coachId]);

    const exportUrl = coachId !== null
        ? exportCoachesUrl.url() + '?ids[]=' + coachId
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
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                )}

                {error && (
                    <p className="py-4 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                )}

                {data && (
                    <div className="space-y-1 divide-y">
                        <div className="pb-2 flex items-center gap-2">
                            {data.pno && <span className="font-mono text-xs text-muted-foreground">{data.pno}</span>}
                            <Badge variant={data.nis_certified ? 'default' : 'secondary'} className="ml-auto">
                                {data.nis_certified ? t('NIS certified') : t('Not NIS certified')}
                            </Badge>
                        </div>
                        <div className="pt-2">
                            <InfoRow label={t('Mobile')} value={data.mobile} />
                            {data.member && (
                                <>
                                    <InfoRow label={t('Linked member')} value={`${data.member.full_name_hi} (${data.member.member_code})`} />
                                    <InfoRow label={t('Rank')} value={data.member.rank ? t(data.member.rank) : null} />
                                    <InfoRow label={t('Unit')} value={data.member.current_unit?.name_hi} />
                                </>
                            )}
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
                    {coachId !== null && (
                        <Button asChild size="sm">
                            <Link href={CoachController.show.url(coachId)}>
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
