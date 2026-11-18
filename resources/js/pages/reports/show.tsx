import { Head, router, setLayoutProps } from '@inertiajs/react';
import { Download } from 'lucide-react';
import * as MemberController from '@/actions/App/Http/Controllers/MemberController';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import {
    FilterPill,
    SearchableOptionList,
    TextFilterPill,
} from '@/components/data-table/filter-pill';
import {
    ListingLayout,
    ListingTable,
} from '@/components/data-table/listing-layout';
import {
    listingCellClass,
    listingHeadCellClass,
} from '@/components/data-table/table-primitives';
import { MemberPhotoPreview } from '@/components/members/member-photo-preview';
import { Button } from '@/components/ui/button';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };
type Unit = { id: number; name: string };
type ReportMeta = {
    key: string;
    name?: string;
    name_en?: string;
    name_hi?: string;
};
type Filters = Record<string, string | number | null>;

function renderCellValue(val: unknown): string {
    if (val === null || val === undefined) {
        return '';
    }

    if (Array.isArray(val)) {
        return val
            .map((item) => renderCellValue(item))
            .filter(Boolean)
            .join(', ');
    }

    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;

        // member-role pairs: { member: { full_name, ... }, role, ... }
        if (typeof obj.member === 'object' && obj.member !== null) {
            const m = obj.member as Record<string, unknown>;

            return String(m.full_name ?? m.name ?? m.name ?? '');
        }

        // standard display fields in priority order
        const display =
            obj.name ?? obj.full_name ?? obj.name ?? obj.label ?? obj.code;

        if (display !== undefined) {
            return String(display);
        }

        return JSON.stringify(obj);
    }

    return String(val);
}

type MedalMember = {
    id: number;
    full_name: string;
    pno: string | null;
    photo_path: string | null;
};

