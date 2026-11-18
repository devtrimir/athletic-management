export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    combined: 'Combined (all documents in one PDF)',
    aadhaar: 'Aadhaar card',
    pan: 'PAN card',
    certificate: 'Certificate',
    police_verification: 'Police verification',
    other: 'Other',
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS);

export function documentTypeLabel(
    type: string,
    t: (key: string) => string,
): string {
    return t(DOCUMENT_TYPE_LABELS[type] ?? type);
}
