import { usePage } from '@inertiajs/react';

import type { Auth } from '@/types';

type Authorization = {
    permissions: Set<string>;
    can: (permission: string) => boolean;
    canAny: (permissions: string[]) => boolean;
    canAll: (permissions: string[]) => boolean;
};

export function useAuthorization(): Authorization {
    const { auth } = usePage().props as { auth?: Partial<Auth> };
    const permissions = new Set(auth?.permissions ?? []);

    return {
        permissions,
        can: (permission: string): boolean => permissions.has(permission),
        canAny: (requiredPermissions: string[]): boolean =>
            requiredPermissions.some((permission) =>
                permissions.has(permission),
            ),
        canAll: (requiredPermissions: string[]): boolean =>
            requiredPermissions.every((permission) =>
                permissions.has(permission),
            ),
    };
}
