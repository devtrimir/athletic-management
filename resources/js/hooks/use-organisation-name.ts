import { usePage } from '@inertiajs/react';

/** Organisation name for the active language, as maintained in Settings → Organisation. */
export function useOrganisationName(): string {
    return usePage().props.organisation.name;
}
