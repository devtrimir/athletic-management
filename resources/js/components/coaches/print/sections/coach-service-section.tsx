import { DetailsTable, Section } from '../shared';
import type { Coach } from '../types';

export function CoachServiceSection({
    coach,
    t,
}: {
    coach: Coach;
    t: (key: string) => string;
}) {
    return (
        <Section title={t('Service and contact')}>
            <DetailsTable
                rows={[
                    {
                        label: t('Mobile'),
                        value: coach.mobile,
                    },
                    {
                        label: t('Email'),
                        value: coach.email,
                    },
                    {
                        label: t('Unit'),
                        value: coach.unit?.name,
                    },
                    {
                        label: t('District'),
                        value: coach.district?.name,
                    },
                    {
                        label: t('Address'),
                        value: coach.address,
                    },
                    {
                        label: t('Bio'),
                        value: coach.bio,
                    },
                ]}
            />
        </Section>
    );
}
