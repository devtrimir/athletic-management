import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    show as showMedalsReportExport,
    store as storeMedalsReportExport,
} from '@/actions/App/Http/Controllers/MedalsReportExportController';
import { useTranslation } from '@/hooks/use-translation';

type MedalCounts = {
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
};

type TallyTier = {
    code: string;
    label: string;
    weight: number;
};

type TallyRow = {
    tier: TallyTier;
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
    display_only: number;
};

type MedalRow = {
    id: number;
    medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT';
    position: number | null;
    remarks: string | null;
    member: {
        id: number;
        member_code: string | null;
        pno: string | null;
        full_name: string;
        rank: string | null;
        gender: string;
        player_category: string | null;
        player_level: string | null;
        unit_name: string | null;
    };
    tournament: {
        id: number;
        name: string;
        venue: string | null;
        date_from: string | null;
        date_to: string | null;
        tier_label: string | null;
    };
    session_name: string | null;
    sport: {
        id: number;
        name: string;
    };
    event: {
        id: number;
        name: string;
        event_type: string;
        discipline: string | null;
        weight_category: string | null;
        gender_class: string | null;
    };
    benefit: {
        benefit_type: string;
    } | null;
};

type SectionToggle = {
    tally: boolean;
    detail: boolean;
};

type ExportFormat = 'pdf' | 'xlsx';

type ExportStatus = {
    id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    format: ExportFormat;
    file_name: string | null;
    error_message: string | null;
    download_url: string | null;
};

const LETTERHEAD_LOGO_SRC = '/logo.jpg';
const PAGE_TITLE = 'UP Police Sports Control Board (UPPSCB)';
const MAX_BROWSER_PRINT_ROWS = 1000;

const defaultSectionState = (
    requested: string,
    tab: 'tally' | 'detail',
): SectionToggle => {
    const sections = requested
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const hasTally = sections.includes('tally') || sections.includes('all');
    const hasDetail = sections.includes('detail') || sections.includes('all');

    if (hasTally || hasDetail) {
        return {
            tally: hasTally,
            detail: hasDetail,
        };
    }

    return tab === 'detail'
        ? { tally: false, detail: true }
        : { tally: true, detail: false };
};

