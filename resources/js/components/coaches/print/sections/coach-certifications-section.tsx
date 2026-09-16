import { formatDate, hasAnyValue } from '../helpers';
import { Section } from '../shared';
import type { CoachCertification } from '../types';

export function CoachCertificationsSection({
    certifications,
    t,
}: {
    certifications: CoachCertification[];
    t: (key: string) => string;
}) {
    if (certifications.length === 0) {
        return null;
    }

    const showCertType = hasAnyValue(certifications, (c) => c.certificate_type);
    const showCertIssuer = hasAnyValue(certifications, (c) => c.issuer);
    const showCertIssuedAt = hasAnyValue(certifications, (c) => c.issued_at);
    const showCertExpiredAt = hasAnyValue(certifications, (c) => c.expired_at);

    return (
        <Section title={t('Certifications')}>
            <div className="overflow-hidden rounded-md border print:rounded-sm">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase print:text-[9px]">
                        <tr>
                            <th className="w-10 border p-1.5 text-center align-top">
                                {t('S. No.')}
                            </th>
                            <th className="border p-1.5">{t('Certificate')}</th>
                            {showCertType && (
                                <th className="border p-1.5">{t('Type')}</th>
                            )}
                            {showCertIssuer && (
                                <th className="border p-1.5">{t('Issuer')}</th>
                            )}
                            {showCertIssuedAt && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Issued at')}
                                </th>
                            )}
                            {showCertExpiredAt && (
                                <th className="border p-1.5 whitespace-nowrap">
                                    {t('Expired at')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="print:text-[10px]">
                        {certifications.map((cert, index) => (
                            <tr
                                key={cert.id}
                                className="border-t print:align-top"
                            >
                                <td className="border p-1.5 text-center text-muted-foreground print:py-0.5">
                                    {index + 1}
                                </td>
                                <td className="border p-1.5 font-medium text-foreground print:py-0.5">
                                    {cert.name}
                                </td>
                                {showCertType && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {cert.certificate_type || '—'}
                                    </td>
                                )}
                                {showCertIssuer && (
                                    <td className="border p-1.5 print:py-0.5">
                                        {cert.issuer || '—'}
                                    </td>
                                )}
                                {showCertIssuedAt && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {formatDate(cert.issued_at) || '—'}
                                    </td>
                                )}
                                {showCertExpiredAt && (
                                    <td className="border p-1.5 whitespace-nowrap print:py-0.5">
                                        {formatDate(cert.expired_at) || '—'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}
