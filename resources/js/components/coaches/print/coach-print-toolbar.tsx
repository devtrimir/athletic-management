import { Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DEFAULT_SECTIONS, SECTION_LABELS } from './types';
import type { Coach, SectionKey } from './types';

export function CoachPrintToolbar({
    coach,
    selectedSections,
    onToggleSection,
    onPrint,
    t,
    showPromotionPlayers,
    onToggleShowPromotionPlayers,
}: {
    coach: Coach;
    selectedSections: SectionKey[];
    onToggleSection: (section: SectionKey) => void;
    onPrint: () => void;
    t: (key: string) => string;
    showPromotionPlayers?: boolean;
    onToggleShowPromotionPlayers?: () => void;
}) {
    return (
        <>
            <div className="flex items-start justify-between gap-4 print:hidden">
                <div className="flex items-start gap-4">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                            {[t('Coaches'), coach.full_name].join(' / ')}
                        </div>
                        <h1 className="text-2xl font-bold">
                            {t('Print preview')}
                        </h1>
                        <div className="pt-1">
                            <LocaleSwitcher />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={CoachController.show.url(coach)}>
                            <ArrowLeft className="mr-1.5 size-4" />
                            {t('Back')}
                        </Link>
                    </Button>
                    <Button type="button" onClick={onPrint}>
                        <Printer className="mr-1.5 size-4" />
                        {t('Print')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 print:hidden">
                <div className="text-sm font-semibold text-foreground">
                    {t('Print options')}
                </div>
                <div className="flex flex-wrap gap-2">
                    {DEFAULT_SECTIONS.map((section) => (
                        <label
                            key={section}
                            className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"
                        >
                            <Checkbox
                                checked={selectedSections.includes(section)}
                                onCheckedChange={() => onToggleSection(section)}
                            />
                            <span>{t(SECTION_LABELS[section])}</span>
                        </label>
                    ))}
                </div>
                {onToggleShowPromotionPlayers && (
                    <label className="flex w-fit items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm">
                        <Checkbox
                            checked={showPromotionPlayers}
                            onCheckedChange={onToggleShowPromotionPlayers}
                        />
                        <span>
                            {t('Show player data in promotions / rewards')}
                        </span>
                    </label>
                )}
            </div>
        </>
    );
}
