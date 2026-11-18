const ATTENDANCE_MODE_HINTS: Record<string, string> = {
    single_mark: 'The coach marks attendance once per training day.',
    check_in_check_out:
        'The coach records check-in and check-out; the session duration is calculated.',
};

/** "pending_approval" -> "Pending approval". */
export function humanize(value: string): string {
    const text = value.replaceAll('_', ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Translates a raw value key ("pending_approval", "monday", "single_mark")
 * through the language files, falling back to readable text when no entry
 * exists yet.
 */
export function translateValue(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    if (!value) {
        return '-';
    }

    const translated = t(value);

    return translated !== value ? translated : humanize(value);
}

export const attendanceModeLabel = translateValue;

export function attendanceModeHint(
    mode: string | null | undefined,
    t: (key: string) => string,
): string {
    return mode && ATTENDANCE_MODE_HINTS[mode]
        ? t(ATTENDANCE_MODE_HINTS[mode])
        : '';
}
