const ATTENDANCE_MODES: Record<string, { label: string; hint: string }> = {
    single_mark: {
        label: 'Single mark',
        hint: 'The coach marks attendance once per training day.',
    },
    check_in_check_out: {
        label: 'Check-in & check-out',
        hint: 'The coach records check-in and check-out; the session duration is calculated.',
    },
};

/** "single_mark" -> "Single mark"; unknown values are title-cased. */
export function attendanceModeLabel(
    mode: string | null | undefined,
    t: (key: string) => string,
): string {
    if (!mode) {
        return '-';
    }

    return t(ATTENDANCE_MODES[mode]?.label ?? humanize(mode));
}

export function attendanceModeHint(
    mode: string | null | undefined,
    t: (key: string) => string,
): string {
    return mode && ATTENDANCE_MODES[mode] ? t(ATTENDANCE_MODES[mode].hint) : '';
}

/** "pending_approval" -> "Pending approval". */
export function humanize(value: string): string {
    const text = value.replaceAll('_', ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}
