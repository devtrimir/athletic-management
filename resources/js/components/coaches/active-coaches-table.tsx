import {
    createColumnHelper,
    flexRender,
    useTable,
} from '@tanstack/react-table';
import type { OnChangeFn, Row, RowSelectionState } from '@tanstack/react-table';
import { MapPinned } from 'lucide-react';
import { useMemo } from 'react';
import type {
    Coach,
    SportOption,
    SportTeamGroupRow,
    TeamCoach,
} from '@/components/coaches/coach-listing-types';
import {
    CoachColgroupCol,
    CoachIdentity,
    CoachPnoLink,
    IconText,
    LeadingColgroup,
    SelectionHeaderCheckbox,
    SelectionRowCheckbox,
    STICKY_LEFT,
    coachCellClass,
    coachHeadCellClass,
    coachTableClass,
    stickyBodyCellClass,
    stickyHeadCellClass,
    teamGroupEndClass,
} from '@/components/coaches/coach-table-cells';
import { coachTableFeatures } from '@/components/coaches/coach-table-features';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { coachRoleLabel } from '@/lib/coach';
import { cn } from '@/lib/utils';

type FlatTeamRow = TeamCoach & {
    groupKey: string;
    serialNumber: number;
    sport: string;
    team: string;
};

function buildCoachTeamSportRows(
    coaches: Coach[],
    sports: SportOption[],
    t: (key: string) => string,
): SportTeamGroupRow[] {
    const sportNameById = new Map(
        sports.map((sport) => [sport.id, sport.name]),
    );
    const getRoleOrder = (role: string): number => {
        const normalizedRole = role?.toLowerCase() ?? '';

        if (normalizedRole.includes('head')) {
            return 0;
        }

        if (normalizedRole.includes('assistant')) {
            return 1;
        }

        return 2;
    };

    const grouped = new Map<string, SportTeamGroupRow>();
    const unassigned: SportTeamGroupRow[] = [];

    coaches.forEach((coach) => {
        const assignments = coach.current_assignments ?? [];

        if (assignments.length === 0) {
            unassigned.push({
                sport: t('Unassigned'),
                team: '-',
                coaches: [
                    {
                        id: coach.id,
                        rank:
                            coach.rank_master?.name ??
                            coach.rank_master?.short_name ??
                            null,
                        pno: coach.pno,
                        full_name: coach.full_name,
                        mobile: coach.mobile,
                        posting: [coach.unit?.name, coach.district?.name]
                            .filter(Boolean)
                            .join(' - '),
                        team: '-',
                        role: t('Inactive'),
                        nis_master_name: coach.nis_master?.name ?? null,
                        photo_path: coach.photo_path,
                        member_id: coach.member_id,
                        member: coach.member,
                    },
                ],
            });

            return;
        }

        assignments.forEach((assignment) => {
            const teamId = assignment.team?.id ?? 0;
            const sportId =
                assignment.team?.sport?.id ?? assignment.team?.sport_id ?? 0;
            const key = `${sportId}-${teamId}`;

            const row =
                grouped.get(key) ??
                ({
                    sport:
                        assignment.team?.sport?.name ??
                        (sportId ? sportNameById.get(sportId) : undefined) ??
                        t('Unspecified sport'),
                    team: assignment.team?.name ?? t('Unspecified team'),
                    coaches: [],
                } as SportTeamGroupRow);

            if (
                !row.coaches.some((coachInTeam) => coachInTeam.id === coach.id)
            ) {
                row.coaches.push({
                    id: coach.id,
                    rank:
                        coach.rank_master?.name ??
                        coach.rank_master?.short_name ??
                        null,
                    pno: coach.pno,
                    full_name: coach.full_name,
                    mobile: coach.mobile,
                    posting: [coach.unit?.name, coach.district?.name]
                        .filter(Boolean)
                        .join(' - '),
                    team: assignment.team?.name ?? t('Unspecified team'),
                    role: coachRoleLabel(assignment.role, t) || t('Coach'),
                    nis_master_name: coach.nis_master?.name ?? null,
                    photo_path: coach.photo_path,
                    member_id: coach.member_id,
                    member: coach.member,
                });
            }

            grouped.set(key, row);
        });
    });

    const rows = [...grouped.values(), ...unassigned];

    rows.forEach((row) => {
        row.coaches.sort((left, right) => {
            const leftRole = getRoleOrder(left.role);
            const rightRole = getRoleOrder(right.role);

            if (leftRole !== rightRole) {
                return leftRole - rightRole;
            }

            return (left.rank ?? '-').localeCompare(right.rank ?? '-');
        });
    });

    return rows.sort((a, b) => {
        const sportOrder = a.sport.localeCompare(b.sport);

        if (sportOrder !== 0) {
            return sportOrder;
        }

        return a.team.localeCompare(b.team);
    });
}

