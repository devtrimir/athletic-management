import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import CoachPreviewController from '@/actions/App/Http/Controllers/Api/V1/CoachPreviewController';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type StatusHistoryItem = { status: string; effective_on: string; reason: string | null };
type TeamHistoryItem = { team_name: string | null; session_name: string | null; role: string; joined_on: string | null; left_on: string | null };
type AchievementItem = { period: string; level: string; competition_details: string; event: string | null; medal_type: string | null; event_date: string | null; venue: string | null };
type CertificationItem = { id: number; name: string; certificate_type: string | null; issuer: string | null; issued_at: string | null; expired_at: string | null; attachment_path: string | null; metadata: Record<string, unknown> | null };
type SportItem = { id: number; name: string; is_primary: boolean; level: string | null; effective_from: string | null; effective_to: string | null; notes: string | null };
type AssignmentHistoryItem = { id: number; role: string; team_name: string | null; session_name: string | null; is_current: boolean; assigned_at: string | null; removed_at: string | null; notes: string | null };

function genderLabel(gender: string | null, t: (key: string) => string): string {
    switch (gender) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return gender ?? '';
    }
}

type MemberRecord = {
    id: number;
    full_name: string;
    father_name: string | null;
    rank: string | null;
    gender: string | null;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    blood_group: string | null;
    caste: string | null;
    current_status: string;
    promotion_date: string | null;
    appointment: string | null;
    recruitment_type: string | null;
    sport_event: string | null;
    player_level: string | null;
    player_category: string | null;
    team_since: string | null;
    home_district: { name: string } | null;
    current_unit: { name: string } | null;
    sport: { name: string } | null;
    status_history: StatusHistoryItem[];
    team_history: TeamHistoryItem[];
    achievements: AchievementItem[];
};

type CoachPreview = {
    id: number;
    full_name: string;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    display_name: string | null;
    designation: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string | null;
    bio: string | null;
    address: string | null;
    photo_path: string | null;
    certifications: CertificationItem[];
    sports: SportItem[];
    assignment_history: AssignmentHistoryItem[];
    member: MemberRecord | null;
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'secondary',
    RETIRED: 'secondary',
};

