import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import CoachPreviewController from '@/actions/App/Http/Controllers/Api/V1/CoachPreviewController';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type CertificationItem = {
    id: number;
    name: string;
    certificate_type: string | null;
    issuer: string | null;
    issued_at: string | null;
    expired_at: string | null;
    attachment: {
        preview_url: string;
        download_url: string;
        original_name: string | null;
        mime_type: string | null;
        size_bytes: number | null;
    } | null;
    metadata: Record<string, unknown> | null;
};
type SportItem = {
    id: number;
    name: string;
    is_primary: boolean;
    level: string | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
};
type SpecialAchievementItem = {
    id: number;
    achievement_type: string;
    title: string;
    awarded_on: string | null;
    issuing_authority: string | null;
    place: string | null;
    remarks: string | null;
};
type MemberPlayingAchievementItem = {
    id: number;
    medal_type: string | null;
    position: number | null;
    remarks: string | null;
    session_name: string | null;
    tournament_name: string;
    tier_code: string | null;
    tier_label: string | null;
    date_from: string | null;
    date_to: string | null;
    venue: string | null;
    event_name: string;
    event_kind: 'team' | 'individual';
    achieved_on: string | null;
};
type PlayingAchievementItem = {
    id: number;
    title: string;
    period: string | null;
    level: string | null;
    competition_details: string | null;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    medal_type: string | null;
    event_type: 'team' | 'individual' | null;
    position: number | null;
    achieved_on: string | null;
    remarks: string | null;
};
type AssignmentHistoryItem = {
    id: number;
    role: string;
    team_name: string | null;
    session_name: string | null;
    is_current: boolean;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
};