function sameGroup({
    row,
    previousRow,
}: {
    row: Row<typeof coachTableFeatures, FlatTeamRow>;
    previousRow: Row<typeof coachTableFeatures, FlatTeamRow>;
}) {
    return row.original.groupKey === previousRow.original.groupKey;
}

const columnHelper = createColumnHelper<
    typeof coachTableFeatures,
    FlatTeamRow
>();

const SPORT_COL_WIDTH = 120;

export function ActiveCoachesTable({
    coaches,
    sports,
    fromIndex,
    hasActiveFilters,
    rowSelection,
    onRowSelectionChange,
    t,
}: {
    coaches: Coach[];
    sports: SportOption[];
    fromIndex: number | null;
    hasActiveFilters: boolean;
    rowSelection: RowSelectionState;
    onRowSelectionChange: OnChangeFn<RowSelectionState>;
    t: (key: string) => string;
}) {
    const flatRows = useMemo(() => {
        const groups = buildCoachTeamSportRows(coaches, sports, t);

        return groups.flatMap((group, groupIndex) =>
            group.coaches.map((coach) => ({
                ...coach,
                groupKey: `${groupIndex}`,
                serialNumber: (fromIndex ?? 1) + groupIndex,
                sport: group.sport,
                team: group.team,
            })),
        );
    }, [coaches, sports, t, fromIndex]);

    const columns = useMemo(
        () =>
            columnHelper.columns([
                columnHelper.display({
                    id: 'select',
                    enableHiding: false,
                    header: ({ table }) => (
                        <SelectionHeaderCheckbox
                            checked={table.getIsAllPageRowsSelected()}
                            indeterminate={
                                !table.getIsAllPageRowsSelected() &&
                                table.getIsSomePageRowsSelected()
                            }
                            onCheckedChange={(checked) =>
                                table.toggleAllPageRowsSelected(checked)
                            }
                            label={t('Select all')}
                        />
                    ),
                    cell: ({ row }) => (
                        <SelectionRowCheckbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(checked) =>
                                row.toggleSelected(checked)
                            }
                            label={t('Select row')}
                        />
                    ),
                }),
                columnHelper.display({
                    id: 'sno',
                    enableHiding: false,
                    enableSorting: false,
                    header: t('S.No.'),
                    spanRows: sameGroup,
                    cell: ({ row }) => row.original.serialNumber,
                }),
                columnHelper.display({
                    id: 'sport',
                    enableHiding: false,
                    header: t('Sport'),
                    spanRows: sameGroup,
                    cell: ({ row }) => row.original.sport,
                }),
                columnHelper.display({
                    id: 'team',
                    enableHiding: false,
                    header: t('Team'),
                    spanRows: sameGroup,
                    cell: ({ row }) => row.original.team,
                }),
                columnHelper.accessor('full_name', {
                    id: 'full_name',
                    enableHiding: false,
                    enableSorting: false,
                    header: t('Coach'),
                    cell: ({ row }) => {
                        const coach = row.original;

                        return (
                            <CoachIdentity
                                id={coach.id}
                                name={coach.full_name}
                                rank={coach.rank}
                                photoPath={coach.photo_path}
                                memberId={coach.member_id}
                                member={coach.member}
                            />
                        );
                    },
                }),
                columnHelper.accessor('pno', {
                    id: 'pno',
                    enableSorting: false,
                    header: t('PNO'),
                    cell: ({ row }) => (
                        <CoachPnoLink
                            id={row.original.id}
                            pno={row.original.pno}
                        />
                    ),
                }),
                columnHelper.accessor('mobile', {
                    id: 'mobile',
                    enableSorting: false,
                    header: t('Mobile'),
                    cell: ({ getValue }) => getValue() ?? '-',
                }),
                columnHelper.accessor('role', {
                    id: 'role',
                    enableSorting: false,
                    header: t('Role'),
                    cell: ({ getValue }) => getValue(),
                }),
                columnHelper.display({
                    id: 'nis',
                    header: t('NIS info'),
                    cell: ({ row }) => row.original.nis_master_name || '-',
                }),
                columnHelper.display({
                    id: 'posting',
                    header: t('Posting'),
                    cell: ({ row }) =>
                        row.original.posting ? (
                            <IconText
                                icon={MapPinned}
                                iconClassName="text-emerald-600 dark:text-emerald-300"
                            >
                                {row.original.posting}
                            </IconText>
                        ) : (
                            '-'
                        ),
                }),
            ]),
        [t],
    );

    const table = useTable({
        features: coachTableFeatures,
        data: flatRows,
        columns,
        getRowId: (row) => String(row.id),
        enableSorting: false,
        state: { rowSelection },
        onRowSelectionChange,
    });

    const stickyLeft: Record<string, number> = {
        select: STICKY_LEFT.select,
        sno: STICKY_LEFT.sno,
        sport: STICKY_LEFT.coach,
        team: STICKY_LEFT.coach + SPORT_COL_WIDTH,
    };

    const rows = table.getRowModel().rows;

    return (
        <div className="h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
            <Table className={coachTableClass}>
                <colgroup>
                    <LeadingColgroup />
                    <col className="w-[120px]" />
                    <col className="w-[140px]" />
                    <CoachColgroupCol />
                    <col className="w-[100px]" />
                    <col className="w-[90px]" />
                    <col className="w-[90px]" />
                    <col className="w-[120px]" />
                    <col />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                            key={headerGroup.id}
                            className="hover:bg-transparent"
                        >
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    style={
                                        stickyLeft[header.column.id] !==
                                        undefined
                                            ? {
                                                  left: stickyLeft[
                                                      header.column.id
                                                  ],
                                              }
                                            : undefined
                                    }
                                    className={cn(
                                        coachHeadCellClass,
                                        header.column.id === 'sno' &&
                                            'text-center',
                                        stickyLeft[header.column.id] !==
                                            undefined && stickyHeadCellClass,
                                    )}
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="py-12 text-center text-muted-foreground"
                            >
                                {hasActiveFilters
                                    ? t('No coaches match your filters.')
                                    : t('No coaches yet.')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row, index) => {
                            const nextRow = rows[index + 1];
                            const isGroupEnd =
                                !nextRow ||
                                nextRow.original.groupKey !==
                                    row.original.groupKey;

                            return (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected()
                                            ? 'selected'
                                            : undefined
                                    }
                                    className="hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        if (cell.getIsCovered()) {
                                            return null;
                                        }

                                        return (
                                            <TableCell
                                                key={cell.id}
                                                rowSpan={cell.getRowSpan()}
                                                style={
                                                    stickyLeft[
                                                        cell.column.id
                                                    ] !== undefined
                                                        ? {
                                                              left: stickyLeft[
                                                                  cell.column.id
                                                              ],
                                                          }
                                                        : undefined
                                                }
                                                className={cn(
                                                    coachCellClass,
                                                    cell.column.id === 'sno' &&
                                                        'text-center font-semibold text-muted-foreground tabular-nums',
                                                    cell.column.id ===
                                                        'sport' &&
                                                        'font-medium',
                                                    isGroupEnd &&
                                                        teamGroupEndClass,
                                                    stickyLeft[
                                                        cell.column.id
                                                    ] !== undefined &&
                                                        stickyBodyCellClass,
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
