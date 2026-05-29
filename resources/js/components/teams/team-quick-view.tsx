import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { useEffect, useState, startTransition } from 'react';
import TeamPreviewController from '@/actions/App/Http/Controllers/Api/V1/TeamPreviewController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamsUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

type TeamPreview = {
    id: number;
    name_hi: string;
    in_charge_hi: string | null;
    players_count: number;
    coaches_count: number;
    sport: { name_hi: string } | null;
    session: { name: string } | null;
    unit: { name_hi: string } | null;
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

export function TeamQuickView({ teamId, open, onClose }: { teamId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<TeamPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, TeamPreview>({});

    useEffect(() => {
        if (!open || teamId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(TeamPreviewController.url(teamId), {
            onSuccess: (res) => setData(res as unknown as TeamPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, teamId]);

    const exportUrl = teamId !== null
        ? exportTeamsUrl.url() + '?ids[]=' + teamId
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
                        {data ? data.name_hi : t('Loading…')}
                    </DialogTitle>
                </DialogHeader>

                {processing && (
                    <div className="space-y-2 py-2">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                )}

                {error && (
                    <p className="py-4 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                )}

                {data && (
                    <div className="space-y-1 divide-y">
                        <div className="pb-2 flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{t('Players')}: <strong className="text-foreground">{data.players_count}</strong></span>
                            <span>{t('Coaches')}: <strong className="text-foreground">{data.coaches_count}</strong></span>
                        </div>
                        <div className="pt-2">
                            <InfoRow label={t('Sport')} value={data.sport?.name_hi} />
                            <InfoRow label={t('Session')} value={data.session?.name} />
                            <InfoRow label={t('Unit')} value={data.unit?.name_hi} />
                            <InfoRow label={t('In-charge')} value={data.in_charge_hi} />
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
                    {teamId !== null && (
                        <Button asChild size="sm">
                            <Link href={TeamController.show.url(teamId)}>
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
