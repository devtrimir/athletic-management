export function genderLabel(
    gender: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (gender) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return gender ?? '-';
    }
}

export function coachRoleLabel(
    role: string | null | undefined,
    t: (key: string) => string,
): string {
    if (!role) {
        return '';
    }

    const normalized = role.trim().toUpperCase();

    if (normalized === 'HEAD') {
        return t('Head Coach');
    }

    if (normalized === 'ASSISTANT') {
        return t('Assistant Coach');
    }

    return role
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
