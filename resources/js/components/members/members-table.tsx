import { Link, router } from '@inertiajs/react';
import {
    createColumnHelper,
    flexRender,
    rowSelectionFeature,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
    Eye,
    IdCard,
    Info,
    MapPinned,
    RotateCcw,
    ShieldCheck,
    Trash2,
    UserCheck,
} from 'lucide-react';
import { useMemo } from 'react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import {
    IconText,
    SelectionHeaderCheckbox,
    SelectionRowCheckbox,
} from '@/components/data-table/table-primitives';
import { ArchivedMemberActionDialog } from '@/components/members/archived-member-action-dialog';
import { DeleteMemberDialog } from '@/components/members/delete-member-dialog';
import type {
    MasterOption,
    Member,
    PaginatedMembers,
} from '@/components/members/member-listing-types';
import {
    CategoryBadge,
    LeadingColgroup,
    LevelBadge,
    MemberAvatar,
    MemberIdentity,
    SportCell,
    STICKY_LEFT,
    genderLabel,
    memberCellClass,
    memberHeadCellClass,
    memberStickyLeftBodyClass,
    memberStickyLeftHeadClass,
    memberStickyRightBodyClass,
    memberStickyRightHeadClass,
    memberTableClass,
    postingLocation,
} from '@/components/members/member-table-cells';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { normalizePlayerCategory } from '@/lib/player-category';
import { resolveRankLabel } from '@/lib/ranks';
import { cn } from '@/lib/utils';

const membersTableFeatures = tableFeatures({ rowSelectionFeature });

const columnHelper = createColumnHelper<typeof membersTableFeatures, Member>();

