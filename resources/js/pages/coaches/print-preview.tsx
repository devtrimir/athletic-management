import { Head, usePage } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import {
    CoachAchievementsSection,
    CoachAssignmentsSection,
    CoachCertificationsSection,
    CoachPlayingAchievementsSection,
    CoachPrintHeader,
    CoachPrintToolbar,
    CoachProfileSection,
    CoachPromotionsSection,
    CoachServiceSection,
    CoachSpecialAchievementsSection,
    CoachSportsSection,
    CoachStatusSection,
    DEFAULT_SECTIONS,
    LETTERHEAD_LOGO_SRC,
} from '@/components/coaches/print';
import type {
    CoachPrintPreviewProps,
    SectionKey,
} from '@/components/coaches/print';
import { useTranslation } from '@/hooks/use-translation';

export default function CoachPrintPreview({
    coach,
    coachTeams = [],
    statusHistory = [],
    coachAchievements,
    specialAchievements,
    playingAchievements,
    ranks = [],
}: CoachPrintPreviewProps) {
    const { t } = useTranslation();
    const { locale = 'en' } = usePage().props as { locale?: string };
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const [selectedSections, setSelectedSections] =
        useState<SectionKey[]>(DEFAULT_SECTIONS);
    const enabled = (section: SectionKey) => selectedSections.includes(section);

    const filename = useMemo(() => {
        const safeName = coach.full_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const date = new Date().toISOString().slice(0, 10);

        return `uppscb-coach-${safeName || coach.id}-${coach.pno || 'no-pno'}-${date}`;
    }, [coach.full_name, coach.id, coach.pno]);

    function handlePrint(): void {
        const target = printTargetRef.current;

        if (!target) {
            return;
        }

        document.title = filename;

        // Reparent the sheet to <body> for the duration of the print so the
        // print-isolation CSS only has to hide top-level siblings. Restored
        // on afterprint (fires even when the dialog is cancelled).
        const parent = target.parentNode;
        const nextSibling = target.nextSibling;
        document.body.appendChild(target);

        const restore = (): void => {
            window.removeEventListener('afterprint', restore);

            if (!parent) {
                return;
            }

            if (nextSibling) {
                parent.insertBefore(target, nextSibling);
            } else {
                parent.appendChild(target);
            }
        };

        window.addEventListener('afterprint', restore);
        window.print();
    }

    function toggleSection(section: SectionKey): void {
        setSelectedSections((current) =>
            current.includes(section)
                ? current.filter((item) => item !== section)
                : [...current, section],
        );
    }

    const sports = coach.sports ?? [];
    const certifications = coach.certifications ?? [];
    const promotions = coach.promotions ?? [];

    return (
        <>
            <Head title={`${coach.full_name} - ${t('Print preview')}`} />

            <div
                ref={printTargetRef}
                id="quick-view-print-target"
                className="relative mx-auto max-w-5xl space-y-4 overflow-hidden rounded-2xl border border-neutral-300 bg-white p-4 text-black shadow-sm print:max-w-none print:space-y-2 print:rounded-none print:border-0 print:p-0 print:text-[10px] print:leading-4 print:shadow-none"
            >
                <div className="pointer-events-none absolute inset-0 hidden print:block">
                    <div className="absolute inset-0 border border-neutral-300/70" />
                    <div className="absolute inset-3 border border-dashed border-neutral-300/60" />
                </div>
                <img
                    src={LETTERHEAD_LOGO_SRC}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 z-0 hidden size-[520px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.045] print:block"
                />

                <CoachPrintToolbar
                    coach={coach}
                    selectedSections={selectedSections}
                    onToggleSection={toggleSection}
                    onPrint={handlePrint}
                    t={t}
                />

                <CoachPrintHeader t={t} />

                <div className="relative z-10 grid gap-3 print:gap-2">
                    {enabled('profile') && (
                        <CoachProfileSection coach={coach} t={t} />
                    )}

                    {enabled('service') && (
                        <CoachServiceSection coach={coach} t={t} />
                    )}

                    {enabled('sports') && sports.length > 0 && (
                        <CoachSportsSection sports={sports} t={t} />
                    )}

                    {enabled('assignments') && coachTeams.length > 0 && (
                        <CoachAssignmentsSection
                            coachTeams={coachTeams}
                            t={t}
                        />
                    )}

                    {enabled('achievements') &&
                        (coachAchievements?.groups?.length ?? 0) > 0 && (
                            <CoachAchievementsSection
                                coachAchievements={coachAchievements}
                                locale={locale}
                                t={t}
                            />
                        )}

                    {enabled('specialAchievements') &&
                        (specialAchievements?.records?.length ?? 0) > 0 && (
                            <CoachSpecialAchievementsSection
                                specialAchievements={specialAchievements}
                                t={t}
                            />
                        )}

                    {enabled('playingAchievements') &&
                        (playingAchievements?.records?.length ?? 0) > 0 && (
                            <CoachPlayingAchievementsSection
                                playingAchievements={playingAchievements}
                                locale={locale}
                                t={t}
                            />
                        )}

                    {enabled('certifications') && certifications.length > 0 && (
                        <CoachCertificationsSection
                            certifications={certifications}
                            t={t}
                        />
                    )}

                    {enabled('promotions') && (
                        <CoachPromotionsSection
                            promotions={promotions}
                            ranks={ranks}
                            locale={locale}
                            t={t}
                        />
                    )}

                    {enabled('status') && statusHistory.length > 0 && (
                        <CoachStatusSection
                            statusHistory={statusHistory}
                            t={t}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