const replaceQueryValue = (key: string, value: string | null): void => {
    if (typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams(window.location.search);

    if (value === null) {
        params.delete(key);
    } else {
        params.set(key, value);
    }

    const query = params.toString();

    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
};

const sectionLabel = (section: 'tally' | 'detail'): string =>
    section === 'tally' ? 'Medal Tally' : 'Medal Details';

const formatDate = (value: string | null): string => {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
};

const isTeamEventMedal = (row: MedalRow): boolean => row.event.event_type === 'team';

const teamEventGroupKey = (row: MedalRow): string =>
    [
        row.tournament.id,
        row.event.id,
        row.medal_type,
        row.position ?? '',
    ].join(':');

export default function MedalsPrint({
    tab,
    groupBy,
    pageMode,
    printSections,
    tallyRows,
    detailRows,
    detailCounts,
    detailTotal,
    reportMeta,
}: {
    tab: 'tally' | 'detail';
    groupBy: 'tier' | 'team';
    pageMode: 'portrait' | 'landscape';
    printSections: string;
    tallyRows: TallyRow[];
    detailRows: MedalRow[];
    detailCounts: MedalCounts;
    detailTotal: number;
    reportMeta: {
        title: string;
        printedAt: string;
    };
}) {
    const { t } = useTranslation();
    const printTargetRef = useRef<HTMLDivElement>(null);

    const [sections, setSections] = useState<SectionToggle>(() =>
        defaultSectionState(printSections, tab),
    );
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
        pageMode,
    );
    const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
    const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
    const [isGeneratingExport, setIsGeneratingExport] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const hasTallySection = sections.tally;
    const hasDetailSection = sections.detail;
    const printableRowCount =
        (hasTallySection ? tallyRows.length : 0) +
        (hasDetailSection ? detailRows.length : 0);
    const isBrowserPrintTooLarge = printableRowCount > MAX_BROWSER_PRINT_ROWS;

    useEffect(() => {
        if (
            !exportStatus ||
            (exportStatus.status !== 'pending' &&
                exportStatus.status !== 'processing')
        ) {
            return;
        }

        const timer = window.setInterval(() => {
            fetch(showMedalsReportExport.url(exportStatus.id), {
                headers: {
                    Accept: 'application/json',
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(t('Unable to refresh export status.'));
                    }

                    return response.json() as Promise<ExportStatus>;
                })
                .then((payload) => {
                    setExportStatus(payload);
                    setExportError(null);
                })
                .catch((error: unknown) => {
                    setExportError(
                        error instanceof Error
                            ? error.message
                            : t('Unable to refresh export status.'),
                    );
                });
        }, 2500);

        return () => {
            window.clearInterval(timer);
        };
    }, [exportStatus?.id, exportStatus?.status, t]);

    const handleSectionChange = (section: keyof SectionToggle) => {
        setSections((prev) => {
            let next = {
                ...prev,
                [section]: !prev[section],
            };

            if (!next.tally && !next.detail) {
                next =
                    tab === 'detail'
                        ? { tally: false, detail: true }
                        : { tally: true, detail: false };
            }

            const selected = [
                next.tally ? 'tally' : null,
                next.detail ? 'detail' : null,
            ]
                .filter(Boolean)
                .join(',');

            replaceQueryValue('print_sections', selected);

            return next;
        });
    };

    const handleOrientationChange = (nextOrientation: 'portrait' | 'landscape') => {
        setOrientation(nextOrientation);
        replaceQueryValue('page_mode', nextOrientation);
    };

    const selectedSections = (): Array<keyof SectionToggle> =>
        [
            sections.tally ? 'tally' : null,
            sections.detail ? 'detail' : null,
        ].filter((section): section is keyof SectionToggle => section !== null);

    const startExport = async () => {
        setIsGeneratingExport(true);
        setExportError(null);

        const body = new URLSearchParams(window.location.search);

        ['page_mode', 'print_sections', 'tab', 'page', 'per_page'].forEach((key) => {
            body.delete(key);
        });

        body.set('format', exportFormat);
        body.set('orientation', orientation);
        body.set('group_by', groupBy);
        body.delete('sections[]');
        body.delete('sections');
        selectedSections().forEach((section) => {
            body.append('sections[]', section);
        });

        try {
            const response = await fetch(storeMedalsReportExport.url(), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                            ?.content ?? '',
                },
                body,
            });

            if (!response.ok) {
                throw new Error(t('Unable to queue this export.'));
            }

            setExportStatus((await response.json()) as ExportStatus);
        } catch (error) {
            setExportError(
                error instanceof Error
                    ? error.message
                    : t('Unable to queue this export.'),
            );
        } finally {
            setIsGeneratingExport(false);
        }
    };

    const printDocument = () => {
        if (isBrowserPrintTooLarge) {
            window.alert(
                t('This report is too large for browser print. Please generate it in the background.'),
            );

            return;
        }

        const target = printTargetRef.current;

        if (!target) {
            window.print();

            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=800');

        if (!printWindow) {
            window.print();

            return;
        }

        const styles = Array.from(document.querySelectorAll('style'))
            .map((style) => style.outerHTML)
            .join('\n');

        printWindow.document.open();
        printWindow.document.write(`<!doctype html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>${reportTitle}</title>
                    ${styles}
                    <style>
                        @media screen {
                            body { margin: 0; background: #ffffff; }
                            .print-controls { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${target.outerHTML}
                </body>
            </html>`);
        printWindow.document.close();

        let hasPrinted = false;
        const runPrint = () => {
            if (hasPrinted) {
                return;
            }

            hasPrinted = true;
            printWindow.focus();
            printWindow.print();
        };

        const images = Array.from(printWindow.document.images);

        if (images.length === 0) {
            setTimeout(runPrint, 100);

            return;
        }

        let loaded = 0;
        const markLoaded = () => {
            loaded += 1;

            if (loaded >= images.length) {
                setTimeout(runPrint, 100);
            }
        };

        images.forEach((image) => {
            if (image.complete) {
                markLoaded();

                return;
            }

            image.addEventListener('load', markLoaded, { once: true });
            image.addEventListener('error', markLoaded, { once: true });
        });

        setTimeout(runPrint, 700);
    };

    const goBack = () => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);

        [
            'tab',
            'group_by',
            'page_mode',
            'print_sections',
            'page',
            'per_page',
        ].forEach((key) => {
            params.delete(key);
        });

        const query = params.toString();
        window.location.href = `/reports/medals${query ? `?${query}` : ''}`;
    };

    const pageStyle = useMemo(
        () =>
            orientation === 'portrait'
                ? '@media print { @page { size: A4 portrait; margin: 10mm; } }'
                : '@media print { @page { size: A4 landscape; margin: 10mm; } }',
        [orientation],
    );

    const reportTitle = reportMeta?.title ?? (tab === 'detail' ? t('Medal Details') : t('Medal Tally'));
    const printsBothSections = hasTallySection && hasDetailSection;

    const tallyTotal = useMemo(
        () =>
            tallyRows.reduce(
                (acc, row) => ({
                    gold: acc.gold + row.GOLD,
                    silver: acc.silver + row.SILVER,
                    bronze: acc.bronze + row.BRONZE,
                    merit: acc.merit + row.MERIT,
                    calculated: acc.calculated + row.GOLD + row.SILVER + row.BRONZE + row.MERIT,
                    displayOnly: acc.displayOnly + row.display_only,
                }),
                {
                    gold: 0,
                    silver: 0,
                    bronze: 0,
                    merit: 0,
                    calculated: 0,
                    displayOnly: 0,
                },
            ),
        [tallyRows],
    );

    const medalChipClass = (medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT'): string => {
        switch (medal) {
            case 'GOLD':
                return 'medal-chip medal-chip-gold';
            case 'SILVER':
                return 'medal-chip medal-chip-silver';
            case 'BRONZE':
                return 'medal-chip medal-chip-bronze';
            default:
                return 'medal-chip medal-chip-merit';
        }
    };

    return (
        <>
            <Head title={t('Medal Report Print')} />
            <style>{`
                ${pageStyle}
                .print-root {
                    position: relative;
                    padding: 16px 22px 24px;
                    max-width: 1200px;
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
                    gap: 10px 16px;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding: 14px;
                    border: 1px solid #d9e2ec;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
                    box-shadow: 0 2px 10px #0206170d;
                }
                .print-toolbar-title {
                    flex: 1 1 100%;
                    font-size: 12px;
                    color: #475569;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .print-control-card {
                    display: inline-flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    align-items: center;
                }
                .print-option {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-right: 2px;
                }
                .print-option input {
                    margin: 0;
                    accent-color: #1d4ed8;
                }
                .print-actions {
                    display: inline-flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .print-button {
                    font-weight: 600;
                    border: 1px solid #0f172a;
                    background: #0f172a;
                    color: #fff;
                    border-radius: 10px;
                    padding: 9px 14px;
                    cursor: pointer;
                    box-shadow: 0 5px 16px #0f172a1f;
                }
                .print-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.55;
                    box-shadow: none;
                }
                .print-button-secondary {
                    background: #fff;
                    color: #0f172a;
                    border-radius: 10px;
                    padding: 9px 14px;
                    border: 1px solid #cbd5e1;
                }
                .print-button-accent {
                    border-color: #166534;
                    background: #166534;
                    color: #fff;
                }
                .export-select {
                    min-height: 34px;
                    border-radius: 9px;
                    border: 1px solid #cbd5e1;
                    background: #fff;
                    color: #0f172a;
                    font-weight: 600;
                    padding: 6px 10px;
                }
                .export-panel {
                    flex: 1 1 100%;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 10px;
                    border: 1px solid #f59e0b;
                    background: #fffbeb;
                    color: #92400e;
                    border-radius: 10px;
                    padding: 10px 12px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .export-status {
                    color: #475569;
                }
                .export-status-ready {
                    color: #166534;
                }
                .export-status-failed {
                    color: #991b1b;
                }
                .print-section-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 16px;
                    padding: 0 6px;
                    border-radius: 9999px;
                    font-size: 10px;
                    font-weight: 600;
                    color: #fff;
                    background: #1d4ed8;
                    margin-left: 4px;
                }
                .print-size-warning {
                    flex: 1 1 100%;
                    border: 1px solid #f59e0b;
                    background: #fffbeb;
                    color: #92400e;
                    border-radius: 10px;
                    padding: 9px 12px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .letterhead {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    margin-bottom: 8px;
                    padding: 2px 0 12px;
                    border-bottom: 3px solid #0f172a;
                    position: relative;
                    text-align: center;
                }
                .letterhead::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -3px;
                    height: 1px;
                    background: #f8fafc;
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
                    letter-spacing: 0.01em;
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
                .doc-meta {
                    color: #475569;
                    font-size: 11px;
                }
                .section {
                    margin-top: 12px;
                    padding: 0;
                    background: #fff;
                }
                .section + .section {
                    margin-top: 18px;
                }
                .section-title {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    margin: 0 0 10px;
                    padding-bottom: 6px;
                    border-bottom: 1px solid #e2e8f0;
                    color: #0f172a;
                    font-weight: 700;
                    letter-spacing: 0.01em;
                }
                .summary-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    justify-content: center;
                    font-size: 10.5px;
                    flex-wrap: wrap;
                    text-align: center;
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
                    padding: 6px 7px;
                    vertical-align: middle !important;
                    text-align: center !important;
                    overflow-wrap: anywhere;
                }
                td[rowspan] {
                    vertical-align: middle !important;
                }
                .col-medal {
                    min-width: 58px;
                }
                .col-pno {
                    min-width: 72px;
                }
                th {
                    background: #f3f4f6;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                    color: #334155;
                    font-weight: 700;
                }
                .text-right {
                    text-align: center;
                }
                .font-medium {
                    font-weight: 600;
                }
                .muted {
                    color: #64748b;
                    font-size: 10px;
                    text-align: center;
                }
                tr:nth-child(even) td {
                    background: #fafafa;
                }
                .tier-group-row td {
                    background: #e5e7eb !important;
                    color: #0f172a;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }
                .medal-chip {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 48px;
                    margin: 0 auto;
                    border-radius: 999px;
                    padding: 2px 8px;
                    color: #fff;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    white-space: nowrap;
                }
                .medal-chip-gold {
                    background: #b45309;
                }
                .medal-chip-silver {
                    background: #475569;
                }
                .medal-chip-bronze {
                    background: #9a3412;
                    font-size: 8px;
                }
                .medal-chip-merit {
                    background: #1d4ed8;
                }
                .section-footer {
                    display: none;
                }
                .print-spacer {
                    height: 6px;
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
                        font-size: 10px;
                    }
                }
            `}</style>

            <div ref={printTargetRef} className="print-root">
                <div className="print-controls">
                    <div className="print-toolbar-title">{t('Medal Report Print')}</div>

                    <div className="print-control-card">
                        <span className="print-option font-medium">
                            {t('Sections')}
                            <span className="print-section-badge">2</span>:
                        </span>
                        <label className="print-option">
                            <input
                                type="checkbox"
                                checked={hasTallySection}
                                onChange={() => {
                                    handleSectionChange('tally');
                                }}
                            />
                            <span>{t(sectionLabel('tally'))}</span>
                        </label>
                        <label className="print-option">
                            <input
                                type="checkbox"
                                checked={hasDetailSection}
                                onChange={() => {
                                    handleSectionChange('detail');
                                }}
                            />
                            <span>{t(sectionLabel('detail'))}</span>
                        </label>
                    </div>

                    <div className="print-control-card">
                        <span className="print-option font-medium">
                            {t('Page orientation')}:
                        </span>
                        <label className="print-option">
                            <input
                                type="radio"
                                name="medals-page-orientation"
                                checked={orientation === 'portrait'}
                                onChange={() => {
                                    handleOrientationChange('portrait');
                                }}
                            />
                            <span>{t('Portrait')}</span>
                        </label>
                        <label className="print-option">
                            <input
                                type="radio"
                                name="medals-page-orientation"
                                checked={orientation === 'landscape'}
                                onChange={() => {
                                    handleOrientationChange('landscape');
                                }}
                            />
                            <span>{t('Landscape')}</span>
                        </label>
                    </div>

                    <div className="print-actions">
                        <button
                            type="button"
                            className="print-button"
                            onClick={printDocument}
                            disabled={isBrowserPrintTooLarge}
                        >
                            {t('Print')}
                        </button>
                        <button
                            type="button"
                            className="print-button print-button-secondary"
                            onClick={goBack}
                        >
                            {t('Back')}
                        </button>
                    </div>

                    {isBrowserPrintTooLarge && (
                        <div className="export-panel">
                            <span>
                                {t('This report has too many rows for browser print. Generate it in the background.')}
                                {' '}
                                {t('Rows')}: {printableRowCount}
                            </span>
                            <label className="print-option">
                                <span>{t('Format')}:</span>
                                <select
                                    className="export-select"
                                    value={exportFormat}
                                    onChange={(event) => {
                                        setExportFormat(event.target.value as ExportFormat);
                                    }}
                                >
                                    <option value="pdf">{t('PDF')}</option>
                                    <option value="xlsx">{t('Excel')}</option>
                                </select>
                            </label>
                            <button
                                type="button"
                                className="print-button print-button-accent"
                                onClick={startExport}
                                disabled={isGeneratingExport}
                            >
                                {isGeneratingExport
                                    ? t('Queuing...')
                                    : t('Generate Report')}
                            </button>
                            {exportStatus && (
                                <span
                                    className={
                                        exportStatus.status === 'completed'
                                            ? 'export-status-ready'
                                            : exportStatus.status === 'failed'
                                              ? 'export-status-failed'
                                              : 'export-status'
                                    }
                                >
                                    {t('Status')}: {t(exportStatus.status)}
                                </span>
                            )}
                            {exportStatus?.download_url && (
                                <a
                                    className="print-button print-button-secondary"
                                    href={exportStatus.download_url}
                                >
                                    {t('Download')}
                                </a>
                            )}
                            {(exportError || exportStatus?.error_message) && (
                                <span className="export-status-failed">
                                    {exportError ?? exportStatus?.error_message}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="letterhead">
                    <img
                        className="letterhead-logo"
                        src={LETTERHEAD_LOGO_SRC}
                        alt={t(PAGE_TITLE)}
                    />
                    <div>
                        <div className="letterhead-title">{t(PAGE_TITLE)}</div>
                        <div className="letterhead-subtitle">{t('UP Police Sports Control Board')}</div>
                    </div>
                </div>

                <div className="doc-title">{t(reportTitle)}</div>
                <div className="doc-info">
                    <span className="doc-meta">{t('Printed')}: {reportMeta.printedAt}</span>
                    <span className="doc-meta">
                        {tab === 'tally'
                            ? `${t('Grouping')}: ${t(groupBy)}`
                            : `${t('Source')}: ${t('Medal Details')}`}
                    </span>
                </div>

                {hasTallySection && (
                    <div className="section">
                        {printsBothSections && (
                            <h2 className="section-title">{t('Medal Tally')}</h2>
                        )}

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="text-right">
                                            {t('Rank')}
                                        </th>
                                        <th>{t('Tier')}</th>
                                        <th className="text-right">
                                            {t('Gold')}
                                        </th>
                                        <th className="text-right">
                                            {t('Silver')}
                                        </th>
                                        <th className="text-right">
                                            {t('Bronze')}
                                        </th>
                                        <th className="text-right">
                                            {t('Merit')}
                                        </th>
                                        <th className="text-right">
                                            {t('Calculated')}
                                        </th>
                                        <th className="text-right">
                                            {t('Display only')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tallyRows.length > 0 ? (
                                        tallyRows.map((row, index) => {
                                            const calculated = row.GOLD + row.SILVER + row.BRONZE + row.MERIT;

                                            return (
                                                <tr key={row.tier.code + row.tier.label + index}>
                                                    <td className="text-right">{index + 1}</td>
                                                    <td>
                                                        {row.tier.label}
                                                        <div className="muted">{row.tier.code}</div>
                                                    </td>
                                                    <td className="text-right">{row.GOLD}</td>
                                                    <td className="text-right">{row.SILVER}</td>
                                                    <td className="text-right">{row.BRONZE}</td>
                                                    <td className="text-right">{row.MERIT}</td>
                                                    <td className="text-right font-medium">{calculated}</td>
                                                    <td className="text-right">{row.display_only}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="muted">
                                                {t('No data')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {tallyRows.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={2} className="font-medium">
                                                {t('Total')}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.gold}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.silver}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.bronze}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.merit}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.calculated}
                                            </td>
                                            <td className="text-right font-medium">
                                                {tallyTotal.displayOnly}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        <div className="section-footer">
                            {t('Generated on official medal records only.')}
                        </div>
                    </div>
                )}

                {hasDetailSection && (
                    <div className="section">
                        {printsBothSections && (
                            <h2 className="section-title">{t('Medal Details')}</h2>
                        )}

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="text-right">
                                            {t('S. No.')}
                                        </th>
                                        <th className="col-medal">{t('Medal')}</th>
                                        <th>{t('Athlete')}</th>
                                        <th className="col-pno">{t('PNO')}</th>
                                        <th>{t('Rank')}</th>
                                        <th>{t('Posting')}</th>
                                        <th>{t('Sport')}</th>
                                        <th>{t('Event / Weight')}</th>
                                        <th>{t('Tournament')}</th>
                                        <th>{t('Session')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailRows.length > 0 ? (
                                        (() => {
                                            let medalSerial = 0;
                                            let previousMedalKey = '';
                                            let previousTierLabel = '';
                                            let previousSessionKey = '';
                                            let previousMedalTypeKey = '';
                                            let previousTournamentKey = '';
                                            let previousSportKey = '';

                                            return detailRows.flatMap((row, index) => {
                                                const renderedRows = [];
                                                const tierLabel = row.tournament.tier_label ?? t('Other');
                                                const sessionKey = row.session_name ?? '__missing_session__';
                                                const sessionLabel = row.session_name ?? '';
                                                const isTeam = isTeamEventMedal(row);
                                                const medalKey = isTeam
                                                    ? `team:${teamEventGroupKey(row)}`
                                                    : `individual:${row.id}:${row.member.id ?? index}`;
                                                const medalTypeKey = `${tierLabel}:${sessionKey}:${row.medal_type}`;
                                                const tournamentKey = [
                                                    tierLabel,
                                                    sessionKey,
                                                    row.medal_type,
                                                    row.tournament.name,
                                                    row.tournament.date_from,
                                                    row.tournament.date_to,
                                                ].join(':');
                                                const sportKey = `${tournamentKey}:${row.sport?.name ?? '__missing_sport__'}`;
                                                const startsMedal = medalKey !== previousMedalKey;
                                                const startsTier = tierLabel !== previousTierLabel;
                                                const startsSession = startsTier || sessionKey !== previousSessionKey;
                                                const startsMedalType =
                                                    !isTeam &&
                                                    (startsTier ||
                                                        startsSession ||
                                                        medalTypeKey !== previousMedalTypeKey ||
                                                        isTeamEventMedal(detailRows[index - 1]));
                                                const startsTournament =
                                                    startsTier ||
                                                    startsSession ||
                                                    startsMedalType ||
                                                    tournamentKey !== previousTournamentKey;
                                                const startsSport =
                                                    startsTier ||
                                                    startsSession ||
                                                    startsMedalType ||
                                                    startsTournament ||
                                                    sportKey !== previousSportKey;

                                                if (startsTier) {
                                                    previousTierLabel = tierLabel;
                                                    renderedRows.push(
                                                        <tr
                                                            key={`tier-${tierLabel}-${index}`}
                                                            className="tier-group-row"
                                                        >
                                                            <td colSpan={10}>{tierLabel}</td>
                                                        </tr>,
                                                    );
                                                }

                                                if (startsMedal) {
                                                    medalSerial += 1;
                                                    previousMedalKey = medalKey;
                                                }

                                                previousSessionKey = sessionKey;
                                                previousMedalTypeKey = medalTypeKey;
                                                previousTournamentKey = tournamentKey;
                                                previousSportKey = sportKey;

                                                let teamRowSpan = 1;

                                                if (isTeam && startsMedal) {
                                                    for (
                                                        let nextIndex = index + 1;
                                                        nextIndex < detailRows.length;
                                                        nextIndex += 1
                                                    ) {
                                                        const nextRow = detailRows[nextIndex];

                                                        if (
                                                            !isTeamEventMedal(nextRow) ||
                                                            `team:${teamEventGroupKey(nextRow)}` !== medalKey
                                                        ) {
                                                            break;
                                                        }

                                                        teamRowSpan += 1;
                                                    }
                                                }

                                                let sessionRowSpan = 1;

                                                if (startsSession) {
                                                    for (
                                                        let nextIndex = index + 1;
                                                        nextIndex < detailRows.length;
                                                        nextIndex += 1
                                                    ) {
                                                        const nextRow = detailRows[nextIndex];

                                                        if (
                                                            (nextRow.tournament.tier_label ?? t('Other')) !== tierLabel ||
                                                            (nextRow.session_name ?? '__missing_session__') !== sessionKey
                                                        ) {
                                                            break;
                                                        }

                                                        sessionRowSpan += 1;
                                                    }
                                                }

                                                let medalTypeRowSpan = 1;

                                                if (startsMedalType) {
                                                    for (
                                                        let nextIndex = index + 1;
                                                        nextIndex < detailRows.length;
                                                        nextIndex += 1
                                                    ) {
                                                        const nextRow = detailRows[nextIndex];

                                                        if (
                                                            isTeamEventMedal(nextRow) ||
                                                            (nextRow.tournament.tier_label ?? t('Other')) !== tierLabel ||
                                                            (nextRow.session_name ?? '__missing_session__') !== sessionKey ||
                                                            nextRow.medal_type !== row.medal_type
                                                        ) {
                                                            break;
                                                        }

                                                        medalTypeRowSpan += 1;
                                                    }
                                                }

                                                let tournamentRowSpan = 1;

                                                if (startsTournament) {
                                                    for (
                                                        let nextIndex = index + 1;
                                                        nextIndex < detailRows.length;
                                                        nextIndex += 1
                                                    ) {
                                                        const nextRow = detailRows[nextIndex];

                                                        if (
                                                            (nextRow.tournament.tier_label ?? t('Other')) !== tierLabel ||
                                                            (nextRow.session_name ?? '__missing_session__') !== sessionKey ||
                                                            nextRow.medal_type !== row.medal_type ||
                                                            nextRow.tournament.name !== row.tournament.name ||
                                                            nextRow.tournament.date_from !== row.tournament.date_from ||
                                                            nextRow.tournament.date_to !== row.tournament.date_to
                                                        ) {
                                                            break;
                                                        }

                                                        tournamentRowSpan += 1;
                                                    }
                                                }

                                                let sportRowSpan = 1;

                                                if (startsSport) {
                                                    for (
                                                        let nextIndex = index + 1;
                                                        nextIndex < detailRows.length;
                                                        nextIndex += 1
                                                    ) {
                                                        const nextRow = detailRows[nextIndex];

                                                        if (
                                                            (nextRow.tournament.tier_label ?? t('Other')) !== tierLabel ||
                                                            (nextRow.session_name ?? '__missing_session__') !== sessionKey ||
                                                            nextRow.medal_type !== row.medal_type ||
                                                            nextRow.tournament.name !== row.tournament.name ||
                                                            nextRow.tournament.date_from !== row.tournament.date_from ||
                                                            nextRow.tournament.date_to !== row.tournament.date_to ||
                                                            (nextRow.sport?.name ?? '__missing_sport__') !==
                                                                (row.sport?.name ?? '__missing_sport__')
                                                        ) {
                                                            break;
                                                        }

                                                        sportRowSpan += 1;
                                                    }
                                                }

                                                renderedRows.push(
                                                    <tr key={`${row.id}-${row.member.id ?? 'team'}-${index}`}>
                                                        {(!isTeam || startsMedal) && (
                                                            <td rowSpan={isTeam ? teamRowSpan : undefined}>
                                                                {medalSerial}
                                                            </td>
                                                        )}
                                                        {(isTeam ? startsMedal : startsMedalType) && (
                                                            <td rowSpan={isTeam ? teamRowSpan : medalTypeRowSpan}>
                                                                <span className={medalChipClass(row.medal_type)}>
                                                                    {row.medal_type}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td>{row.member.full_name}</td>
                                                        <td>{row.member.pno ?? ''}</td>
                                                        <td>{row.member.rank ?? ''}</td>
                                                        <td>{row.member.unit_name ?? ''}</td>
                                                        {startsSport && (
                                                            <td rowSpan={sportRowSpan}>
                                                                {row.sport?.name ?? ''}
                                                            </td>
                                                        )}
                                                        {(!isTeam || startsMedal) && (
                                                            <td rowSpan={isTeam ? teamRowSpan : undefined}>
                                                                {row.event.weight_category ?? row.event.name}
                                                                {isTeam && <div className="muted">{t('Team')}</div>}
                                                            </td>
                                                        )}
                                                        {startsTournament && (
                                                            <td rowSpan={tournamentRowSpan}>
                                                                {row.tournament.name}
                                                                <div className="muted">
                                                                    {[
                                                                        formatDate(row.tournament.date_from),
                                                                        formatDate(row.tournament.date_to),
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(' - ')}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {startsSession && (
                                                            <td rowSpan={sessionRowSpan}>
                                                                {sessionLabel}
                                                            </td>
                                                        )}
                                                    </tr>,
                                                );

                                                return renderedRows;
                                            });
                                        })()
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="muted">
                                                {t('No data')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="section-footer">
                            {t('Prepared for official use and publication.')}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