function genderLabel(
    gender: string | null,
    t: (key: string) => string,
): string {
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

type CoachPreview = {
    id: number;
    full_name: string;
    pno: string | null;
    mobile: string | null;
    display_name: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string | null;
    team_activity_status: 'active' | 'inactive';
    bio: string | null;
    address: string | null;
    photo_path: string | null;
    certifications: CertificationItem[];
    sports: SportItem[];
    special_achievements: SpecialAchievementItem[];
    playing_achievements: (
        | PlayingAchievementItem
        | MemberPlayingAchievementItem
    )[];
    playing_achievements_source: 'member' | 'legacy';
    linked_member: {
        id: number;
        member_code: string;
        full_name: string;
    } | null;
    assignment_history: AssignmentHistoryItem[];
};

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="border-b py-4 last:border-0">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
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
        value
            ? `<div class="row"><span class="label">${label}</span><span class="val">${value}</span></div>`
            : '';

    const certificationRows = data.certifications
        .map(
            (c) =>
                `<tr><td>${c.name}</td><td>${c.certificate_type ?? ''}</td><td>${c.issuer ?? ''}</td><td>${c.issued_at ?? ''}</td><td>${c.expired_at ?? ''}</td></tr>`,
        )
        .join('');

    const sportRows = data.sports
        .map(
            (s) =>
                `<tr><td>${s.name}</td><td>${s.level ?? ''}</td><td>${s.is_primary ? t('Primary') : t('Secondary')}</td><td>${s.effective_from ?? ''}</td><td>${s.effective_to ?? ''}</td></tr>`,
        )
        .join('');

    const specialAchievementRows = data.special_achievements
        .map(
            (a) =>
                `<tr><td>${a.title}</td><td>${a.achievement_type ?? ''}</td><td>${a.awarded_on ?? ''}</td><td>${a.issuing_authority ?? ''}</td><td>${a.place ?? ''}</td></tr>`,
        )
        .join('');

    const playingAchievementRows = (
        data.playing_achievements_source === 'member'
            ? (data.playing_achievements as MemberPlayingAchievementItem[]).map(
                  (a) =>
                      `<tr><td>${a.medal_type ?? ''}</td><td>${[a.tournament_name, a.tier_code].filter(Boolean).join(' · ')}</td><td>${a.event_name}</td><td>${a.event_kind === 'team' ? t('Team') : t('Individual')}</td><td>${a.achieved_on ?? a.date_from ?? ''}</td><td>${a.venue ?? ''}</td><td>${a.position ?? ''}</td></tr>`,
              )
            : (data.playing_achievements as PlayingAchievementItem[]).map(
                  (a) =>
                      `<tr><td>${a.medal_type ?? ''}</td><td>${a.title}</td><td>${a.level ?? ''}</td><td>${a.event_type ? (a.event_type === 'team' ? t('Team') : t('Individual')) : ''}</td><td>${a.competition_details ?? ''}</td><td>${a.event_date ?? ''}</td><td>${a.venue ?? ''}</td><td>${a.position ?? ''}</td></tr>`,
              )
    ).join('');

    const assignmentRows = data.assignment_history
        .map(
            (a) =>
                `<tr><td>${a.role}</td><td>${a.team_name ?? ''}</td><td>${a.session_name ?? ''}</td><td>${a.is_current ? t('Current') : t('Historical')}</td><td>${a.assigned_at ?? ''}</td><td>${a.removed_at ?? ''}</td></tr>`,
        )
        .join('');

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
        <span class="meta">${data.pno ?? ''}</span>
        <p>${t('Team status')}: ${data.team_activity_status === 'active' ? t('Active') : t('Inactive')}</p>
        ${data.coach_status ? `<p>${t('Profile status')}: ${t(data.coach_status)}</p>` : ''}
        ${data.email ? `<p>${t('Email')}: ${data.email}</p>` : ''}
    </div>
    <h2>${t('Contact')}</h2>
    ${row(t('Mobile'), data.mobile)}
    ${row(t('Date of birth'), data.date_of_birth)}
    ${row(t('Gender'), genderLabel(data.gender, t) || null)}
    ${row(t('Address'), data.address)}
    ${row(t('Bio'), data.bio)}
    ${
        data.certifications.length
            ? `<h2>${t('Certifications')}</h2>
    <table><thead><tr><th>${t('Name')}</th><th>${t('Type')}</th><th>${t('Issuer')}</th><th>${t('Issued')}</th><th>${t('Expired')}</th></tr></thead>
    <tbody>${certificationRows}</tbody></table>`
            : ''
    }
    ${
        data.sports.length
            ? `<h2>${t('Sports')}</h2>
    <table><thead><tr><th>${t('Sport')}</th><th>${t('Level')}</th><th>${t('Primary')}</th><th>${t('From')}</th><th>${t('To')}</th></tr></thead>
    <tbody>${sportRows}</tbody></table>`
            : ''
    }
    ${
        data.special_achievements.length
            ? `<h2>${t('Special achievements')}</h2>
    <table><thead><tr><th>${t('Title')}</th><th>${t('Type')}</th><th>${t('Award date')}</th><th>${t('Issuing authority')}</th><th>${t('Place')}</th></tr></thead>
    <tbody>${specialAchievementRows}</tbody></table>`
            : ''
    }
    ${
        data.playing_achievements.length
            ? `<h2>${t('Playing career achievements')}${
                  data.playing_achievements_source === 'member'
                      ? ` (${t('Derived from member record')})`
                      : ` (${t('Legacy')})`
              }</h2>
    <table><thead><tr>${
        data.playing_achievements_source === 'member'
            ? `<th>${t('Medal')}</th><th>${t('Tournament')}</th><th>${t('Event')}</th><th>${t('Kind')}</th><th>${t('Date')}</th><th>${t('Venue')}</th><th>${t('Position')}</th>`
            : `<th>${t('Medal')}</th><th>${t('Title')}</th><th>${t('Level')}</th><th>${t('Kind')}</th><th>${t('Competition')}</th><th>${t('Event date')}</th><th>${t('Venue')}</th><th>${t('Position')}</th>`
    }</tr></thead>
    <tbody>${playingAchievementRows}</tbody></table>`
            : ''
    }
    ${
        data.assignment_history.length
            ? `<h2>${t('Assignment History')}</h2>
    <table><thead><tr><th>${t('Role')}</th><th>${t('Team')}</th><th>${t('Session')}</th><th>${t('Current')}</th><th>${t('Assigned')}</th><th>${t('Removed')}</th></tr></thead>
    <tbody>${assignmentRows}</tbody></table>`
            : ''
    }
    </body></html>`;
}

export function CoachQuickView({
    coachId,
    open,
    onClose,
}: {
    coachId: number | null;
    open: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [data, setData] = useState<CoachPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, CoachPreview>(
        {},
    );

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

    const exportUrl =
        coachId !== null ? exportCoachesUrl.url() + '?ids[]=' + coachId : '#';

    return (
        <Sheet
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    onClose();
                }
            }}
        >
            <SheetContent
                side="right"
                className="flex w-full flex-col sm:max-w-2xl"
            >
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <SheetTitle className="sr-only">
                                {t('Loading…')}
                            </SheetTitle>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">
                                {data.full_name}
                            </SheetTitle>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {data.display_name ? (
                                    <span className="text-xs text-muted-foreground">
                                        {data.display_name}
                                    </span>
                                ) : null}
                                {data.pno && (
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {data.pno}
                                    </span>
                                )}
                                <Badge
                                    variant={
                                        data.team_activity_status === 'active'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className="ml-auto"
                                >
                                    {data.team_activity_status === 'active'
                                        ? t('Active')
                                        : t('Inactive')}
                                </Badge>
                                {data.coach_status && (
                                    <Badge variant="outline">
                                        {t('Profile')}: {t(data.coach_status)}
                                    </Badge>
                                )}
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">
                            {t('Could not load details.')}
                        </p>
                    )}

                    {data && (
                        <div className="py-2">
                            <Section title={t('Profile')}>
                                <InfoRow
                                    label={t('Display name')}
                                    value={data.display_name}
                                />
                                <InfoRow
                                    label={t('Email')}
                                    value={data.email}
                                />
                                <InfoRow
                                    label={t('Gender')}
                                    value={genderLabel(data.gender, t) || null}
                                />
                                <InfoRow
                                    label={t('Date of birth')}
                                    value={data.date_of_birth}
                                />
                                <InfoRow
                                    label={t('Team status')}
                                    value={
                                        data.team_activity_status === 'active'
                                            ? t('Active')
                                            : t('Inactive')
                                    }
                                />
                                <InfoRow
                                    label={t('Profile status')}
                                    value={
                                        data.coach_status
                                            ? t(data.coach_status)
                                            : null
                                    }
                                />
                                <InfoRow
                                    label={t('Address')}
                                    value={data.address}
                                />
                                <InfoRow label={t('Bio')} value={data.bio} />
                            </Section>

                            <Section title={t('Contact')}>
                                <InfoRow
                                    label={t('Mobile')}
                                    value={data.mobile}
                                />
                            </Section>

                            {data.certifications.length > 0 && (
                                <Section title={t('Certifications')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Type')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Issuer')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Issued')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Expired')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.certifications.map(
                                                (certification) => (
                                                    <TableRow
                                                        key={certification.id}
                                                    >
                                                        <TableCell>
                                                            {certification.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.certificate_type ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.issuer ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.issued_at ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {certification.expired_at ??
                                                                ''}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.sports.length > 0 && (
                                <Section title={t('Sports specialization')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Sport')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Primary')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Level')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('From')}
                                                </TableHead>
                                                <TableHead>{t('To')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.sports.map((sport) => (
                                                <TableRow key={sport.id}>
                                                    <TableCell>
                                                        {sport.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sport.is_primary
                                                            ? t('Yes')
                                                            : t('No')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sport.level ?? ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sport.effective_from ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sport.effective_to ??
                                                            ''}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.special_achievements.length > 0 && (
                                <Section title={t('Special achievements')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Title')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Type')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Award date')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Issuing authority')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Place')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.special_achievements.map(
                                                (achievement) => (
                                                    <TableRow
                                                        key={achievement.id}
                                                    >
                                                        <TableCell>
                                                            {achievement.title}
                                                        </TableCell>
                                                        <TableCell>
                                                            {achievement.achievement_type ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {achievement.awarded_on ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {achievement.issuing_authority ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {achievement.place ??
                                                                ''}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.playing_achievements.length > 0 && (
                                <Section
                                    title={`${t('Playing career achievements')}${
                                        data.playing_achievements_source ===
                                        'member'
                                            ? ` (${t('Derived from member record')})`
                                            : ` (${t('Legacy')})`
                                    }`}
                                >
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {data.playing_achievements_source ===
                                                'member' ? (
                                                    <>
                                                        <TableHead>
                                                            {t('Medal')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Tournament')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Event')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Kind')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Date')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Venue')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Position')}
                                                        </TableHead>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableHead>
                                                            {t('Medal')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Title')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Level')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Kind')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Competition')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Event date')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Venue')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Position')}
                                                        </TableHead>
                                                    </>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.playing_achievements.map(
                                                (achievement) =>
                                                    data.playing_achievements_source ===
                                                    'member' ? (
                                                        <TableRow
                                                            key={achievement.id}
                                                        >
                                                            {(() => {
                                                                const row =
                                                                    achievement as MemberPlayingAchievementItem;

                                                                return (
                                                                    <>
                                                                        <TableCell>
                                                                            {row.medal_type ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {[
                                                                                row.tournament_name,
                                                                                row.tier_code,
                                                                            ]
                                                                                .filter(
                                                                                    Boolean,
                                                                                )
                                                                                .join(
                                                                                    ' · ',
                                                                                )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                row.event_name
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.event_kind ===
                                                                            'team'
                                                                                ? t(
                                                                                      'Team',
                                                                                  )
                                                                                : t(
                                                                                      'Individual',
                                                                                  )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.achieved_on ??
                                                                                row.date_from ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.venue ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.position ??
                                                                                ''}
                                                                        </TableCell>
                                                                    </>
                                                                );
                                                            })()}
                                                        </TableRow>
                                                    ) : (
                                                        <TableRow
                                                            key={achievement.id}
                                                        >
                                                            {(() => {
                                                                const row =
                                                                    achievement as PlayingAchievementItem;

                                                                return (
                                                                    <>
                                                                        <TableCell>
                                                                            {row.medal_type ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                row.title
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.level ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.event_type
                                                                                ? row.event_type ===
                                                                                  'team'
                                                                                    ? t(
                                                                                          'Team',
                                                                                      )
                                                                                    : t(
                                                                                          'Individual',
                                                                                      )
                                                                                : ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.competition_details ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.event_date ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.venue ??
                                                                                ''}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {row.position ??
                                                                                ''}
                                                                        </TableCell>
                                                                    </>
                                                                );
                                                            })()}
                                                        </TableRow>
                                                    ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.assignment_history.length > 0 && (
                                <Section title={t('Assignment history')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Role')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Team')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Current')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Assigned')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Removed')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Notes')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.assignment_history.map(
                                                (assignment) => (
                                                    <TableRow
                                                        key={assignment.id}
                                                    >
                                                        <TableCell>
                                                            {assignment.role}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.team_name ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.session_name ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.is_current
                                                                ? t('Yes')
                                                                : t('No')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.assigned_at ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.removed_at ??
                                                                ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {assignment.notes ??
                                                                ''}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </Section>
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        disabled={!data}
                    >
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