export function MembersTable({
    members,
    ranks,
    locale,
    levelLabel,
    hasAnyFilter,
    rowSelection,
    onRowSelectionChange,
    getMemberShowUrl,
    canDeleteMember,
    canRestoreMember,
    onQuickView,
    t,
}: {
    members: PaginatedMembers;
    ranks: MasterOption[];
    locale: string;
    levelLabel: (code: string | null | undefined) => string;
    hasAnyFilter: boolean;
    rowSelection: RowSelectionState;
    onRowSelectionChange: OnChangeFn<RowSelectionState>;
    getMemberShowUrl: (id: number, isArchived?: boolean) => string;
    canDeleteMember: boolean;
    canRestoreMember: boolean;
    onQuickView: (id: number) => void;
    t: (key: string) => string;
}) {
    const columns = useMemo(
        () =>
            columnHelper.columns([
                columnHelper.display({
                    id: 'select',
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
                            label={t('Select all on page')}
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
                    header: t('Sr no'),
                    cell: ({ row }) => (members.from ?? 1) + row.index,
                }),
                columnHelper.display({
                    id: 'photo',
                    header: t('Photo'),
                    cell: ({ row }) => (
                        <MemberAvatar
                            photoPath={row.original.photo_path}
                            name={row.original.full_name}
                        />
                    ),
                }),
                columnHelper.display({
                    id: 'name',
                    header: t('Name'),
                    cell: ({ row }) => (
                        <MemberIdentity
                            name={row.original.full_name}
                            rankLabel={resolveRankLabel(
                                row.original.rank,
                                ranks,
                                locale,
                            )}
                        />
                    ),
                }),
                columnHelper.display({
                    id: 'pno',
                    header: t('PNO'),
                    cell: ({ row }) =>
                        row.original.pno ? (
                            <IconText
                                icon={IdCard}
                                iconClassName="text-sky-600 dark:text-sky-300"
                            >
                                {row.original.pno}
                            </IconText>
                        ) : (
                            '-'
                        ),
                }),
                columnHelper.display({
                    id: 'blood_group',
                    header: t('Blood group'),
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
                    id: 'playable_sports',
                    header: t('Playable sports'),
                    cell: ({ row }) => <SportCell member={row.original} />,
                }),
                columnHelper.display({
                    id: 'category',
                    header: t('Category'),
                    cell: ({ row }) => (
                        <CategoryBadge
                            category={row.original.player_category}
                            normalizedKey={normalizePlayerCategory(
                                row.original.player_category,
                            )}
                        />
                    ),
                }),
                columnHelper.display({
                    id: 'level',
                    header: t('Level'),
                    cell: ({ row }) => (
                        <LevelBadge
                            level={row.original.player_level}
                            label={levelLabel(row.original.player_level)}
                        />
                    ),
                }),
                columnHelper.display({
                    id: 'posting',
                    header: t('Posting'),
                    cell: ({ row }) => {
                        const posting = postingLocation(row.original);

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
                columnHelper.display({
                    id: 'actions',
                    header: t('Actions'),
                    cell: ({ row }) => {
                        const member = row.original;

                        return (
                            <div
                                className="flex items-center justify-end gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {!member.deleted_at && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={t('Quick info')}
                                        onClick={() => onQuickView(member.id)}
                                    >
                                        <Info className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('View')}
                                    asChild
                                >
                                    <Link
                                        href={getMemberShowUrl(
                                            member.id,
                                            Boolean(member.deleted_at),
                                        )}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>

                                {member.deleted_at ? (
                                    <>
                                        {canRestoreMember && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t(
                                                            'Restore member',
                                                        )}
                                                        className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {t(
                                                                'Restore :name?',
                                                            ).replace(
                                                                ':name',
                                                                member.full_name,
                                                            )}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t(
                                                                'This will restore the archived member back to active status. Their historical records (participations, medals, promotions) will be re-linked. This action can be reversed by archiving the member again.',
                                                            )}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            {t('Cancel')}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                                                            onClick={() => {
                                                                router.post(
                                                                    MemberController.restore.url(
                                                                        member.id,
                                                                    ),
                                                                    {},
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                );
                                                            }}
                                                        >
                                                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                                            {t(
                                                                'Yes, Restore Member',
                                                            )}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                        {canDeleteMember && (
                                            <ArchivedMemberActionDialog
                                                member={member}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t(
                                                            'Delete / Restore',
                                                        )}
                                                        className="text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </>
                                ) : (
                                    canDeleteMember && (
                                        <DeleteMemberDialog
                                            member={member}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Delete')}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )
                                )}
                            </div>
                        );
                    },
                }),
            ]),
        [
            t,
            members.from,
            ranks,
            locale,
            levelLabel,
            getMemberShowUrl,
            canDeleteMember,
            canRestoreMember,
            onQuickView,
        ],
    );

    const table = useTable({
        features: membersTableFeatures,
        data: members.data,
        columns,
        getRowId: (row) => String(row.id),
        state: { rowSelection },
        onRowSelectionChange,
    });

    const stickyLeft: Record<string, number> = {
        select: STICKY_LEFT.select,
        sno: STICKY_LEFT.sno,
        photo: STICKY_LEFT.photo,
        name: STICKY_LEFT.name,
    };

    const rows = table.getRowModel().rows;

    return (
        <div className="h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
            <Table className={memberTableClass}>
                <colgroup>
                    <LeadingColgroup />
                    <col className="w-[100px]" />
                    <col className="w-[90px]" />
                    <col className="w-[90px]" />
                    <col className="w-[180px]" />
                    <col className="w-[110px]" />
                    <col className="w-[110px]" />
                    <col />
                    <col className="w-[110px]" />
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
                                        memberHeadCellClass,
                                        header.column.id === 'sno' &&
                                            'text-center',
                                        header.column.id === 'actions' &&
                                            'text-right',
                                        stickyLeft[header.column.id] !==
                                            undefined &&
                                            memberStickyLeftHeadClass,
                                        header.column.id === 'actions' &&
                                            memberStickyRightHeadClass,
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
                                {hasAnyFilter
                                    ? t('No members match your filters.')
                                    : t('No members yet.')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={
                                    row.getIsSelected() ? 'selected' : undefined
                                }
                                className="cursor-pointer hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                                onClick={() =>
                                    router.visit(
                                        getMemberShowUrl(
                                            row.original.id,
                                            Boolean(row.original.deleted_at),
                                        ),
                                    )
                                }
                            >
                                {row.getAllCells().map((cell) => (
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
                                            memberCellClass,
                                            cell.column.id === 'sno' &&
                                                'text-center font-mono text-muted-foreground tabular-nums',
                                            stickyLeft[cell.column.id] !==
                                                undefined &&
                                                memberStickyLeftBodyClass,
                                            cell.column.id === 'actions' &&
                                                memberStickyRightBodyClass,
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
