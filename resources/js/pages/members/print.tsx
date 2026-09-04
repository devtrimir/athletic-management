import { PrintDocument } from '@/components/print/print-document';
import { useTranslation } from '@/hooks/use-translation';

type ReportMeta = {
    title: string;
    printedAt: string;
};

type PrintRow = Record<string, string | number | null>;

export default function MembersPrint({
    columns,
    headings,
    rows,
    reportMeta,
}: {
    columns: string[];
    headings: string[];
    rows: PrintRow[];
    reportMeta: ReportMeta;
}) {
    const { t } = useTranslation();

    return (
        <PrintDocument
            organization={t('UP Police Sports Control Board')}
            title={t(reportMeta.title)}
            printedAt={reportMeta.printedAt}
            columns={columns}
            headings={headings}
            rows={rows}
            footerNote={t('Generated from official member records only.')}
        />
    );
}
