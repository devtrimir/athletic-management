import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-sidebar-primary/40 shrink-0">
                <img src="/logo.jpg" alt="UP Police" className="size-full object-cover" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