function MedalMemberCells({
    index,
    member,
}: {
    index: number;
    member: MedalMember;
}) {
    return (
        <>
            <TableCell className={listingCellClass}>{index + 1}</TableCell>
            <TableCell className={listingCellClass}>
                <div className="flex justify-center">
                    <MemberPhotoPreview
                        photoPath={member.photo_path}
                        name={member.full_name}
                    />
                </div>
            </TableCell>
            <TableCell className={listingCellClass}>
                <a
                    href={MemberController.show.url(member.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                >
                    {member.full_name}
                </a>
            </TableCell>
            <TableCell className={listingCellClass}>
                {member.pno ?? '-'}
            </TableCell>
        </>
    );
}

export default function ReportShow({
    report,
    data,
    filters,
    sessions,
    sports,
    tiers,
    units,
}: {
    report: ReportMeta;
    data: Record<string, unknown>[];
    filters: Filters;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
}) {
    const { t } = useTranslation();
    const reportTitle =
        report.name ?? report.name_en ?? report.name_hi ?? t('Report');
    const recordCount = data.length;
    const isMedalsByMember = report.key === 'medals-by-member';
    const isResignationDismissalReport =
        report.key === 'resignation-dismissal-log';

    setLayoutProps({
        breadcrumbs: [
            { title: t('Reports'), href: ReportController.index().url },
            { title: reportTitle },
        ],
    });

    const current: Record<string, string> = {};

    for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== '' && value !== undefined) {
            current[key] = String(value);
        }
    }

    const allowed = [
        'session_id',
        'sport_id',
        'tier_id',
        'unit_id',
        ...(isResignationDismissalReport ? ['member_name', 'pno'] : []),
    ];

    function visit(values: Record<string, string | undefined>) {
        const params: Record<string, string> = {};

        for (const key of allowed) {
            const value = (values[key] ?? '').trim();

            if (value !== '') {
                params[key] = value;
            }
        }

        router.get(ReportController.show(report.key).url, params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    const setFilter = (key: string, value: string | undefined) =>
        visit({ ...current, [key]: value });
    const clearFilters = () => visit({});

    function appliedExportQuery(): Record<string, string> {
        const query: Record<string, string> = { format: 'xlsx' };

        for (const key of allowed) {
            if (current[key]) {
                query[key] = current[key];
            }
        }

        return query;
    }

    function exportReport() {
        window.location.assign(
            ReportController.exportMethod.url(report.key, {
                query: appliedExportQuery(),
            }),
        );
    }

    const columns =
        data.length > 0
            ? Object.keys(data[0]).filter(
                  (column) =>
                      column !== 'member_code' &&
                      !(isMedalsByMember && column === 'member') &&
                      !(
                          report.key === 'resignation-dismissal-log' &&
                          column === 'id'
                      ),
              )
            : [];
    const hasFilters = allowed.some((key) => current[key]);

    const selects = [
        {
            key: 'session_id',
            label: t('Sessions'),
            all: t('Search sessions…'),
            items: sessions.map((x) => ({
                value: String(x.id),
                label: x.name,
            })),
        },
        {
            key: 'sport_id',
            label: t('Sports'),
            all: t('Search sports…'),
            items: sports.map((x) => ({ value: String(x.id), label: x.name })),
        },
        {
            key: 'tier_id',
            label: t('Tiers'),
            all: t('Search tiers…'),
            items: tiers.map((x) => ({ value: String(x.id), label: x.label })),
        },
        {
            key: 'unit_id',
            label: t('Units'),
            all: t('Search units…'),
            items: units.map((x) => ({ value: String(x.id), label: x.name })),
        },
    ].filter((select) => select.items.length > 0);

    return (
        <>
            <Head title={reportTitle} />
            <ListingLayout
                title={reportTitle}
                description={t(
                    'Review report records and apply filters to narrow the list.',
                )}
                actions={
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={exportReport}
                    >
                        <Download className="mr-1.5 size-4" />
                        {t('Export')}
                    </Button>
                }
                filters={
                    <>
                        {selects.map((select) => {
                            const active = select.items.find(
                                (item) => item.value === current[select.key],
                            );

                            return (
                                <FilterPill
                                    key={select.key}
                                    label={select.label}
                                    activeLabel={active?.label}
                                    onClear={() =>
                                        setFilter(select.key, undefined)
                                    }
                                >
                                    <SearchableOptionList
                                        options={select.items}
                                        value={current[select.key]}
                                        searchPlaceholder={select.all}
                                        onSelect={(value) =>
                                            setFilter(select.key, value)
                                        }
                                    />
                                </FilterPill>
                            );
                        })}
                        {isResignationDismissalReport && (
                            <>
                                <TextFilterPill
                                    label={t('Member name')}
                                    value={current.member_name ?? ''}
                                    placeholder={t('Member name')}
                                    onApply={(value) =>
                                        setFilter('member_name', value)
                                    }
                                />
                                <TextFilterPill
                                    label={t('PNO')}
                                    value={current.pno ?? ''}
                                    placeholder={t('PNO')}
                                    onApply={(value) => setFilter('pno', value)}
                                />
                            </>
                        )}
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clearFilters}
                resultCount={recordCount}
            >
                <ListingTable
                    minWidth={Math.max(600, columns.length * 140)}
                    centered
                >
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                            {isResignationDismissalReport && (
                                <TableHead className={listingHeadCellClass}>
                                    {t('S. No.')}
                                </TableHead>
                            )}
                            {isMedalsByMember && (
                                <>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('S. No.')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Photo')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Member')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('PNO')}
                                    </TableHead>
                                </>
                            )}
                            {columns.map((col) => (
                                <TableHead
                                    key={col}
                                    className={listingHeadCellClass}
                                >
                                    {col}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={Math.max(1, columns.length + 5)}
                                    className="h-24 text-center text-sm text-muted-foreground"
                                >
                                    {t('No data found')}
                                </TableCell>
                            </TableRow>
                        )}
                        {data.map((row, i) => (
                            <TableRow key={i}>
                                {isResignationDismissalReport && (
                                    <TableCell className={listingCellClass}>
                                        {i + 1}
                                    </TableCell>
                                )}
                                {isMedalsByMember && (
                                    <MedalMemberCells
                                        index={i}
                                        member={row.member as MedalMember}
                                    />
                                )}
                                {columns.map((col) => (
                                    <TableCell
                                        key={col}
                                        className={listingCellClass}
                                    >
                                        {isResignationDismissalReport &&
                                        (col === 'pno' ||
                                            col === 'full_name') &&
                                        typeof row.id === 'number' &&
                                        row[col] ? (
                                            <a
                                                href={MemberController.show.url(
                                                    row.id,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {renderCellValue(row[col])}
                                            </a>
                                        ) : (
                                            renderCellValue(row[col])
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </ListingTable>
            </ListingLayout>
        </>
    );
}
