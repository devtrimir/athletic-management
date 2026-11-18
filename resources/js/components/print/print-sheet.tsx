import type { ReactNode } from 'react';
import { useTranslation } from '@/hooks/use-translation';

export type PrintOrientation = 'portrait' | 'landscape';

const LETTERHEAD_LOGO_SRC = '/logo.jpg';
const ORGANISATION = 'UP Police Sports Control Board (UPPSCB)';

/**
 * Official A4 print frame shared by standalone print pages: a screen-only
 * control bar, the letterhead, a document title with printed-at line, and the
 * report body. Styled to match the medal tally print.
 */
export function PrintSheet({
    title,
    printedAt,
    info = [],
    orientation,
    onOrientationChange,
    controls,
    children,
}: {
    title: string;
    printedAt: string;
    info?: string[];
    orientation: PrintOrientation;
    onOrientationChange: (orientation: PrintOrientation) => void;
    /** Extra controls (e.g. column toggles) shown in the screen-only bar. */
    controls?: ReactNode;
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <>
            <style>{`
                @media print { @page { size: A4 ${orientation}; margin: 10mm; } }
                .print-root { position: relative; padding: 16px 22px 24px; max-width: 1200px; margin: 0 auto; font-family: Arial, 'Helvetica Neue', sans-serif; color: #111827; line-height: 1.4; }
                .print-root::before { content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none; background: url('${LETTERHEAD_LOGO_SRC}') center 58% / 360px auto no-repeat; opacity: 0.06; }
                .print-root > * { position: relative; z-index: 1; }
                .print-controls { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 14px; border: 1px solid #d9e2ec; border-radius: 12px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); box-shadow: 0 2px 10px #0206170d; }
                .print-toolbar-title { flex: 1 1 100%; font-size: 12px; color: #475569; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 700; }
                .print-control-card { display: inline-flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; font-size: 13px; }
                .print-option { display: inline-flex; align-items: center; gap: 6px; }
                .print-option input { margin: 0; accent-color: #1d4ed8; }
                .print-label { font-weight: 600; }
                .print-actions { display: inline-flex; gap: 8px; align-items: center; }
                .print-button { font-weight: 600; border: 1px solid #0f172a; background: #0f172a; color: #fff; border-radius: 10px; padding: 9px 14px; cursor: pointer; box-shadow: 0 5px 16px #0f172a1f; }
                .print-button-secondary { background: #fff; color: #0f172a; border-color: #cbd5e1; box-shadow: none; }
                .letterhead { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 8px; padding: 2px 0 12px; border-bottom: 3px solid #0f172a; text-align: center; }
                .letterhead-logo { width: 72px; height: 72px; object-fit: contain; }
                .letterhead-title { font-weight: 700; font-size: 21px; letter-spacing: 0.01em; margin-bottom: 2px; }
                .letterhead-subtitle { color: #334155; font-size: 12px; letter-spacing: 0.02em; }
                .doc-title { margin: 12px 0 6px; font-size: 24px; font-weight: 700; text-align: center; }
                .doc-info { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 12px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; font-size: 11px; color: #475569; }
                .print-root table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 10px; }
                .print-root th, .print-root td { border: 1px solid #d1d5db; padding: 6px 7px; vertical-align: middle; text-align: center; overflow-wrap: anywhere; }
                .print-root th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.02em; color: #334155; font-weight: 700; }
                .print-root tbody tr:nth-child(even) td { background: #fafafa; }
                .print-root thead { display: table-header-group; }
                .print-root tr { break-inside: avoid; }
                .print-empty { padding: 28px; text-align: center; color: #64748b; }
                @media print {
                    html, body, #app { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 0 !important; background: #fff !important; }
                    .print-controls { display: none !important; }
                    .print-root { padding: 0; max-width: none; width: 100%; }
                }
            `}</style>

            <div className="print-root">
                <div className="print-controls">
                    <div className="print-toolbar-title">
                        {t('Print preview')}
                    </div>
                    {controls}
                    <div className="print-control-card">
                        <span className="print-label">
                            {t('Page orientation')}:
                        </span>
                        {(['portrait', 'landscape'] as const).map((value) => (
                            <label key={value} className="print-option">
                                <input
                                    type="radio"
                                    name="print-orientation"
                                    checked={orientation === value}
                                    onChange={() => onOrientationChange(value)}
                                />
                                <span>
                                    {t(
                                        value === 'portrait'
                                            ? 'Portrait'
                                            : 'Landscape',
                                    )}
                                </span>
                            </label>
                        ))}
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
                            onClick={() => window.history.back()}
                        >
                            {t('Back')}
                        </button>
                    </div>
                </div>

                <div className="letterhead">
                    <img
                        className="letterhead-logo"
                        src={LETTERHEAD_LOGO_SRC}
                        alt={t(ORGANISATION)}
                    />
                    <div>
                        <div className="letterhead-title">
                            {t(ORGANISATION)}
                        </div>
                        <div className="letterhead-subtitle">
                            {t('UP Police Sports Control Board')}
                        </div>
                    </div>
                </div>

                <div className="doc-title">{title}</div>
                <div className="doc-info">
                    <span>
                        {t('Printed')}: {printedAt}
                    </span>
                    {info.map((line) => (
                        <span key={line}>{line}</span>
                    ))}
                </div>

                {children}
            </div>
        </>
    );
}
