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
import { formatDate } from '@/lib/dates';

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
};


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

export function MemberTeamsTab({ teams }: Props) {
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
                                    {formatDate(row.joined_on, '—')}
                                </TableCell>
                                <TableCell>
                                    {formatDate(row.left_on, '—')}
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