const MEDAL_COLOR: Record<string, string> = {
    GOLD: 'text-yellow-600',
    SILVER: 'text-slate-500',
    BRONZE: 'text-orange-600',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b py-4 last:border-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) {
return null;
}

    return (
        <div className="grid grid-cols-[150px_1fr] gap-1 py-0.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function buildPrintHtml(data: CoachPreview, t: (k: string) => string): string {
    const row = (label: string, value: string | null | undefined) =>
        value ? `<div class="row"><span class="label">${label}</span><span class="val">${value}</span></div>` : '';

    const m = data.member;
    const certificationRows = data.certifications
        .map((c) => `<tr><td>${c.name}</td><td>${c.certificate_type ?? ''}</td><td>${c.issuer ?? ''}</td><td>${c.issued_at ?? ''}</td><td>${c.expired_at ?? ''}</td></tr>`)
        .join('');

    const sportRows = data.sports
        .map((s) => `<tr><td>${s.name}</td><td>${s.level ?? ''}</td><td>${s.is_primary ? t('Primary') : t('Secondary')}</td><td>${s.effective_from ?? ''}</td><td>${s.effective_to ?? ''}</td></tr>`)
        .join('');

    const assignmentRows = data.assignment_history
        .map((a) => `<tr><td>${a.role}</td><td>${a.team_name ?? ''}</td><td>${a.session_name ?? ''}</td><td>${a.is_current ? t('Current') : t('Historical')}</td><td>${a.assigned_at ?? ''}</td><td>${a.removed_at ?? ''}</td></tr>`)
        .join('');

    const statusRows = m?.status_history.map(
        (h) => `<tr><td>${h.effective_on}</td><td>${t(h.status)}</td><td>${h.reason ?? ''}</td></tr>`,
    ).join('') ?? '';

    const teamRows = m?.team_history.map(
        (th) => `<tr><td>${th.team_name ?? ''}</td><td>${th.session_name ?? ''}</td><td>${t(th.role)}</td><td>${th.joined_on ?? ''}</td><td>${th.left_on ?? ''}</td></tr>`,
    ).join('') ?? '';

    const achievementRows = m?.achievements.map(
        (a) => `<tr><td>${t(a.level)}</td><td>${a.competition_details}</td><td>${a.event ?? ''}</td><td>${a.medal_type ? t(a.medal_type) : ''}</td><td>${a.event_date ?? ''}</td></tr>`,
    ).join('') ?? '';

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.full_name}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:13px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:14px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}
        .header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:4px}
        .meta{font-size:12px;color:#555;font-family:monospace}
        .row{display:grid;grid-template-columns:150px 1fr;gap:4px;padding:1px 0}
        .label{color:#555}.val{font-weight:500}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{background:#f0f0f0;text-align:left;padding:4px 8px;font-size:12px;border:1px solid #ccc}
        td{padding:4px 8px;border:1px solid #ccc;font-size:12px}
        @media print{@page{margin:1cm}}
    </style></head><body>
    <div class="header">
        <h1>${data.full_name}${data.full_name ? ` <small>(${data.full_name})</small>` : ''}</h1>
        <span class="meta">${data.pno ?? ''} · ${data.nis_certified ? t('NIS Certified') : t('Not NIS Certified')}</span>
        ${data.designation ? `<p>${t('Designation')}: ${data.designation}</p>` : ''}
        ${data.coach_status ? `<p>${t('Status')}: ${t(data.coach_status)}</p>` : ''}
        ${data.email ? `<p>${t('Email')}: ${data.email}</p>` : ''}
    </div>
    <h2>${t('Contact')}</h2>
    ${row(t('Mobile'), data.mobile)}
    ${row(t('Date of birth'), data.date_of_birth)}
    ${row(t('Gender'), genderLabel(data.gender, t) || null)}
    ${row(t('Address'), data.address)}
    ${row(t('Bio'), data.bio)}
    ${data.certifications.length ? `<h2>${t('Certifications')}</h2>
    <table><thead><tr><th>${t('Name')}</th><th>${t('Type')}</th><th>${t('Issuer')}</th><th>${t('Issued')}</th><th>${t('Expired')}</th></tr></thead>
    <tbody>${certificationRows}</tbody></table>` : ''}
    ${data.sports.length ? `<h2>${t('Sports')}</h2>
    <table><thead><tr><th>${t('Sport')}</th><th>${t('Level')}</th><th>${t('Primary')}</th><th>${t('From')}</th><th>${t('To')}</th></tr></thead>
    <tbody>${sportRows}</tbody></table>` : ''}
    ${data.assignment_history.length ? `<h2>${t('Assignment History')}</h2>
    <table><thead><tr><th>${t('Role')}</th><th>${t('Team')}</th><th>${t('Session')}</th><th>${t('Current')}</th><th>${t('Assigned')}</th><th>${t('Removed')}</th></tr></thead>
    <tbody>${assignmentRows}</tbody></table>` : ''}
    ${m ? `
    <h2>${t('Personal')}</h2>
    ${row(t("Father's name"), m.father_name)}
    ${row(t('Date of birth'), m.dob)}
    ${row(t('Gender'), genderLabel(m.gender, t) || null)}
    ${row(t('Blood group'), m.blood_group)}
    ${row(t('Caste'), m.caste)}
    ${row(t('Mobile'), m.mobile)}
    ${row(t('Home district'), m.home_district?.name)}
    <h2>${t('Service')}</h2>
    ${row(t('Rank'), m.rank ? t(m.rank) : null)}
    ${row(t('Current unit'), m.current_unit?.name)}
    ${row(t('Joining date'), m.joining_date)}
    ${row(t('Promotion date'), m.promotion_date)}
    ${row(t('Appointment'), m.appointment)}
    ${row(t('Sport'), m.sport?.name)}
    ${row(t('Sport event'), m.sport_event)}
    ${row(t('Player level'), m.player_level ? t(m.player_level) : null)}
    ${row(t('Player category'), m.player_category ? t(m.player_category) : null)}
    ${row(t('Team since'), m.team_since)}
    ${m.status_history.length ? `<h2>${t('Status history')}</h2>
    <table><thead><tr><th>${t('Date')}</th><th>${t('Status')}</th><th>${t('Reason')}</th></tr></thead>
    <tbody>${statusRows}</tbody></table>` : ''}
    ${m.team_history.length ? `<h2>${t('Team history')}</h2>
    <table><thead><tr><th>${t('Team')}</th><th>${t('Session')}</th><th>${t('Role')}</th><th>${t('Joined')}</th><th>${t('Left')}</th></tr></thead>
    <tbody>${teamRows}</tbody></table>` : ''}
    ${m.achievements.length ? `<h2>${t('Achievements')}</h2>
    <table><thead><tr><th>${t('Level')}</th><th>${t('Competition')}</th><th>${t('Event')}</th><th>${t('Medal')}</th><th>${t('Date')}</th></tr></thead>
    <tbody>${achievementRows}</tbody></table>` : ''}
    ` : ''}
    </body></html>`;
}

export function CoachQuickView({ coachId, open, onClose }: { coachId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<CoachPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, CoachPreview>({});

    useEffect(() => {
        if (!open || coachId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(CoachPreviewController.url(coachId), {
            onSuccess: (res) => setData(res as unknown as CoachPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, coachId]);

    const handlePrint = () => {
        if (!data) {
            return;
        }

        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(buildPrintHtml(data, t));
        win.document.close();
        setTimeout(() => {
            win.focus();
            win.print();
        }, 300);
    };

    const exportUrl = coachId !== null ? exportCoachesUrl.url() + '?ids[]=' + coachId : '#';

    return (
        <Sheet
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    onClose();
                }
            }}
        >
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <SheetTitle className="sr-only">{t('Loading…')}</SheetTitle>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">{data.full_name}</SheetTitle>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {data.display_name ? (
                                    <span className="text-xs text-muted-foreground">{data.display_name}</span>
                                ) : null}
                                {data.pno && <span className="font-mono text-xs text-muted-foreground">{data.pno}</span>}
                                {data.designation && <span className="text-xs text-muted-foreground">{data.designation}</span>}
                                {data.member?.rank && <span className="text-xs font-medium">{t(data.member.rank)}</span>}
                                <Badge variant={data.nis_certified ? 'default' : 'secondary'} className="ml-auto">
                                    {data.nis_certified ? t('NIS Certified') : t('Not NIS Certified')}
                                </Badge>
                                {data.coach_status && <Badge variant={STATUS_VARIANT[data.coach_status] ?? 'outline'}>{t(data.coach_status)}</Badge>}
                                {data.member && (
                                    <Badge variant={STATUS_VARIANT[data.member.current_status] ?? 'outline'}>
                                        {t(data.member.current_status)}
                                    </Badge>
                                )}
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                    )}

                    {data && (
                        <div className="py-2">
                            <Section title={t('Profile')}>
                                <InfoRow label={t('Display name')} value={data.display_name} />
                                <InfoRow label={t('Designation')} value={data.designation} />
                                <InfoRow label={t('Email')} value={data.email} />
                                <InfoRow label={t('Gender')} value={genderLabel(data.gender, t) || null} />
                                <InfoRow label={t('Date of birth')} value={data.date_of_birth} />
                                <InfoRow label={t('Coach status')} value={data.coach_status ? t(data.coach_status) : null} />
                                <InfoRow label={t('Address')} value={data.address} />
                                <InfoRow label={t('Bio')} value={data.bio} />
                            </Section>

                            <Section title={t('Contact')}>
                                <InfoRow label={t('Mobile')} value={data.mobile ?? data.member?.mobile} />
                            </Section>

                            {data.certifications.length > 0 && (
                                <Section title={t('Certifications')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Type')}</TableHead>
                                                <TableHead>{t('Issuer')}</TableHead>
                                                <TableHead>{t('Issued')}</TableHead>
                                                <TableHead>{t('Expired')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.certifications.map((certification) => (
                                                <TableRow key={certification.id}>
                                                    <TableCell>{certification.name}</TableCell>
                                                    <TableCell>{certification.certificate_type ?? ''}</TableCell>
                                                    <TableCell>{certification.issuer ?? ''}</TableCell>
                                                    <TableCell>{certification.issued_at ?? ''}</TableCell>
                                                    <TableCell>{certification.expired_at ?? ''}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.sports.length > 0 && (
                                <Section title={t('Sports specialization')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Sport')}</TableHead>
                                                <TableHead>{t('Primary')}</TableHead>
                                                <TableHead>{t('Level')}</TableHead>
                                                <TableHead>{t('From')}</TableHead>
                                                <TableHead>{t('To')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.sports.map((sport) => (
                                                <TableRow key={sport.id}>
                                                    <TableCell>{sport.name}</TableCell>
                                                    <TableCell>{sport.is_primary ? t('Yes') : t('No')}</TableCell>
                                                    <TableCell>{sport.level ?? ''}</TableCell>
                                                    <TableCell>{sport.effective_from ?? ''}</TableCell>
                                                    <TableCell>{sport.effective_to ?? ''}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.assignment_history.length > 0 && (
                                <Section title={t('Assignment history')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Team')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                                <TableHead>{t('Current')}</TableHead>
                                                <TableHead>{t('Assigned')}</TableHead>
                                                <TableHead>{t('Removed')}</TableHead>
                                                <TableHead>{t('Notes')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.assignment_history.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell>{assignment.role}</TableCell>
                                                    <TableCell>{assignment.team_name ?? ''}</TableCell>
                                                    <TableCell>{assignment.session_name ?? ''}</TableCell>
                                                    <TableCell>{assignment.is_current ? t('Yes') : t('No')}</TableCell>
                                                    <TableCell>{assignment.assigned_at ?? ''}</TableCell>
                                                    <TableCell>{assignment.removed_at ?? ''}</TableCell>
                                                    <TableCell>{assignment.notes ?? ''}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.member && (
                                <>
                                    <Section title={t('Personal')}>
                                        <InfoRow label={t("Father's name")} value={data.member.father_name} />
                                        <InfoRow label={t('Date of birth')} value={data.member.dob} />
                                        <InfoRow label={t('Gender')} value={genderLabel(data.member.gender, t) || null} />
                                        <InfoRow label={t('Blood group')} value={data.member.blood_group} />
                                        <InfoRow label={t('Caste')} value={data.member.caste} />
                                        <InfoRow label={t('Home district')} value={data.member.home_district?.name} />
                                    </Section>

                                    <Section title={t('Service')}>
                                        <InfoRow label={t('Current unit')} value={data.member.current_unit?.name} />
                                        <InfoRow label={t('Joining date')} value={data.member.joining_date} />
                                        <InfoRow label={t('Promotion date')} value={data.member.promotion_date} />
                                        <InfoRow label={t('Appointment')} value={data.member.appointment} />
                                        <InfoRow label={t('Sport')} value={data.member.sport?.name} />
                                        <InfoRow label={t('Sport event')} value={data.member.sport_event} />
                                        <InfoRow label={t('Player level')} value={data.member.player_level ? t(data.member.player_level) : null} />
                                        <InfoRow label={t('Player category')} value={data.member.player_category ? t(data.member.player_category) : null} />
                                        <InfoRow label={t('Team since')} value={data.member.team_since} />
                                    </Section>

                                    {data.member.status_history.length > 0 && (
                                        <Section title={t('Status history')}>
                                            <div className="space-y-3">
                                                {data.member.status_history.map((h, i) => (
                                                    <div key={i} className="flex gap-3 text-sm">
                                                        <div className="mt-0.5 flex flex-col items-center">
                                                            <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                                                            {i < data.member!.status_history.length - 1 && (
                                                                <span className="mt-1 w-px flex-1 bg-border" />
                                                            )}
                                                        </div>
                                                        <div className="pb-3">
                                                            <span className="font-mono text-xs text-muted-foreground">{h.effective_on}</span>
                                                            <p className="font-semibold">{t(h.status)}</p>
                                                            {h.reason && <p className="text-muted-foreground">{h.reason}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                    )}

                                    {data.member.team_history.length > 0 && (
                                        <Section title={t('Team history')}>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Team')}</TableHead>
                                                        <TableHead>{t('Session')}</TableHead>
                                                        <TableHead>{t('Role')}</TableHead>
                                                        <TableHead>{t('Joined')}</TableHead>
                                                        <TableHead>{t('Left')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.member.team_history.map((th, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{th.team_name ?? ''}</TableCell>
                                                            <TableCell className="text-xs">{th.session_name ?? ''}</TableCell>
                                                            <TableCell className="text-xs">{t(th.role)}</TableCell>
                                                            <TableCell className="font-mono text-xs">{th.joined_on ?? ''}</TableCell>
                                                            <TableCell className="font-mono text-xs">{th.left_on ?? ''}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Section>
                                    )}

                                    {data.member.achievements.length > 0 && (
                                        <Section title={t('Achievements')}>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Level')}</TableHead>
                                                        <TableHead>{t('Competition')}</TableHead>
                                                        <TableHead>{t('Event')}</TableHead>
                                                        <TableHead>{t('Medal')}</TableHead>
                                                        <TableHead>{t('Date')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.member.achievements.map((a, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="whitespace-nowrap text-xs font-medium">{t(a.level)}</TableCell>
                                                            <TableCell className="text-xs">{a.competition_details}</TableCell>
                                                            <TableCell className="text-xs">{a.event ?? ''}</TableCell>
                                                            <TableCell className={`text-xs font-semibold ${MEDAL_COLOR[a.medal_type ?? ''] ?? ''}`}>
                                                                {a.medal_type ? t(a.medal_type) : ''}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">{a.event_date ?? ''}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Section>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 border-t pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            window.open(exportUrl, '_blank');
                        }}
                    >
                        {t('Export')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                    {coachId !== null && (
                        <Button asChild size="sm" className="ml-auto">
                            <Link href={CoachController.show.url(coachId)}>
                                <ExternalLink className="mr-1.5 h-4 w-4" />
                                {t('Open profile')}
                            </Link>
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
