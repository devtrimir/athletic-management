import {
    createColumnHelper,
    flexRender,
    useTable,
} from '@tanstack/react-table';
import type {
    OnChangeFn,
    RowSelectionState,
    SortingState,
} from '@tanstack/react-table';
import { MapPinned, ShieldCheck, UserCheck } from 'lucide-react';
import { useMemo } from 'react';
import type {
    Coach,
    PaginatedCoaches,
} from '@/components/coaches/coach-listing-types';
import {
    CoachColgroupCol,
    CoachIdentity,
    CoachPnoLink,
    CoachSportsCell,
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
} from '@/components/coaches/coach-table-cells';
import { coachTableFeatures } from '@/components/coaches/coach-table-features';
import { SortableHeaderLabel } from '@/components/coaches/coach-table-toolbar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { genderLabel } from '@/lib/coach';
import { cn } from '@/lib/utils';

const columnHelper = createColumnHelper<typeof coachTableFeatures, Coach>();

export function InactiveCoachesTable({
    coaches,
    hasActiveFilters,
    sorting,
    onSortingChange,
    rowSelection,
    onRowSelectionChange,
    t,
}: {
    coaches: PaginatedCoaches;
    hasActiveFilters: boolean;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    rowSelection: RowSelectionState;
    onRowSelectionChange: OnChangeFn<RowSelectionState>;
    t: (key: string) => string;
}) {
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
                    header: t('S.No.'),
                    cell: ({ row }) => (coaches.from ?? 1) + row.index,
                }),
                columnHelper.accessor('full_name', {
                    id: 'full_name',
                    enableHiding: false,
                    header: ({ column }) => (
                        <SortableHeaderLabel
                            label={t('Coach')}
                            column={column}
                        />
                    ),
                    cell: ({ row }) => {
                        const coach = row.original;

                        return (
                            <CoachIdentity
                                id={coach.id}
                                name={coach.full_name}
                                rank={
                                    coach.rank_master?.name ??
                                    coach.rank_master?.short_name ??
                                    null
                                }
                                photoPath={coach.photo_path}
                                memberId={coach.member_id}
                                member={coach.member}
                            />
                        );
                    },
                }),
                columnHelper.accessor('pno', {
                    id: 'pno',
                    header: ({ column }) => (
                        <SortableHeaderLabel label={t('PNO')} column={column} />
                    ),
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
                columnHelper.accessor('email', {
                    id: 'email',
                    enableSorting: false,
                    header: t('Email'),
                    cell: ({ getValue }) => getValue() ?? '-',
                }),
                columnHelper.display({
                    id: 'gender',
                    header: t('Gender'),
                    cell: ({ row }) =>
                        row.original.gender ? (
                            <IconText
                                icon={UserCheck}
                                iconClassName="text-fuchsia-600 dark:text-fuchsia-300"
                            >
                                {genderLabel(row.original.gender, t)}
                            </IconText>
                        ) : (
                            '-'
                        ),
                }),
                columnHelper.display({
                    id: 'blood_group',
                    header: t('Blood'),
                    cell: ({ row }) =>
                        row.original.blood_group ? (
                            <IconText
                                icon={ShieldCheck}
                                iconClassName="text-rose-600 dark:text-rose-300"
                            >
                                {row.original.blood_group}
                            </IconText>
                        ) : (
                            '-'
                        ),
                }),
                columnHelper.display({
                    id: 'sports',
                    header: t('Sports'),
                    cell: ({ row }) => <CoachSportsCell coach={row.original} />,
                }),
                columnHelper.display({
                    id: 'nis',
                    header: t('NIS'),
                    cell: ({ row }) =>
                        row.original.nis_master?.name ??
                        row.original.nis_master?.short_name ??
                        '-',
                }),
                columnHelper.display({
                    id: 'posting',
                    header: t('Posting'),
                    cell: ({ row }) => {
                        const posting = [
                            row.original.unit?.name,
                            row.original.district?.name,
                        ]
                            .filter(Boolean)
                            .join(' - ');

                        return posting ? (
                            <IconText
                                icon={MapPinned}
                                iconClassName="text-emerald-600 dark:text-emerald-300"
                            >
                                {posting}
                            </IconText>
                        ) : (
                            '-'
                        );
                    },
                }),
            ]),
        [t, coaches.from],
    );

    const table = useTable({
        features: coachTableFeatures,
        data: coaches.data,
        columns,
        getRowId: (row) => String(row.id),
        manualSorting: true,
        enableMultiSort: false,
        state: { sorting, rowSelection },
        onSortingChange,
        onRowSelectionChange,
    });

    const stickyLeft: Record<string, number> = {
        select: STICKY_LEFT.select,
        sno: STICKY_LEFT.sno,
        full_name: STICKY_LEFT.coach,
    };

    return (
        <div className="h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
            <Table className={cn(coachTableClass, 'min-w-[1320px]')}>
                <colgroup>
                    <LeadingColgroup />
                    <CoachColgroupCol />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-40" />
                    <col className="w-[90px]" />
                    <col className="w-20" />
                    <col className="w-[140px]" />
                    <col className="w-[110px]" />
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
                    {table.getRowModel().rows.length === 0 ? (
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
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={
                                    row.getIsSelected() ? 'selected' : undefined
                                }
                                className="hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        style={
                                            stickyLeft[cell.column.id] !==
                                            undefined
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
                                            stickyLeft[cell.column.id] !==
                                                undefined &&
                                                stickyBodyCellClass,
                                        )}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
