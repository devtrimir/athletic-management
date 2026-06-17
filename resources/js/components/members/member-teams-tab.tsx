import { Link } from '@inertiajs/react';
import { show as showTeam } from '@/actions/App/Http/Controllers/TeamController';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

export type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type Props = {
    teams: MemberTeamRow[] | undefined;
    locale: string;
};

function parseDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(
    value: string | null | undefined,
    locale: string,
): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}

function roleBadgeVariant(
    role: string | null,
): 'default' | 'secondary' | 'outline' {
    if (role === 'CAPTAIN') {
        return 'default';
    }

    if (role === 'RESERVE') {
        return 'secondary';
    }

    return 'outline';
}

export function MemberTeamsTab({ teams, locale }: Props) {
    const { t } = useTranslation();
    const rows = teams ?? [];

    return (
        <div className="rounded-xl border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Team')}</TableHead>
                        <TableHead>{t('Sport')}</TableHead>
                        <TableHead>{t('Session')}</TableHead>
                        <TableHead>{t('Role')}</TableHead>
                        <TableHead>{t('Joined')}</TableHead>
                        <TableHead>{t('Left')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="text-center text-muted-foreground"
                            >
                                {t('No team memberships.')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    {row.team ? (
                                        <Link
                                            href={showTeam.url(row.team)}
                                            className="hover:underline"
                                        >
                                            {row.team.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </TableCell>
                                <TableCell>{row.sport?.name ?? '—'}</TableCell>
                                <TableCell>
                                    {row.session?.name ?? '—'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={roleBadgeVariant(row.role)}>
                                        {row.role ? t(row.role) : t('Player')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {formatDisplayDate(row.joined_on, locale) ??
                                        '—'}
                                </TableCell>
                                <TableCell>
                                    {formatDisplayDate(row.left_on, locale) ??
                                        '—'}
                                </TableCell>
                                <TableCell>
                                    {row.left_on ? (
                                        <Badge variant="secondary">
                                            {t('Past')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">
                                            {t('Current')}
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
