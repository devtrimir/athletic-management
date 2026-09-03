import { Head } from '@inertiajs/react';
import { useTranslation } from '@/hooks/use-translation';

const LETTERHEAD_LOGO_SRC = '/logo.jpg';

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
        <>
            <Head title={t('Member Listing Print')} />
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                }
                .print-root {
                    position: relative;
                    padding: 16px 22px 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: 'Arial', 'Helvetica Neue', sans-serif;
                    color: #111827;
                    line-height: 1.4;
                }
                .print-root::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                    background: url('${LETTERHEAD_LOGO_SRC}') center 58% / 360px auto no-repeat;
                    opacity: 0.06;
                }
                .print-root > * {
                    position: relative;
                    z-index: 1;
                }
                .print-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding: 14px;
                    border: 1px solid #d9e2ec;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
                }
                .print-toolbar-title {
                    font-size: 12px;
                    color: #475569;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    font-weight: 700;
                }
                .print-actions {
                    display: inline-flex;
                    gap: 8px;
                    align-items: center;
                }
                .print-button {
                    font-weight: 600;
                    border: 1px solid #0f172a;
                    background: #0f172a;
                    color: #fff;
                    border-radius: 10px;
                    padding: 9px 14px;
                    cursor: pointer;
                }
                .print-button-secondary {
                    background: #fff;
                    color: #0f172a;
                    border: 1px solid #cbd5e1;
                }
                .letterhead {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    margin-bottom: 8px;
                    padding: 2px 0 12px;
                    border-bottom: 3px solid #0f172a;
                    text-align: center;
                }
                .letterhead-logo {
                    width: 72px;
                    height: 72px;
                    object-fit: contain;
                    filter: drop-shadow(0 2px 4px #1e293b22);
                }
                .letterhead-title {
                    font-weight: 700;
                    font-size: 21px;
                    letter-spacing: 0.01em;
                    margin-bottom: 2px;
                }
                .letterhead-subtitle {
                    color: #334155;
                    font-size: 12px;
                    letter-spacing: 0.02em;
                }
                .doc-title {
                    margin: 12px 0 6px;
                    font-size: 24px;
                    font-weight: 700;
                    text-align: center;
                }
                .doc-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 10px;
                    padding: 0 0 6px;
                    border-bottom: 1px solid #cbd5e1;
                    font-size: 11px;
                    color: #334155;
                }
                .table-wrap {
                    overflow: auto;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10.5px;
                    margin-bottom: 10px;
                    table-layout: auto;
                }
                th,
                td {
                    border: 1px solid #d1d5db;
                    padding: 5px 6px;
                    vertical-align: middle !important;
                    text-align: center !important;
                    overflow-wrap: anywhere;
                }
                th {
                    background: #f3f4f6;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                    color: #334155;
                    font-weight: 700;
                }
                .col-sno {
                    min-width: 34px;
                }
                tfoot td {
                    background: #f3f4f6;
                    font-weight: 700;
                }
                .section-footer {
                    display: none;
                }
                @media print {
                    html,
                    body,
                    #app {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        background: #ffffff !important;
                    }
                    .print-controls {
                        display: none !important;
                    }
                    .print-root {
                        padding: 0;
                        max-width: none;
                        width: 100%;
                    }
                    .table-wrap {
                        overflow: visible;
                    }
                    table {
                        font-size: 9px;
                    }
                }
            `}</style>

            <div className="print-root">
                <div className="print-controls">
                    <div className="print-toolbar-title">
                        {t('Member Listing Print')}
                    </div>
                    <div className="print-actions">
                        <button
                            type="button"
                            className="print-button"
                            onClick={() => window.print()}
                        >
                            {t('Print')}
                        </button>
                        <button
                            type="button"
                            className="print-button print-button-secondary"
                            onClick={() => window.close()}
                        >
                            {t('Close')}
                        </button>
                    </div>
                </div>

                <div className="letterhead">
                    <img
                        className="letterhead-logo"
                        src={LETTERHEAD_LOGO_SRC}
                        alt={t('UP Police Sports Control Board')}
                    />
                    <div>
                        <div className="letterhead-title">
                            {t(reportMeta.title)}
                        </div>
                        <div className="letterhead-subtitle">
                            {t('UP Police Sports Control Board')}
                        </div>
                    </div>
                </div>

                <div className="doc-title">{t(reportMeta.title)}</div>
                <div className="doc-info">
                    <span>
                        {t('Printed')}: {reportMeta.printedAt}
                    </span>
                    <span>
                        {t('Total')}: {rows.length}
                    </span>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th className="col-sno">{t('S. No.')}</th>
                                {headings.map((heading) => (
                                    <th key={heading}>{t(heading)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? (
                                rows.map((row, index) => (
                                    <tr key={index}>
                                        <td className="col-sno">{index + 1}</td>
                                        {columns.map((column) => (
                                            <td key={column}>
                                                {row[column] ?? ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length + 1}
                                        className="muted"
                                    >
                                        {t('No data')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td
                                        colSpan={columns.length + 1}
                                        className="text-center"
                                    >
                                        {t('Total')}: {rows.length}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="section-footer">
                    {t('Generated from official member records only.')}
                </div>
            </div>
        </>
    );
}
