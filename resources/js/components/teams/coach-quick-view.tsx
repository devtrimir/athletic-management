import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import CoachPreviewController from '@/actions/App/Http/Controllers/Api/V1/CoachPreviewController';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
        <div className="grid grid-cols-[150px_1fr] gap-1 py-0.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function buildPrintHtml(data: CoachPreview, t: (k: string) => string): string {
    const row = (label: string, value: string | null | undefined) =>
        value ? `<div class="row"><span class="label">${label}</span><span class="val">${value}</span></div>` : '';

    const memberSection = data.member
        ? `<h2>${t('Linked member record')}</h2>
          ${row(t('Name'), data.member.full_name_hi)}
          ${row(t('Code'), data.member.member_code)}
          ${row(t('Rank'), data.member.rank ? t(data.member.rank) : null)}
          ${row(t('Status'), t(data.member.current_status))}
          ${row(t('Unit'), data.member.current_unit?.name_hi)}`
        : '';

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.full_name_hi}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:13px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:14px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}
        .header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:4px}
        .meta{font-size:12px;color:#555;font-family:monospace}
        .row{display:grid;grid-template-columns:150px 1fr;gap:4px;padding:1px 0}
        .label{color:#555}.val{font-weight:500}
        @media print{@page{margin:1cm}}
    </style></head><body>
    <div class="header">
        <h1>${data.full_name_hi}${data.full_name_en ? ` <small>(${data.full_name_en})</small>` : ''}</h1>
        <span class="meta">${data.pno ?? ''} · ${data.nis_certified ? t('NIS Certified') : t('Not NIS Certified')}</span>
    </div>
    <h2>${t('Contact')}</h2>
    ${row(t('Mobile'), data.mobile)}
    ${memberSection}
    </body></html>`;
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

    const handlePrint = () => {
        if (!data) {
            return;
        }

        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(buildPrintHtml(data, t));
        win.document.close();
        setTimeout(() => {
 win.focus(); win.print(); 
}, 300);
    };

    const exportUrl = coachId !== null ? exportCoachesUrl.url() + '?ids[]=' + coachId : '#';

    return (
        <Sheet open={open} onOpenChange={(v) => {
 if (!v) {
 onClose(); 
} 
}}>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl">
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">{data.full_name_hi}</SheetTitle>
                            {data.full_name_en && (
                                <p className="text-sm text-muted-foreground">{data.full_name_en}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {data.pno && <span className="font-mono text-xs text-muted-foreground">{data.pno}</span>}
                                <Badge variant={data.nis_certified ? 'default' : 'secondary'}>
                                    {data.nis_certified ? t('NIS Certified') : t('Not NIS Certified')}
                                </Badge>
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                    )}

                    {data && (
                        <div className="py-2">
                            <div className="border-b py-4">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Contact')}</h3>
                                <InfoRow label={t('Mobile')} value={data.mobile} />
                            </div>

                            {data.member && (
                                <div className="border-b py-4 last:border-0">
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Linked member record')}</h3>
                                    <InfoRow label={t('Name')} value={data.member.full_name_hi} />
                                    <InfoRow label={t('Code')} value={data.member.member_code} />
                                    <InfoRow label={t('Rank')} value={data.member.rank ? t(data.member.rank) : null} />
                                    <div className="grid grid-cols-[150px_1fr] gap-1 py-0.5 text-sm">
                                        <span className="text-muted-foreground">{t('Status')}</span>
                                        <Badge variant={STATUS_VARIANT[data.member.current_status] ?? 'outline'} className="w-fit">
                                            {t(data.member.current_status)}
                                        </Badge>
                                    </div>
                                    <InfoRow label={t('Unit')} value={data.member.current_unit?.name_hi} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => {
 window.open(exportUrl, '_blank'); 
}}>
                        {t('Export')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                    {coachId !== null && (
                        <Button asChild size="sm" className="ml-auto">
                            <Link href={CoachController.show.url(coachId)}>
                                <ExternalLink className="mr-1.5 h-4 w-4" />
                                {t('Open profile')}
                            </Link>
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
