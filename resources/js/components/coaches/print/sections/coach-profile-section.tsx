import { formatDate, genderLabel, humanize, rankLabel } from '../helpers';
import { DetailsTable, Section } from '../shared';
import type { Coach } from '../types';

export function CoachProfileSection({
    coach,
    t,
}: {
    coach: Coach;
    t: (key: string) => string;
}) {
    return (
        <Section title={t('Profile details')}>
            <div className="flex items-start gap-4 print:gap-3">
                <div className="min-w-0 flex-1 space-y-3 print:space-y-2">
                    <div>
                        <div className="text-2xl leading-tight font-bold text-foreground print:text-[16px]">
                            {coach.full_name}
                        </div>
                        <div className="mt-2 border-b border-neutral-200 print:mt-1.5" />
                    </div>
                    <DetailsTable
                        rows={[
                            {
                                label: t('PNO'),
                                value: coach.pno ? (
                                    <span className="font-mono">
                                        {coach.pno}
                                    </span>
                                ) : null,
                            },
                            {
                                label: t('Rank'),
                                value: rankLabel(coach),
                            },
                            {
                                label: t('Gender'),
                                value: genderLabel(coach.gender),
                            },
                            {
                                label: t('Date of birth'),
                                value: formatDate(coach.date_of_birth),
                            },
                            {
                                label: t('Blood group'),
                                value: coach.blood_group,
                            },
                            {
                                label: t('Status'),
                                value: humanize(coach.coach_status),
                            },
                        ]}
                    />
                </div>
                <div className="size-28 shrink-0 overflow-hidden rounded-md border bg-muted print:size-24">
                    {coach.photo_path ? (
                        <img
                            src={`/storage/${coach.photo_path}`}
                            alt={coach.full_name}
                            className="size-full object-cover"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground print:text-[9px]">
                            {t('No photo')}
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
}
