/**
 * Formats a date string, Date object, or timestamp to DD/MM/YYYY (e.g., "01/05/1995").
 */
export function formatDate(
    value: string | Date | number | null | undefined,
    fallback: string = '',
): string {
    if (!value) {
        return fallback;
    }

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return fallback;
        }

        const day = String(value.getDate()).padStart(2, '0');
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const year = value.getFullYear();

        return `${day}/${month}/${year}`;
    }

    if (typeof value === 'number') {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return fallback;
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return fallback;
        }

        // If already DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
            return trimmed;
        }

        // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss... (safe parsing without timezone offset bug)
        const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);

        if (isoMatch) {
            const [, year, month, day] = isoMatch;

            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }

        // DD-MM-YYYY
        const dmyDashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);

        if (dmyDashMatch) {
            const [, day, month, year] = dmyDashMatch;

            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }

        // Fallback to JS Date parsing
        const date = new Date(trimmed);

        if (Number.isNaN(date.getTime())) {
            return fallback;
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    return fallback;
}

/**
 * Formats a start and end date range in DD/MM/YYYY format (e.g., "01/05/1995 - 05/05/1995").
 */
export function formatDateRange(
    start: string | Date | number | null | undefined,
    end: string | Date | number | null | undefined,
    separator: string = ' - ',
    fallback: string = '—',
): string {
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    if (formattedStart && formattedEnd) {
        return formattedStart === formattedEnd
            ? formattedStart
            : `${formattedStart}${separator}${formattedEnd}`;
    }

    if (formattedStart) {
        return formattedStart;
    }

    if (formattedEnd) {
        return formattedEnd;
    }

    return fallback;
}
