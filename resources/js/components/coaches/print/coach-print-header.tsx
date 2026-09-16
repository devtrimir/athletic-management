import { LETTERHEAD_LOGO_SRC } from './types';

export function CoachPrintHeader({ t }: { t: (key: string) => string }) {
    return (
        <div className="relative z-10 flex items-center gap-4 border-b-2 border-neutral-900 pb-3 print:gap-3 print:pb-2">
            <img
                src={LETTERHEAD_LOGO_SRC}
                alt={t('UP Police Sports Control Board')}
                className="size-20 shrink-0 object-contain print:size-16"
            />
            <div className="min-w-0 flex-1 text-center">
                <div className="text-lg font-bold tracking-wide uppercase print:text-[16px]">
                    {t('UP Police Sports Control Board')}
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-700 uppercase print:text-[11px] print:text-black">
                    {t('Coach profile record')}
                </div>
                <div className="mt-1 text-xs text-muted-foreground print:text-[9px] print:text-neutral-700">
                    {t('Official print preview')}
                </div>
            </div>
            <div className="hidden w-20 print:block" aria-hidden="true" />
        </div>
    );
}
