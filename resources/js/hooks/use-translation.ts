import { usePage } from '@inertiajs/react';

export function useTranslation() {
    const { translations } = usePage().props;

    function t(key: string): string {
        return translations[key] ?? key;
    }

    return { t };
}
